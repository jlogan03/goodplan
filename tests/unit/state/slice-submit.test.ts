import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, setEntry } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Slice } from "../../../src/schemas/entities/slice.js";
import type { Quest } from "../../../src/schemas/entities/quest.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

/**
 * Helper: creates a project with a slice manually placed in `planning` status.
 * Since CREATE_SLICE / BEGIN_PLAN are deferred to later slices, we construct
 * the state fixture directly using setEntry.
 */
function stateWithSliceInPlanning(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;

	// Manually insert a slice in "planning" status
	s = setEntry(s, "slices/s1/slice.json", {
		type: "json",
		content: {
			name: "s1",
			epic: "e1",
			status: "planning",
			goal: "Test slice",
			deferred: [],
			refinement: null,
			created: TS,
			updated: TS,
		} satisfies Slice,
	});
	return s;
}

function stateWithSliceInRefining(): ProjectState {
	let s = stateWithSliceInPlanning();
	// Add plan.md so COMPLETE_PLAN works
	s = setEntry(s, "slices/s1/plan.md", {
		type: "markdown",
		content: "# Plan\nDo stuff.",
	});
	s = reduce(s, { type: "COMPLETE_PLAN", slice: "s1", ts: TS }) as ProjectState;

	// Put into refining with refinement state
	s = setEntry(s, "slices/s1/slice.json", {
		type: "json",
		content: {
			...getJson<Slice>(s, "slices/s1/slice.json")!,
			status: "refining",
			refinement: { round: 1, maxRounds: 10, scoreHistory: [] },
		} satisfies Slice,
	});
	return s;
}

function stateWithSliceInImplementing(): ProjectState {
	let s = stateWithSliceInRefining();
	// Advance to plan-refined via high scores
	s = reduce(s, {
		type: "COMPLETE_REFINEMENT_ROUND",
		slice: "s1",
		ts: TS,
		scores: { q: 10 },
	}) as ProjectState;

	// Put into implementing
	s = setEntry(s, "slices/s1/slice.json", {
		type: "json",
		content: {
			...getJson<Slice>(s, "slices/s1/slice.json")!,
			status: "implementing",
		} satisfies Slice,
	});
	return s;
}

// ── COMPLETE_PLAN ───────────────────────────────────────────

describe("reduce — COMPLETE_PLAN", () => {
	it("transitions planning → plan-created when plan.md exists", () => {
		let s = stateWithSliceInPlanning();
		// Add plan.md
		s = setEntry(s, "slices/s1/plan.md", {
			type: "markdown",
			content: "# Plan\nDo the thing.",
		});

		const result = reduce(s, { type: "COMPLETE_PLAN", slice: "s1", ts: TS2 });
		expect(isStateError(result)).toBe(false);
		const slice = getJson<Slice>(result as ProjectState, "slices/s1/slice.json")!;
		expect(slice.status).toBe("plan-created");
		expect(slice.updated).toBe(TS2);
	});

	it("rejects when plan.md is missing", () => {
		const s = stateWithSliceInPlanning();
		const result = reduce(s, { type: "COMPLETE_PLAN", slice: "s1", ts: TS });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_CONTENT_MISSING");
	});

	it("rejects wrong status", () => {
		let s = stateWithSliceInPlanning();
		s = setEntry(s, "slices/s1/plan.md", {
			type: "markdown",
			content: "# Plan",
		});
		s = reduce(s, { type: "COMPLETE_PLAN", slice: "s1", ts: TS }) as ProjectState;
		// Now in plan-created — trying again should fail
		const result = reduce(s, { type: "COMPLETE_PLAN", slice: "s1", ts: TS });
		expect(isStateError(result)).toBe(true);
	});
});

// ── COMPLETE_REFINEMENT_ROUND ───────────────────────────────

