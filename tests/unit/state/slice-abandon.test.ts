import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl, setEntry } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Slice } from "../../../src/schemas/entities/slice.js";
import type { Project } from "../../../src/schemas/entities/project.js";
import type { Overview } from "../../../src/schemas/entities/overview.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function initWithSlice(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Build stuff", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_SLICE", name: "s1", epic: "e1", goal: "Test slice", ts: TS }) as ProjectState;
	return s;
}

describe("reduce — ABANDON_SLICE", () => {
	it("abandons from created status", () => {
		const s = initWithSlice();
		const result = reduce(s, { type: "ABANDON_SLICE", slice: "s1", ts: TS2, reason: "Not needed" });

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		const slice = getJson<Slice>(newState, "slices/s1/slice.json");
		expect(slice!.status).toBe("abandoned");
		expect(slice!.updated).toBe(TS2);
	});

	it("abandons from planning status", () => {
		let s = initWithSlice();
		s = reduce(s, { type: "BEGIN_PLAN", slice: "s1", ts: TS }) as ProjectState;

		const result = reduce(s, { type: "ABANDON_SLICE", slice: "s1", ts: TS2, reason: "Changed direction" });
		expect(isStateError(result)).toBe(false);
		expect(getJson<Slice>(result as ProjectState, "slices/s1/slice.json")!.status).toBe("abandoned");
	});

	it("abandons from implementing status", () => {
		let s = initWithSlice();
		s = reduce(s, { type: "BEGIN_PLAN", slice: "s1", ts: TS }) as ProjectState;
		s = setEntry(s, "slices/s1/plan.md", { type: "markdown", content: "# Plan" });
		s = reduce(s, { type: "COMPLETE_PLAN", slice: "s1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_REFINEMENT_ROUND", slice: "s1", ts: TS, scores: { q: 10 } }) as ProjectState;
		s = setEntry(s, "slices/s1/plan-refined.md", { type: "markdown", content: "# Refined" });
		s = reduce(s, { type: "BEGIN_IMPLEMENTATION", slice: "s1", ts: TS }) as ProjectState;

		const result = reduce(s, { type: "ABANDON_SLICE", slice: "s1", ts: TS2, reason: "Blocked" });
		expect(isStateError(result)).toBe(false);
		expect(getJson<Slice>(result as ProjectState, "slices/s1/slice.json")!.status).toBe("abandoned");
	});

	it("syncs overview status to abandoned", () => {
		const s = initWithSlice();
		const result = reduce(s, { type: "ABANDON_SLICE", slice: "s1", ts: TS2, reason: "Done" }) as ProjectState;

		const overview = getJson<Overview>(result, "slices/overview.json");
		const item = overview!.items.find((i) => i.name === "s1");
		expect(item!.status).toBe("abandoned");
	});

	it("clears activeSlice if this was the active slice", () => {
		let s = initWithSlice();
		s = reduce(s, { type: "BEGIN_PLAN", slice: "s1", ts: TS }) as ProjectState;
		// s1 is now activeSlice
		expect(getJson<Project>(s, "project.json")!.activeSlice).toBe("s1");

		const result = reduce(s, { type: "ABANDON_SLICE", slice: "s1", ts: TS2, reason: "Cancel" }) as ProjectState;
		expect(getJson<Project>(result, "project.json")!.activeSlice).toBeNull();
	});

	it("does not clear activeSlice if another slice is active", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Build stuff", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_SLICE", name: "s1", epic: "e1", goal: "First", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_SLICE", name: "s2", epic: "e1", goal: "Second", ts: TS }) as ProjectState;
		// Make s1 active
		s = reduce(s, { type: "BEGIN_PLAN", slice: "s1", ts: TS }) as ProjectState;
		expect(getJson<Project>(s, "project.json")!.activeSlice).toBe("s1");

		// Abandon s2 (not the active one)
		const result = reduce(s, { type: "ABANDON_SLICE", slice: "s2", ts: TS2, reason: "Skip" }) as ProjectState;
		expect(getJson<Project>(result, "project.json")!.activeSlice).toBe("s1");
	});

	it("rejects from completed (terminal)", () => {
		let s = initWithSlice();
		s = reduce(s, { type: "BEGIN_PLAN", slice: "s1", ts: TS }) as ProjectState;
		s = setEntry(s, "slices/s1/plan.md", { type: "markdown", content: "# Plan" });
		s = reduce(s, { type: "COMPLETE_PLAN", slice: "s1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_REFINEMENT_ROUND", slice: "s1", ts: TS, scores: { q: 10 } }) as ProjectState;
		s = setEntry(s, "slices/s1/plan-refined.md", { type: "markdown", content: "# Refined" });
		s = reduce(s, { type: "BEGIN_IMPLEMENTATION", slice: "s1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_IMPLEMENTATION", slice: "s1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS,
			verificationPassed: true,
			deferred: [],
			learnings: [],
			architectureDelta: [],
		}) as ProjectState;

		const result = reduce(s, { type: "ABANDON_SLICE", slice: "s1", ts: TS2, reason: "Too late" });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects from abandoned (terminal)", () => {
		let s = initWithSlice();
		s = reduce(s, { type: "ABANDON_SLICE", slice: "s1", ts: TS, reason: "First" }) as ProjectState;

		const result = reduce(s, { type: "ABANDON_SLICE", slice: "s1", ts: TS2, reason: "Second" });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("appends activity log entry with reason", () => {
		const s = initWithSlice();
		const result = reduce(s, { type: "ABANDON_SLICE", slice: "s1", ts: TS2, reason: "Changed plan" }) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		const entry = log![log!.length - 1]!;
		expect(entry.phase).toBe("abandon-slice");
		expect(entry.scope).toBe("slices/s1");
		expect((entry.summary as string).includes("Changed plan")).toBe(true);
	});
});
