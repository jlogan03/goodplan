import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendEvent } from "../../../src/engine/events/append.js";
import type { AppendEventOptions } from "../../../src/engine/events/append.js";
import { createCoreRegistry } from "../../../src/engine/invariants/core-rules.js";
import { createBeforeAppendHook } from "../../../src/engine/invariants/create-before-append-hook.js";
import { createReplayGetContext } from "../../../src/engine/invariants/create-replay-get-context.js";
import { InvariantError } from "../../../src/engine/invariants/types.js";
import { AnyEventEnvelopeSchema } from "../../../src/schemas/envelope.js";
import type { AnyEventEnvelope } from "../../../src/schemas/envelope.js";

/**
 * Node.js-compatible replayEvents for tests (Bun.file() not available in vitest).
 * Matches the interface expected by createReplayGetContext.
 */
async function replayEventsNode(opts: {
	eventsPath: string;
}): Promise<{ events: AnyEventEnvelope[] }> {
	if (!fs.existsSync(opts.eventsPath)) {
		return { events: [] };
	}
	const content = fs.readFileSync(opts.eventsPath, "utf-8");
	const lines = content.split("\n").filter((line) => line !== "");
	const events: AnyEventEnvelope[] = [];
	for (const line of lines) {
		try {
			const parsed = JSON.parse(line);
			const result = AnyEventEnvelopeSchema.safeParse(parsed);
			if (result.success) {
				events.push(result.data);
			}
		} catch {
			// skip corrupt lines
		}
	}
	return { events };
}

