import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, setEntry } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Slice } from "../../../src/schemas/entities/slice.js";
import type { Project } from "../../../src/schemas/entities/project.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function stateWithSliceInPlanCreated(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Build stuff", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_SLICE", name: "s1", epic: "e1", goal: "Test slice", ts: TS }) as ProjectState;
	s = reduce(s, { type: "BEGIN_PLAN", epic: "e1", slice: "s1", ts: TS }) as ProjectState;
	s = setEntry(s, "epics/e1/slices/s1/plan.md", { type: "markdown", content: "# Plan" });
	s = reduce(s, { type: "COMPLETE_PLAN", epic: "e1", slice: "s1", ts: TS }) as ProjectState;
	return s;
}

function stateWithSliceInPlanRefined(): ProjectState {
	let s = stateWithSliceInPlanCreated();
	s = reduce(s, { type: "COMPLETE_REFINEMENT_ROUND", epic: "e1", slice: "s1", ts: TS, scores: { q: 10 } }) as ProjectState;
	return s;
}

describe("reduce — BEGIN_REFINEMENT", () => {
	it("transitions plan-created to refining", () => {
		const state = stateWithSliceInPlanCreated();
		const result = reduce(state, { type: "BEGIN_REFINEMENT", epic: "e1", slice: "s1", ts: TS2 });

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		const slice = getJson<Slice>(newState, "epics/e1/slices/s1/slice.json");
		expect(slice!.status).toBe("refining");
		expect(slice!.updated).toBe(TS2);
	});

	it("initializes refinement field", () => {
		const state = stateWithSliceInPlanCreated();
		const result = reduce(state, { type: "BEGIN_REFINEMENT", epic: "e1", slice: "s1", ts: TS2 }) as ProjectState;

		const slice = getJson<Slice>(result, "epics/e1/slices/s1/slice.json");
		expect(slice!.refinement).toEqual({
			round: 1,
			maxRounds: 10,
			scoreHistory: [],
		});
	});

	it("sets activeSlice in project.json", () => {
		const state = stateWithSliceInPlanCreated();
		const result = reduce(state, { type: "BEGIN_REFINEMENT", epic: "e1", slice: "s1", ts: TS2 }) as ProjectState;

		const project = getJson<Project>(result, "project.json");
		expect(project!.activeSlice).toBe("s1");
	});

	it("rejects wrong status", () => {
		const state = stateWithSliceInPlanRefined();
		const result = reduce(state, { type: "BEGIN_REFINEMENT", epic: "e1", slice: "s1", ts: TS2 });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});

describe("reduce — BEGIN_IMPLEMENTATION", () => {
	it("transitions plan-refined to implementing when plan-refined.md exists", () => {
		let s = stateWithSliceInPlanRefined();
		s = setEntry(s, "epics/e1/slices/s1/plan-refined.md", { type: "markdown", content: "# Refined Plan" });

		const result = reduce(s, { type: "BEGIN_IMPLEMENTATION", epic: "e1", slice: "s1", ts: TS2 });
		expect(isStateError(result)).toBe(false);
		const slice = getJson<Slice>(result as ProjectState, "epics/e1/slices/s1/slice.json");
		expect(slice!.status).toBe("implementing");
		expect(slice!.updated).toBe(TS2);
	});

	it("guards plan-refined.md existence", () => {
		const state = stateWithSliceInPlanRefined();
		// No plan-refined.md exists
		const result = reduce(state, { type: "BEGIN_IMPLEMENTATION", epic: "e1", slice: "s1", ts: TS2 });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_CONTENT_MISSING");
	});

	it("sets activeSlice in project.json", () => {
		let s = stateWithSliceInPlanRefined();
		s = setEntry(s, "epics/e1/slices/s1/plan-refined.md", { type: "markdown", content: "# Refined" });

		const result = reduce(s, { type: "BEGIN_IMPLEMENTATION", epic: "e1", slice: "s1", ts: TS2 }) as ProjectState;
		const project = getJson<Project>(result, "project.json");
		expect(project!.activeSlice).toBe("s1");
	});

	it("rejects wrong status", () => {
		const state = stateWithSliceInPlanCreated();
		const result = reduce(state, { type: "BEGIN_IMPLEMENTATION", epic: "e1", slice: "s1", ts: TS2 });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});
