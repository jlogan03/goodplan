import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendEvent } from "../../../src/engine/events/append.js";
import type { AppendEventOptions } from "../../../src/engine/events/append.js";
import { replayEvents } from "../../../src/engine/events/replay.js";
import type { ReplayFilter } from "../../../src/engine/events/replay.js";
import type { AnyEventEnvelope, EventDomain } from "../../../src/schemas/envelope.js";

function makeOpts(eventsPath: string, overrides?: Partial<AppendEventOptions>): AppendEventOptions {
	return {
		eventsPath,
		scope: "epic",
		scopeRef: "test-epic",
		actor: { kind: "cli", id: "test" },
		branch: "main",
		commitHint: null,
		domain: "entity-lifecycle",
		type: "epic-created",
		payload: { name: "test" },
		...overrides,
	};
}

describe("replayEvents", () => {
	let tmpDir: string;
	let eventsPath: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "replay-test-"));
		eventsPath = path.join(tmpDir, "scope", "events.jsonl");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("round-trip: append then replay all events", async () => {
		const appended: AnyEventEnvelope[] = [];
		for (let i = 0; i < 5; i++) {
			const { event } = await appendEvent(
				makeOpts(eventsPath, {
					domain: i % 2 === 0 ? "entity-lifecycle" : "spine",
					type: `event-${i}`,
				}),
			);
			appended.push(event);
		}

		const result = await replayEvents({ eventsPath });

		expect(result.events).toHaveLength(5);
		expect(result.skippedLines).toBe(0);
		expect(result.afterIdFound).toBeUndefined();

		// Verify order matches append order
		for (let i = 0; i < result.events.length; i++) {
			const event = result.events[i];
			const original = appended[i];
			if (event === undefined || original === undefined) {
				throw new Error(`Missing event at index ${i}`);
			}
			expect(event.id).toBe(original.id);
		}
	});

	it("domain filter — single domain", async () => {
		await appendEvent(makeOpts(eventsPath, { domain: "entity-lifecycle", type: "a" }));
		await appendEvent(makeOpts(eventsPath, { domain: "spine", type: "b" }));
		await appendEvent(makeOpts(eventsPath, { domain: "entity-lifecycle", type: "c" }));
		await appendEvent(makeOpts(eventsPath, { domain: "refinement", type: "d" }));

		const result = await replayEvents({
			eventsPath,
			filter: { domain: "entity-lifecycle" },
		});

		expect(result.events).toHaveLength(2);
		for (const event of result.events) {
			expect(event.domain).toBe("entity-lifecycle");
		}
	});

	it("domain filter — array of domains", async () => {
		await appendEvent(makeOpts(eventsPath, { domain: "entity-lifecycle", type: "a" }));
		await appendEvent(makeOpts(eventsPath, { domain: "spine", type: "b" }));
		await appendEvent(makeOpts(eventsPath, { domain: "refinement", type: "c" }));

		const result = await replayEvents({
			eventsPath,
			filter: { domain: ["entity-lifecycle", "spine"] },
		});

		expect(result.events).toHaveLength(2);
	});

	it("type filter — single type", async () => {
		await appendEvent(makeOpts(eventsPath, { type: "epic-created" }));
		await appendEvent(makeOpts(eventsPath, { type: "epic-completed" }));
		await appendEvent(makeOpts(eventsPath, { type: "epic-created" }));

		const result = await replayEvents({
			eventsPath,
			filter: { type: "epic-created" },
		});

		expect(result.events).toHaveLength(2);
		for (const event of result.events) {
			expect(event.type).toBe("epic-created");
		}
	});

	it("type filter — array of types", async () => {
		await appendEvent(makeOpts(eventsPath, { type: "epic-created" }));
		await appendEvent(makeOpts(eventsPath, { type: "epic-completed" }));
		await appendEvent(makeOpts(eventsPath, { type: "slice-landed" }));

		const result = await replayEvents({
			eventsPath,
			filter: { type: ["epic-created", "epic-completed"] },
		});

		expect(result.events).toHaveLength(2);
	});

	it("since filter — only events at or after timestamp", async () => {
		// Append 5 events with controlled timestamps
		const events: AnyEventEnvelope[] = [];
		for (let i = 0; i < 5; i++) {
			const { event } = await appendEvent(makeOpts(eventsPath, { type: `event-${i}` }));
			events.push(event);
		}

		const thirdEvent = events[2];
		if (thirdEvent === undefined) {
			throw new Error("Expected third event");
		}

		const result = await replayEvents({
			eventsPath,
			filter: { since: thirdEvent.ts },
		});

		// Should include event 3 (at timestamp) and all after it
		// Events are appended sequentially, so timestamps are ascending
		expect(result.events.length).toBeGreaterThanOrEqual(1);
		for (const event of result.events) {
			expect(event.ts >= thirdEvent.ts).toBe(true);
		}
	});

	it("timeRange filter — only events within range", async () => {
		const events: AnyEventEnvelope[] = [];
		for (let i = 0; i < 5; i++) {
			const { event } = await appendEvent(makeOpts(eventsPath, { type: `event-${i}` }));
			events.push(event);
		}

		const secondEvent = events[1];
		const fourthEvent = events[3];
		if (secondEvent === undefined || fourthEvent === undefined) {
			throw new Error("Expected events at indices 1 and 3");
		}

		const result = await replayEvents({
			eventsPath,
			filter: {
				timeRange: { start: secondEvent.ts, end: fourthEvent.ts },
			},
		});

		for (const event of result.events) {
			expect(event.ts >= secondEvent.ts).toBe(true);
			expect(event.ts <= fourthEvent.ts).toBe(true);
		}
		// At minimum, events 2 and 4 should be in range
		expect(result.events.length).toBeGreaterThanOrEqual(2);
	});

	it("afterId filter — only events after specified event", async () => {
		const events: AnyEventEnvelope[] = [];
		for (let i = 0; i < 5; i++) {
			const { event } = await appendEvent(makeOpts(eventsPath, { type: `event-${i}` }));
			events.push(event);
		}

		const thirdEvent = events[2];
		if (thirdEvent === undefined) {
			throw new Error("Expected third event");
		}

		const result = await replayEvents({
			eventsPath,
			filter: { afterId: thirdEvent.id },
		});

		expect(result.afterIdFound).toBe(true);
		expect(result.events).toHaveLength(2);

		const fourthEvent = events[3];
		const fifthEvent = events[4];
		if (fourthEvent === undefined || fifthEvent === undefined) {
			throw new Error("Expected events at indices 3 and 4");
		}
		expect(result.events[0]?.id).toBe(fourthEvent.id);
		expect(result.events[1]?.id).toBe(fifthEvent.id);
	});

	it("afterId filter — ID not found returns afterIdFound=false", async () => {
		await appendEvent(makeOpts(eventsPath));
		await appendEvent(makeOpts(eventsPath));

		const result = await replayEvents({
			eventsPath,
			filter: { afterId: "00000000-0000-4000-8000-000000000000" },
		});

		expect(result.afterIdFound).toBe(false);
		expect(result.events).toHaveLength(0);
	});

	it("combined filters — domain + since (AND behavior)", async () => {
		const events: AnyEventEnvelope[] = [];
		for (let i = 0; i < 4; i++) {
			const domain: EventDomain = i % 2 === 0 ? "entity-lifecycle" : "spine";
			const { event } = await appendEvent(makeOpts(eventsPath, { domain, type: `ev-${i}` }));
			events.push(event);
		}

		const secondEvent = events[1];
		if (secondEvent === undefined) {
			throw new Error("Expected second event");
		}

		const result = await replayEvents({
			eventsPath,
			filter: {
				domain: "entity-lifecycle",
				since: secondEvent.ts,
			},
		});

		// Only entity-lifecycle events at or after the second event's timestamp
		for (const event of result.events) {
			expect(event.domain).toBe("entity-lifecycle");
			expect(event.ts >= secondEvent.ts).toBe(true);
		}
	});

	it("corrupt line handling — skips corrupt lines and counts them", async () => {
		await appendEvent(makeOpts(eventsPath, { type: "valid-1" }));

		// Write a corrupt line directly
		fs.appendFileSync(eventsPath, "{not-valid-json\n");

		await appendEvent(makeOpts(eventsPath, { type: "valid-2" }));

		const result = await replayEvents({ eventsPath, skipCorrupt: true });

		expect(result.events).toHaveLength(2);
		expect(result.skippedLines).toBe(1);
	});

	it("non-existent file — returns empty result without throwing", async () => {
		const noFile = path.join(tmpDir, "nonexistent", "events.jsonl");

		const result = await replayEvents({ eventsPath: noFile });

		expect(result.events).toHaveLength(0);
		expect(result.skippedLines).toBe(0);
		expect(result.afterIdFound).toBeUndefined();
	});

	it("non-existent file with afterId — returns afterIdFound=false", async () => {
		const noFile = path.join(tmpDir, "nonexistent", "events.jsonl");

		const result = await replayEvents({
			eventsPath: noFile,
			filter: { afterId: "00000000-0000-4000-8000-000000000000" },
		});

		expect(result.afterIdFound).toBe(false);
		expect(result.events).toHaveLength(0);
	});

	it("empty file — returns empty result", async () => {
		fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
		fs.writeFileSync(eventsPath, "");

		const result = await replayEvents({ eventsPath });

		expect(result.events).toHaveLength(0);
		expect(result.skippedLines).toBe(0);
	});

	it("skippedLines count — trailing newline does NOT increment skippedLines", async () => {
		await appendEvent(makeOpts(eventsPath, { type: "valid-1" }));
		await appendEvent(makeOpts(eventsPath, { type: "valid-2" }));

		// File should end with \n (each appendEvent adds \n).
		// Verify that the trailing newline does not produce a skippedLines count.
		const result = await replayEvents({ eventsPath });

		expect(result.events).toHaveLength(2);
		expect(result.skippedLines).toBe(0);
	});

	it("conditional spread pattern for ReplayFilter construction", async () => {
		// Verify exactOptionalPropertyTypes compliance:
		// constructing filter with conditional spread (not passing undefined)
		await appendEvent(makeOpts(eventsPath, { domain: "spine", type: "arch" }));
		await appendEvent(makeOpts(eventsPath, { domain: "entity-lifecycle", type: "epic" }));

		const domain: EventDomain | undefined = "spine";
		const since: string | undefined = undefined;

		const filter: ReplayFilter = {
			...(domain !== undefined ? { domain } : {}),
			...(since !== undefined ? { since } : {}),
		};

		const result = await replayEvents({ eventsPath, filter });

		expect(result.events).toHaveLength(1);
		expect(result.events[0]?.domain).toBe("spine");
	});
});