describe("reduce — COMPLETE_REFINEMENT_ROUND", () => {
	it("stays in refining with low scores", () => {
		const s = stateWithSliceInRefining();
		const result = reduce(s, {
			type: "COMPLETE_REFINEMENT_ROUND",
			slice: "s1",
			ts: TS2,
			scores: { correctness: 5 },
		});
		expect(isStateError(result)).toBe(false);
		const slice = getJson<Slice>(result as ProjectState, "slices/s1/slice.json")!;
		expect(slice.status).toBe("refining");
		expect(slice.refinement!.round).toBe(2);
		expect(slice.refinement!.scoreHistory).toHaveLength(1);
		expect(slice.updated).toBe(TS2);
	});

	it("advances to plan-refined with high scores", () => {
		const s = stateWithSliceInRefining();
		const result = reduce(s, {
			type: "COMPLETE_REFINEMENT_ROUND",
			slice: "s1",
			ts: TS,
			scores: { correctness: 9, completeness: 10 },
		});
		expect(isStateError(result)).toBe(false);
		expect(getJson<Slice>(result as ProjectState, "slices/s1/slice.json")!.status).toBe("plan-refined");
	});

	it("skip path: plan-created → plan-refined with high scores", () => {
		let s = stateWithSliceInPlanning();
		s = setEntry(s, "slices/s1/plan.md", {
			type: "markdown",
			content: "# Plan",
		});
		s = reduce(s, { type: "COMPLETE_PLAN", slice: "s1", ts: TS }) as ProjectState;
		// Skip BEGIN_REFINEMENT, go directly to COMPLETE_REFINEMENT_ROUND
		const result = reduce(s, {
			type: "COMPLETE_REFINEMENT_ROUND",
			slice: "s1",
			ts: TS,
			scores: { q: 10 },
		});
		expect(isStateError(result)).toBe(false);
		expect(getJson<Slice>(result as ProjectState, "slices/s1/slice.json")!.status).toBe("plan-refined");
	});

	it("circuit breaker — max rounds reached", () => {
		let s = stateWithSliceInRefining();
		// Exhaust rounds
		for (let i = 0; i < 9; i++) {
			s = reduce(s, {
				type: "COMPLETE_REFINEMENT_ROUND",
				slice: "s1",
				ts: TS,
				scores: { q: 5 },
			}) as ProjectState;
		}
		const result = reduce(s, {
			type: "COMPLETE_REFINEMENT_ROUND",
			slice: "s1",
			ts: TS,
			scores: { q: 5 },
		});
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_MAX_ROUNDS_REACHED");
	});

	it("override bypasses low scores", () => {
		const s = stateWithSliceInRefining();
		const result = reduce(s, {
			type: "COMPLETE_REFINEMENT_ROUND",
			slice: "s1",
			ts: TS,
			scores: { q: 3 },
			override: true,
		});
		expect(isStateError(result)).toBe(false);
		expect(getJson<Slice>(result as ProjectState, "slices/s1/slice.json")!.status).toBe("plan-refined");
	});
});

// ── COMPLETE_IMPLEMENTATION ─────────────────────────────────

describe("reduce — COMPLETE_IMPLEMENTATION", () => {
	it("transitions implementing → implementation-complete", () => {
		const s = stateWithSliceInImplementing();
		const result = reduce(s, { type: "COMPLETE_IMPLEMENTATION", slice: "s1", ts: TS2 });
		expect(isStateError(result)).toBe(false);
		const slice = getJson<Slice>(result as ProjectState, "slices/s1/slice.json")!;
		expect(slice.status).toBe("implementation-complete");
		expect(slice.updated).toBe(TS2);
	});

	it("rejects wrong status", () => {
		const s = stateWithSliceInPlanning();
		const result = reduce(s, { type: "COMPLETE_IMPLEMENTATION", slice: "s1", ts: TS });
		expect(isStateError(result)).toBe(true);
	});
});

// ── Quest variants ──────────────────────────────────────────

