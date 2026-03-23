import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, setEntry } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Quest } from "../../../src/schemas/entities/quest.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function questInPlanCreated(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_QUEST", name: "q1", goal: "Test quest", ts: TS }) as ProjectState;
	s = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
	s = setEntry(s, "quests/q1/plan.md", { type: "markdown", content: "# Plan" });
	s = reduce(s, { type: "COMPLETE_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
	return s;
}

function questInPlanRefined(): ProjectState {
	let s = questInPlanCreated();
	s = reduce(s, { type: "COMPLETE_QUEST_REFINEMENT_ROUND", quest: "q1", ts: TS, scores: { q: 10 } }) as ProjectState;
	return s;
}

describe("reduce — BEGIN_QUEST_REFINEMENT", () => {
	it("initializes refinement from plan-created", () => {
		const state = questInPlanCreated();
		const result = reduce(state, { type: "BEGIN_QUEST_REFINEMENT", quest: "q1", ts: TS2 });

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		const quest = getJson<Quest>(newState, "quests/q1/quest.json");
		expect(quest!.status).toBe("refining");
		expect(quest!.refinement).toEqual({
			round: 1,
			maxRounds: 10,
			scoreHistory: [],
		});
	});

	it("rejects from wrong status", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_QUEST", name: "q1", goal: "Test", ts: TS }) as ProjectState;

		const result = reduce(s, { type: "BEGIN_QUEST_REFINEMENT", quest: "q1", ts: TS2 });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});

describe("reduce — BEGIN_QUEST_IMPLEMENTATION", () => {
	it("succeeds when plan-refined.md exists", () => {
		let s = questInPlanRefined();
		s = setEntry(s, "quests/q1/plan-refined.md", { type: "markdown", content: "# Refined" });

		const result = reduce(s, { type: "BEGIN_QUEST_IMPLEMENTATION", quest: "q1", ts: TS2 });
		expect(isStateError(result)).toBe(false);

		const quest = getJson<Quest>(result as ProjectState, "quests/q1/quest.json");
		expect(quest!.status).toBe("implementing");
	});

	it("rejects when plan-refined.md is missing", () => {
		const s = questInPlanRefined();
		// Don't add plan-refined.md

		const result = reduce(s, { type: "BEGIN_QUEST_IMPLEMENTATION", quest: "q1", ts: TS2 });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_CONTENT_MISSING");
	});

	it("rejects from wrong status", () => {
		const s = questInPlanCreated();
		// plan-created, not plan-refined
		const result = reduce(s, { type: "BEGIN_QUEST_IMPLEMENTATION", quest: "q1", ts: TS2 });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});
