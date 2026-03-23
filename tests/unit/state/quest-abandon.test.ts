import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl, setEntry } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Quest } from "../../../src/schemas/entities/quest.js";
import type { Project } from "../../../src/schemas/entities/project.js";
import type { Overview } from "../../../src/schemas/entities/overview.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function initWithQuest(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_QUEST", name: "q1", goal: "Test quest", ts: TS }) as ProjectState;
	return s;
}

describe("reduce — ABANDON_QUEST", () => {
	it("abandons from created status", () => {
		const s = initWithQuest();
		const result = reduce(s, { type: "ABANDON_QUEST", quest: "q1", ts: TS2, reason: "Not needed" });

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		const quest = getJson<Quest>(newState, "quests/q1/quest.json");
		expect(quest!.status).toBe("abandoned");
		expect(quest!.updated).toBe(TS2);
	});

	it("abandons from planning status", () => {
		let s = initWithQuest();
		s = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;

		const result = reduce(s, { type: "ABANDON_QUEST", quest: "q1", ts: TS2, reason: "Changed direction" });
		expect(isStateError(result)).toBe(false);
		expect(getJson<Quest>(result as ProjectState, "quests/q1/quest.json")!.status).toBe("abandoned");
	});

	it("abandons from implementing status", () => {
		let s = initWithQuest();
		s = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
		s = setEntry(s, "quests/q1/plan.md", { type: "markdown", content: "# Plan" });
		s = reduce(s, { type: "COMPLETE_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_QUEST_REFINEMENT_ROUND", quest: "q1", ts: TS, scores: { q: 10 } }) as ProjectState;
		s = setEntry(s, "quests/q1/plan-refined.md", { type: "markdown", content: "# Refined" });
		s = reduce(s, { type: "BEGIN_QUEST_IMPLEMENTATION", quest: "q1", ts: TS }) as ProjectState;

		const result = reduce(s, { type: "ABANDON_QUEST", quest: "q1", ts: TS2, reason: "Blocked" });
		expect(isStateError(result)).toBe(false);
		expect(getJson<Quest>(result as ProjectState, "quests/q1/quest.json")!.status).toBe("abandoned");
	});

	it("syncs overview status to abandoned", () => {
		const s = initWithQuest();
		const result = reduce(s, { type: "ABANDON_QUEST", quest: "q1", ts: TS2, reason: "Done" }) as ProjectState;

		const overview = getJson<Overview>(result, "quests/overview.json");
		const item = overview!.items.find((i) => i.name === "q1");
		expect(item!.status).toBe("abandoned");
	});

	it("clears activeQuest if this was the active quest", () => {
		let s = initWithQuest();
		s = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
		expect(getJson<Project>(s, "project.json")!.activeQuest).toBe("q1");

		const result = reduce(s, { type: "ABANDON_QUEST", quest: "q1", ts: TS2, reason: "Cancel" }) as ProjectState;
		expect(getJson<Project>(result, "project.json")!.activeQuest).toBeNull();
	});

	it("does not clear activeQuest if another quest is active", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_QUEST", name: "q1", goal: "First", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_QUEST", name: "q2", goal: "Second", ts: TS }) as ProjectState;
		// Make q1 active
		s = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
		expect(getJson<Project>(s, "project.json")!.activeQuest).toBe("q1");

		// Abandon q2 (not the active one)
		const result = reduce(s, { type: "ABANDON_QUEST", quest: "q2", ts: TS2, reason: "Skip" }) as ProjectState;
		expect(getJson<Project>(result, "project.json")!.activeQuest).toBe("q1");
	});

	it("rejects from completed (terminal)", () => {
		let s = initWithQuest();
		s = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
		s = setEntry(s, "quests/q1/plan.md", { type: "markdown", content: "# Plan" });
		s = reduce(s, { type: "COMPLETE_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_QUEST_REFINEMENT_ROUND", quest: "q1", ts: TS, scores: { q: 10 } }) as ProjectState;
		s = setEntry(s, "quests/q1/plan-refined.md", { type: "markdown", content: "# Refined" });
		s = reduce(s, { type: "BEGIN_QUEST_IMPLEMENTATION", quest: "q1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_QUEST_IMPLEMENTATION", quest: "q1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_QUEST",
			quest: "q1",
			ts: TS,
			verificationPassed: true,
			learnings: [],
			architectureDelta: [],
		}) as ProjectState;

		const result = reduce(s, { type: "ABANDON_QUEST", quest: "q1", ts: TS2, reason: "Too late" });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects from abandoned (terminal)", () => {
		let s = initWithQuest();
		s = reduce(s, { type: "ABANDON_QUEST", quest: "q1", ts: TS, reason: "First" }) as ProjectState;

		const result = reduce(s, { type: "ABANDON_QUEST", quest: "q1", ts: TS2, reason: "Second" });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("appends activity log entry with reason", () => {
		const s = initWithQuest();
		const result = reduce(s, { type: "ABANDON_QUEST", quest: "q1", ts: TS2, reason: "Changed plan" }) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		const entry = log![log!.length - 1]!;
		expect(entry.phase).toBe("abandon-quest");
		expect(entry.scope).toBe("quests/q1");
		expect((entry.summary as string).includes("Changed plan")).toBe(true);
	});

	it("rejects for nonexistent quest", () => {
		const s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		const result = reduce(s, { type: "ABANDON_QUEST", quest: "nonexistent", ts: TS2, reason: "Nope" });

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});
