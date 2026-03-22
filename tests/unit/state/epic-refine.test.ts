import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Epic } from "../../../src/schemas/entities/epic.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function stateAtRefiningArch(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Goal", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "BEGIN_REFINE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
	return s;
}

function stateAtRefiningSlices(): ProjectState {
	let s = stateAtRefiningArch();
	s = reduce(s, { type: "COMPLETE_REFINE_ARCHITECTURE", epic: "e1", ts: TS, scores: { q: 10 } }) as ProjectState;
	s = reduce(s, { type: "BEGIN_SLICING", epic: "e1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_SLICING", epic: "e1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "BEGIN_REFINE_SLICES", epic: "e1", ts: TS }) as ProjectState;
	return s;
}

function getEpicData(state: ProjectState): Epic {
	return getJson<Epic>(state, "epics/e1/epic.json")!;
}

describe("reduce — COMPLETE_REFINE_ARCHITECTURE", () => {
	it("scores below threshold — stays in refining-architecture", () => {
		const s = stateAtRefiningArch();
		const result = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e1",
			ts: TS2,
			scores: { correctness: 5, completeness: 7 },
		});
		expect(isStateError(result)).toBe(false);
		const epic = getEpicData(result as ProjectState);
		expect(epic.status).toBe("refining-architecture");
		expect(epic.refinement).not.toBeNull();
		expect(epic.refinement!.round).toBe(2);
		expect(epic.refinement!.scoreHistory).toHaveLength(1);
		expect(epic.updated).toBe(TS2);
	});

	it("scores meet threshold — advances to architecture-refined", () => {
		const s = stateAtRefiningArch();
		const result = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e1",
			ts: TS2,
			scores: { correctness: 9, completeness: 10 },
		});
		expect(isStateError(result)).toBe(false);
		const epic = getEpicData(result as ProjectState);
		expect(epic.status).toBe("architecture-refined");
		expect(epic.updated).toBe(TS2);
	});

	it("override forces advancement despite low scores", () => {
		const s = stateAtRefiningArch();
		const result = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e1",
			ts: TS,
			scores: { q: 3 },
			override: true,
		});
		expect(isStateError(result)).toBe(false);
		expect(getEpicData(result as ProjectState).status).toBe("architecture-refined");
	});

	it("max rounds reached — returns STATE_MAX_ROUNDS_REACHED", () => {
		let s = stateAtRefiningArch();
		// Exhaust all 10 rounds with low scores
		for (let i = 0; i < 9; i++) {
			s = reduce(s, {
				type: "COMPLETE_REFINE_ARCHITECTURE",
				epic: "e1",
				ts: TS,
				scores: { q: 5 },
			}) as ProjectState;
		}
		// Round is now 10 (maxRounds). Next attempt should fail.
		const result = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e1",
			ts: TS,
			scores: { q: 5 },
		});
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_MAX_ROUNDS_REACHED");
	});

	it("records score history across rounds", () => {
		let s = stateAtRefiningArch();
		s = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e1",
			ts: TS,
			scores: { a: 5 },
		}) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e1",
			ts: TS,
			scores: { a: 7 },
		}) as ProjectState;
		const epic = getEpicData(s);
		expect(epic.refinement!.scoreHistory).toHaveLength(2);
		expect(epic.refinement!.scoreHistory[0]!.round).toBe(1);
		expect(epic.refinement!.scoreHistory[0]!.scores).toEqual({ a: 5 });
		expect(epic.refinement!.scoreHistory[1]!.round).toBe(2);
		expect(epic.refinement!.scoreHistory[1]!.scores).toEqual({ a: 7 });
	});

	it("skip path: architecture-defined → architecture-refined with high scores", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Goal", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		// Skip BEGIN_REFINE_ARCHITECTURE, go directly to COMPLETE
		const result = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e1",
			ts: TS,
			scores: { q: 10 },
		});
		expect(isStateError(result)).toBe(false);
		expect(getEpicData(result as ProjectState).status).toBe("architecture-refined");
	});
});

describe("reduce — COMPLETE_REFINE_SLICES", () => {
	it("scores below threshold — stays in refining-slices", () => {
		const s = stateAtRefiningSlices();
		const result = reduce(s, {
			type: "COMPLETE_REFINE_SLICES",
			epic: "e1",
			ts: TS,
			scores: { q: 5 },
		});
		expect(isStateError(result)).toBe(false);
		expect(getEpicData(result as ProjectState).status).toBe("refining-slices");
	});

	it("scores meet threshold — advances to slices-refined", () => {
		const s = stateAtRefiningSlices();
		const result = reduce(s, {
			type: "COMPLETE_REFINE_SLICES",
			epic: "e1",
			ts: TS,
			scores: { q: 9 },
		});
		expect(isStateError(result)).toBe(false);
		expect(getEpicData(result as ProjectState).status).toBe("slices-refined");
	});

	it("override forces advancement despite low scores", () => {
		const s = stateAtRefiningSlices();
		const result = reduce(s, {
			type: "COMPLETE_REFINE_SLICES",
			epic: "e1",
			ts: TS,
			scores: { q: 2 },
			override: true,
		});
		expect(isStateError(result)).toBe(false);
		expect(getEpicData(result as ProjectState).status).toBe("slices-refined");
	});
});
