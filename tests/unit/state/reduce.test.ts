import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl, getDir } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";

// ── INIT_PROJECT ────────────────────────────────────────────

describe("reduce — INIT_PROJECT", () => {
	it("produces a valid initial tree from ZERO_STATE", () => {
		const result = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "my-proj", ts: "2026-01-01T00:00:00.000Z" });

		expect(isStateError(result)).toBe(false);
		const state = result as ProjectState;

		// project.json exists with correct content
		const project = getJson<{
			version: string;
			name: string;
			activeEpic: string | null;
			activeSlice: string | null;
			activeQuest: string | null;
			created: string;
			updated: string;
		}>(state, "project.json");
		expect(project).toBeDefined();
		expect(project!.name).toBe("my-proj");
		expect(project!.version).toBe("1.0.0");
		expect(project!.activeEpic).toBeNull();
		expect(project!.activeSlice).toBeNull();
		expect(project!.activeQuest).toBeNull();
		expect(project!.created).toBeDefined();
		expect(project!.updated).toBeDefined();

		// Overview files exist with empty items arrays
		const epicsOverview = getJson<{ items: unknown[] }>(state, "epics/overview.json");
		expect(epicsOverview).toBeDefined();
		expect(epicsOverview!.items).toEqual([]);

		const questsOverview = getJson<{ items: unknown[] }>(state, "quests/overview.json");
		expect(questsOverview).toBeDefined();
		expect(questsOverview!.items).toEqual([]);

		// Collection directories exist
		expect(getDir(state, "epics")).toBeDefined();
		expect(getDir(state, "quests")).toBeDefined();

		// JSONL files exist
		const activityLog = getJsonl<unknown>(state, "activity-log.jsonl");
		expect(activityLog).toBeDefined();
		expect(activityLog!.length).toBe(1);

		const decisions = getJsonl<unknown>(state, "decisions.jsonl");
		expect(decisions).toBeDefined();
		expect(decisions!.length).toBe(0);

		const learnings = getJsonl<unknown>(state, "learnings.jsonl");
		expect(learnings).toBeDefined();
		expect(learnings!.length).toBe(0);
	});

	it("activity log entry has correct shape (ts, phase, scope, status, summary)", () => {
		const result = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: "2026-01-01T00:00:00.000Z" });
		const state = result as ProjectState;

		const activityLog = getJsonl<Record<string, unknown>>(state, "activity-log.jsonl");
		expect(activityLog).toBeDefined();
		expect(activityLog!.length).toBe(1);

		const entry = activityLog![0]!;

		// Structural shape checks — plain object, NOT Zod
		expect(typeof entry.ts).toBe("string");
		expect((entry.ts as string).length).toBeGreaterThan(0);
		expect(entry.phase).toBe("init");
		expect(entry.scope).toBe("project");
		expect(entry.status).toBe("complete");
		expect(typeof entry.summary).toBe("string");
		expect((entry.summary as string).length).toBeGreaterThan(0);
	});

	it("returns STATE_ALREADY_INITIALIZED when project.json exists", () => {
		// First init to get a valid state
		const initialState = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "existing", ts: "2026-01-01T00:00:00.000Z" });
		expect(isStateError(initialState)).toBe(false);

		// Second init on the same state
		const result = reduce(initialState as ProjectState, {
			type: "INIT_PROJECT",
			name: "duplicate",
			ts: "2026-01-01T00:00:01.000Z",
		});

		expect(isStateError(result)).toBe(true);
		const error = result as StateError;
		expect(error.code).toBe("STATE_ALREADY_INITIALIZED");
		expect(error.message).toBeDefined();
	});
});

// ── Unknown event type ──────────────────────────────────────

describe("reduce — unknown event type", () => {
	it("returns STATE_INVALID_TRANSITION for unknown event types", () => {
		const result = reduce(ZERO_STATE, { type: "BOGUS_EVENT" } as never);

		expect(isStateError(result)).toBe(true);
		const error = result as StateError;
		expect(error.code).toBe("STATE_INVALID_TRANSITION");
		expect(error.message).toContain("BOGUS_EVENT");
	});
});

// ── Purity check ────────────────────────────────────────────

describe("reduce — purity", () => {
	it("same inputs produce identical outputs", () => {
		const event = { type: "INIT_PROJECT" as const, name: "pure-test", ts: "2026-01-01T00:00:00.000Z" };

		const result1 = reduce(ZERO_STATE, event);
		const result2 = reduce(ZERO_STATE, event);

		// Both should succeed
		expect(isStateError(result1)).toBe(false);
		expect(isStateError(result2)).toBe(false);

		// Full structural equality — same inputs must produce identical output
		expect(result1).toEqual(result2);
	});

	it("does not mutate the input state", () => {
		const before = JSON.stringify(ZERO_STATE);
		reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "immutable-test", ts: "2026-01-01T00:00:00.000Z" });
		const after = JSON.stringify(ZERO_STATE);

		expect(before).toBe(after);
	});
});
