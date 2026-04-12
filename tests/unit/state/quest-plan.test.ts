import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Project } from "../../../src/schemas/entities/project.js";
import type { Quest } from "../../../src/schemas/entities/quest.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function initWithQuest(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_QUEST", name: "q1", goal: "Test quest", ts: TS }) as ProjectState;
	return s;
}

describe("reduce — BEGIN_QUEST_PLAN", () => {
	it("succeeds from created when no activeQuest", () => {
		const state = initWithQuest();
		const result = reduce(state, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS2 });

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		const quest = getJson<Quest>(newState, "quests/q1/quest.json");
		expect(quest?.status).toBe("planning");
		expect(quest?.updated).toBe(TS2);
	});

	it("sets activeQuest in project.json", () => {
		const state = initWithQuest();
		const result = reduce(state, {
			type: "BEGIN_QUEST_PLAN",
			quest: "q1",
			ts: TS2,
		}) as ProjectState;

		const project = getJson<Project>(result, "project.json");
		expect(project?.activeQuest).toBe("q1");
	});

	it("rejects with STATE_QUEST_ALREADY_ACTIVE when another quest is active", () => {
		let s = initWithQuest();
		s = reduce(s, {
			type: "CREATE_QUEST",
			name: "q2",
			goal: "Second quest",
			ts: TS,
		}) as ProjectState;
		// Make q1 active
		s = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;

		// Try to begin planning q2
		const result = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q2", ts: TS2 });

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_QUEST_ALREADY_ACTIVE");
	});

	it("rejects from non-created status", () => {
		let s = initWithQuest();
		s = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;

		// Try to begin plan again (status is now 'planning')
		const result = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS2 });

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects for nonexistent quest", () => {
		const state = initWithQuest();
		const result = reduce(state, { type: "BEGIN_QUEST_PLAN", quest: "nonexistent", ts: TS2 });

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("appends activity log entry", () => {
		const state = initWithQuest();
		const result = reduce(state, {
			type: "BEGIN_QUEST_PLAN",
			quest: "q1",
			ts: TS2,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		const entry = log?.[log?.length - 1]!;
		expect(entry.phase).toBe("begin-quest-plan");
		expect(entry.scope).toBe("quests/q1");
	});
});
