import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { appendEvent } from "../../../src/engine/events/append.js";
import type { AppendEventOptions } from "../../../src/engine/events/append.js";
import { AnyEventEnvelopeSchema } from "../../../src/schemas/envelope.js";
import type { AnyEventEnvelope } from "../../../src/schemas/envelope.js";

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

function readLines(filePath: string): string[] {
	const content = fs.readFileSync(filePath, "utf-8");
	return content.split("\n").filter((line) => line.trim() !== "");
}

function parseEvents(filePath: string): AnyEventEnvelope[] {
	return readLines(filePath).map((line) => AnyEventEnvelopeSchema.parse(JSON.parse(line)));
}

describe("appendEvent", () => {
	let tmpDir: string;
	let eventsPath: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "append-test-"));
		eventsPath = path.join(tmpDir, "scope", "events.jsonl");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("first event has null prevId", async () => {
		const { event } = await appendEvent(makeOpts(eventsPath));
		expect(event.prevId).toBeNull();
	});

	it("second event chains prevId to first event id", async () => {
		const { event: first } = await appendEvent(makeOpts(eventsPath));
		const { event: second } = await appendEvent(makeOpts(eventsPath));
		expect(second.prevId).toBe(first.id);
	});

	it("JSONL format - each line is valid JSON matching schema", async () => {
		await appendEvent(makeOpts(eventsPath));
		await appendEvent(makeOpts(eventsPath));
		await appendEvent(makeOpts(eventsPath));

		const lines = readLines(eventsPath);
		expect(lines).toHaveLength(3);

		for (const line of lines) {
			const parsed = JSON.parse(line);
			expect(() => AnyEventEnvelopeSchema.parse(parsed)).not.toThrow();
		}
	});

	it("creates file and parent directories if they do not exist", async () => {
		const deepPath = path.join(tmpDir, "a", "b", "c", "events.jsonl");
		await appendEvent(makeOpts(deepPath));
		expect(fs.existsSync(deepPath)).toBe(true);
	});

	it("populates all envelope fields correctly", async () => {
		const { event } = await appendEvent(
			makeOpts(eventsPath, {
				scope: "project",
				scopeRef: null,
				actor: { kind: "skill", id: "gp:create-epic" },
				branch: "feat/test",
				commitHint: "abc123",
				domain: "spine",
				type: "architecture-committed",
				payload: { version: 1 },
			}),
		);

		// UUID v4 format
		expect(() => z.string().uuid().parse(event.id)).not.toThrow();
		// ISO-8601 with ms precision
		expect(() => z.string().datetime({ precision: 3 }).parse(event.ts)).not.toThrow();
		expect(event.scope).toBe("project");
		expect(event.scopeRef).toBeNull();
		expect(event.actor).toEqual({ kind: "skill", id: "gp:create-epic" });
		expect(event.branch).toBe("feat/test");
		expect(event.commitHint).toBe("abc123");
		expect(event.domain).toBe("spine");
		expect(event.type).toBe("architecture-committed");
		expect(event.payload).toEqual({ version: 1 });
		expect(event.schemaVersion).toBe(1);
		expect(event.prevId).toBeNull();
	});

	it("schemaVersion defaults to 1", async () => {
		const { event } = await appendEvent(makeOpts(eventsPath));
		expect(event.schemaVersion).toBe(1);
	});

	it("schemaVersion can be overridden", async () => {
		const { event } = await appendEvent(makeOpts(eventsPath, { schemaVersion: 2 }));
		expect(event.schemaVersion).toBe(2);
	});

	it("concurrent safety - 10 parallel appends produce valid chain", async () => {
		// Run 10 appends concurrently
		const results = await Promise.all(
			Array.from({ length: 10 }, (_, i) =>
				appendEvent(makeOpts(eventsPath, { type: `event-${i}` })),
			),
		);

		expect(results).toHaveLength(10);

		const events = parseEvents(eventsPath);
		expect(events).toHaveLength(10);

		// Verify prevId chain: first event has null prevId,
		// each subsequent event's prevId matches the previous event's id
		for (let i = 0; i < events.length; i++) {
			const event = events[i];
			if (event === undefined) {
				throw new Error(`Missing event at index ${i}`);
			}
			if (i === 0) {
				expect(event.prevId).toBeNull();
			} else {
				const prev = events[i - 1];
				if (prev === undefined) {
					throw new Error(`Missing prev event at index ${i - 1}`);
				}
				expect(event.prevId).toBe(prev.id);
			}
		}
	});

	it("partial line recovery - skips corrupt line for prevId", async () => {
		// Append a valid event first
		const { event: first } = await appendEvent(makeOpts(eventsPath));

		// Manually write a corrupt line
		fs.appendFileSync(eventsPath, "{corrupt-not-json\n");

		// Append another event — should chain to the last valid event
		const { event: third } = await appendEvent(makeOpts(eventsPath));
		expect(third.prevId).toBe(first.id);
	});

	it("schema validation rejects invalid domain", async () => {
		await expect(
			appendEvent(
				makeOpts(eventsPath, {
					// @ts-expect-error - intentionally invalid domain for test
					domain: "invalid-domain",
				}),
			),
		).rejects.toThrow();
	});

	it("beforeAppend hook is called before writing", async () => {
		const hookCalls: AnyEventEnvelope[] = [];
		await appendEvent(
			makeOpts(eventsPath, {
				beforeAppend: (envelope) => {
					hookCalls.push(envelope);
				},
			}),
		);

		expect(hookCalls).toHaveLength(1);
		const hookEnvelope = hookCalls[0];
		if (hookEnvelope === undefined) {
			throw new Error("Expected hook to be called");
		}
		expect(hookEnvelope.type).toBe("epic-created");
	});

	it("beforeAppend hook can abort the append", async () => {
		await expect(
			appendEvent(
				makeOpts(eventsPath, {
					beforeAppend: () => {
						throw new Error("invariant violation");
					},
				}),
			),
		).rejects.toThrow("invariant violation");

		// File should not exist (no event written)
		expect(fs.existsSync(eventsPath)).toBe(false);
	});
});