describe("createBeforeAppendHook integration", () => {
	let tmpDir: string;
	let eventsPath: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hook-integration-"));
		eventsPath = path.join(tmpDir, "events.jsonl");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function makeOpts(overrides: Partial<AppendEventOptions> & { type: string }): AppendEventOptions {
		const registry = createCoreRegistry();
		const getContext = createReplayGetContext(replayEventsNode);
		const hook = createBeforeAppendHook({ eventsPath, registry, getContext });

		return {
			eventsPath,
			scope: "project",
			scopeRef: null,
			actor: { kind: "cli", id: "test" },
			branch: "main",
			commitHint: null,
			domain: "entity-lifecycle",
			payload: {},
			beforeAppend: hook,
			...overrides,
		};
	}

	it("happy path: project-initialized then epic-created both succeed", async () => {
		await appendEvent(makeOpts({ type: "project-initialized" }));
		await appendEvent(
			makeOpts({
				type: "epic-created",
				payload: { directory: "epics/my-epic" },
			}),
		);

		const { events } = await replayEventsNode({ eventsPath });
		expect(events).toHaveLength(2);
	});

	it("violation: missing project-initialized rejects epic-created", async () => {
		try {
			await appendEvent(
				makeOpts({
					type: "epic-created",
					payload: { directory: "epics/my-epic" },
				}),
			);
			expect.unreachable("Should have thrown InvariantError");
		} catch (err) {
			expect(err).toBeInstanceOf(InvariantError);
			const invariantErr = err as InstanceType<typeof InvariantError>;
			const ruleIds = invariantErr.violations.map((v) => v.ruleId);
			expect(ruleIds).toContain("project.exists");
		}

		// File should not exist (no event written)
		expect(fs.existsSync(eventsPath)).toBe(false);
	});

	it("violation: duplicate active epic on same branch", async () => {
		await appendEvent(makeOpts({ type: "project-initialized" }));
		await appendEvent(
			makeOpts({
				type: "epic-created",
				payload: { directory: "epics/first" },
			}),
		);

		try {
			await appendEvent(
				makeOpts({
					type: "epic-created",
					payload: { directory: "epics/second" },
				}),
			);
			expect.unreachable("Should have thrown InvariantError");
		} catch (err) {
			expect(err).toBeInstanceOf(InvariantError);
			const invariantErr = err as InstanceType<typeof InvariantError>;
			const ruleIds = invariantErr.violations.map((v) => v.ruleId);
			expect(ruleIds).toContain("epic.single-active-per-branch");
		}

		// Only 2 events should be in the log
		const { events } = await replayEventsNode({ eventsPath });
		expect(events).toHaveLength(2);
	});

	it("multiple violations reported simultaneously", async () => {
		// Attempt epic-created without project-initialized AND on a branch
		// that already has an epic (but project-initialized is also missing).
		// Since project.exists will fire, we just need to confirm multiple violations work.
		// Let's create a scenario: no project-initialized, try slice-set-committed
		// which needs project.exists AND architecture-target AND pressure-test
		try {
			await appendEvent(
				makeOpts({
					type: "slice-set-committed",
				}),
			);
			expect.unreachable("Should have thrown InvariantError");
		} catch (err) {
			expect(err).toBeInstanceOf(InvariantError);
			const invariantErr = err as InstanceType<typeof InvariantError>;
			// Should have multiple violations
			expect(invariantErr.violations.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("prevId chain integrity violation", async () => {
		await appendEvent(makeOpts({ type: "project-initialized" }));

		// Now try to append with a manual beforeAppend that doesn't check invariants,
		// then use the invariant hook on a subsequent event with a wrong prevId.
		// We can test this by using a custom getContext that returns events with
		// a different last event id than what the appended envelope will have.
		const registry = createCoreRegistry();

		// Create a custom hook that injects a check context with a fake last event
		const hook = createBeforeAppendHook({
			eventsPath,
			registry,
			getContext: async () => {
				// Return a context with a fake event that has a different ID
				// than what prevId will be set to
				const { events } = await replayEventsNode({ eventsPath });
				// Add a fake event to make the prevId chain check fail
				const baseEvent = events[0];
				if (baseEvent === undefined) {
					throw new Error("Expected at least one event");
				}
				const fakeEvent = {
					...baseEvent,
					id: "00000000-0000-0000-0000-000000000099",
				};
				const { buildCheckContext } = await import("../../../src/engine/invariants/types.js");
				return buildCheckContext([...events, fakeEvent]);
			},
		});

		try {
			await appendEvent({
				eventsPath,
				scope: "project",
				scopeRef: null,
				actor: { kind: "cli", id: "test" },
				branch: "main",
				commitHint: null,
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "epics/test" },
				beforeAppend: hook,
			});
			expect.unreachable("Should have thrown InvariantError");
		} catch (err) {
			expect(err).toBeInstanceOf(InvariantError);
			const invariantErr = err as InstanceType<typeof InvariantError>;
			const ruleIds = invariantErr.violations.map((v) => v.ruleId);
			expect(ruleIds).toContain("event.prev-id-chain");
		}
	});

	it("rejected events are NOT written to the JSONL file", async () => {
		await appendEvent(makeOpts({ type: "project-initialized" }));

		try {
			// Missing project-initialized won't fire here since we already have it.
			// But duplicate epic on same branch will fire.
			await appendEvent(
				makeOpts({
					type: "epic-created",
					payload: { directory: "epics/first" },
				}),
			);
			await appendEvent(
				makeOpts({
					type: "epic-created",
					payload: { directory: "epics/second" },
				}),
			);
			expect.unreachable("Should have thrown InvariantError");
		} catch {
			// expected
		}

		const { events } = await replayEventsNode({ eventsPath });
		// Only project-initialized and first epic-created
		expect(events).toHaveLength(2);
	});

	it("InvariantError has correct structure", async () => {
		try {
			await appendEvent(
				makeOpts({
					type: "epic-created",
					payload: { directory: "epics/my-epic" },
				}),
			);
			expect.unreachable("Should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(InvariantError);
			const invariantErr = err as InstanceType<typeof InvariantError>;
			expect(invariantErr.name).toBe("InvariantError");
			expect(invariantErr.message).toContain("Invariant violation:");
			expect(invariantErr.violations.length).toBeGreaterThan(0);
			for (const v of invariantErr.violations) {
				expect(typeof v.ruleId).toBe("string");
				expect(typeof v.message).toBe("string");
			}
		}
	});
});