function stateWithQuestInPlanning(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = setEntry(s, "quests/q1/quest.json", {
		type: "json",
		content: {
			name: "q1",
			status: "planning",
			goal: "Fix a thing",
			refinement: null,
			created: TS,
			updated: TS,
		} satisfies Quest,
	});
	return s;
}

describe("reduce — COMPLETE_QUEST_PLAN", () => {
	it("transitions planning → plan-created when plan.md exists", () => {
		let s = stateWithQuestInPlanning();
		s = setEntry(s, "quests/q1/plan.md", {
			type: "markdown",
			content: "# Quest Plan",
		});
		const result = reduce(s, { type: "COMPLETE_QUEST_PLAN", quest: "q1", ts: TS2 });
		expect(isStateError(result)).toBe(false);
		const quest = getJson<Quest>(result as ProjectState, "quests/q1/quest.json")!;
		expect(quest.status).toBe("plan-created");
		expect(quest.updated).toBe(TS2);
	});

	it("rejects when plan.md is missing", () => {
		const s = stateWithQuestInPlanning();
		const result = reduce(s, { type: "COMPLETE_QUEST_PLAN", quest: "q1", ts: TS });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_CONTENT_MISSING");
	});
});

describe("reduce — COMPLETE_QUEST_REFINEMENT_ROUND", () => {
	it("advances with high scores from refining", () => {
		let s = stateWithQuestInPlanning();
		s = setEntry(s, "quests/q1/plan.md", {
			type: "markdown",
			content: "# Plan",
		});
		s = reduce(s, { type: "COMPLETE_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
		// Put into refining
		s = setEntry(s, "quests/q1/quest.json", {
			type: "json",
			content: {
				...getJson<Quest>(s, "quests/q1/quest.json")!,
				status: "refining",
				refinement: { round: 1, maxRounds: 10, scoreHistory: [] },
			} satisfies Quest,
		});

		const result = reduce(s, {
			type: "COMPLETE_QUEST_REFINEMENT_ROUND",
			quest: "q1",
			ts: TS2,
			scores: { q: 9 },
		});
		expect(isStateError(result)).toBe(false);
		const quest = getJson<Quest>(result as ProjectState, "quests/q1/quest.json")!;
		expect(quest.status).toBe("plan-refined");
		expect(quest.updated).toBe(TS2);
	});

	it("skip path: plan-created → plan-refined with high scores", () => {
		let s = stateWithQuestInPlanning();
		s = setEntry(s, "quests/q1/plan.md", {
			type: "markdown",
			content: "# Plan",
		});
		s = reduce(s, { type: "COMPLETE_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;

		const result = reduce(s, {
			type: "COMPLETE_QUEST_REFINEMENT_ROUND",
			quest: "q1",
			ts: TS,
			scores: { q: 10 },
		});
		expect(isStateError(result)).toBe(false);
		expect(getJson<Quest>(result as ProjectState, "quests/q1/quest.json")!.status).toBe("plan-refined");
	});
});

describe("reduce — COMPLETE_QUEST_IMPLEMENTATION", () => {
	it("transitions implementing → implementation-complete", () => {
		let s = stateWithQuestInPlanning();
		s = setEntry(s, "quests/q1/quest.json", {
			type: "json",
			content: {
				...getJson<Quest>(s, "quests/q1/quest.json")!,
				status: "implementing",
			} satisfies Quest,
		});

		const result = reduce(s, { type: "COMPLETE_QUEST_IMPLEMENTATION", quest: "q1", ts: TS2 });
		expect(isStateError(result)).toBe(false);
		const quest = getJson<Quest>(result as ProjectState, "quests/q1/quest.json")!;
		expect(quest.status).toBe("implementation-complete");
		expect(quest.updated).toBe(TS2);
	});

	it("rejects wrong status", () => {
		const s = stateWithQuestInPlanning();
		const result = reduce(s, { type: "COMPLETE_QUEST_IMPLEMENTATION", quest: "q1", ts: TS });
		expect(isStateError(result)).toBe(true);
	});
});
