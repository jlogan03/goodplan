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
import type { LearningEntry } from "../../../src/schemas/records/learning.js";
import type { ArchitectureDelta } from "../../../src/schemas/records/architecture-delta.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function questInImplementationComplete(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_QUEST", name: "q1", goal: "Test quest", ts: TS }) as ProjectState;
	s = reduce(s, { type: "BEGIN_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
	s = setEntry(s, "quests/q1/plan.md", { type: "markdown", content: "# Plan" });
	s = reduce(s, { type: "COMPLETE_QUEST_PLAN", quest: "q1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_QUEST_REFINEMENT_ROUND", quest: "q1", ts: TS, scores: { q: 10 } }) as ProjectState;
	s = setEntry(s, "quests/q1/plan-refined.md", { type: "markdown", content: "# Refined" });
	s = reduce(s, { type: "BEGIN_QUEST_IMPLEMENTATION", quest: "q1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_QUEST_IMPLEMENTATION", quest: "q1", ts: TS }) as ProjectState;
	return s;
}

describe("reduce — COMPLETE_QUEST", () => {
	it("happy path: completes quest with learnings and architecture deltas", () => {
		const s = questInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_QUEST",
			quest: "q1",
			ts: TS2,
			verificationPassed: true,
			learnings: [
				{
					category: "domain",
					summary: "Logging needs correlation IDs",
					detail: "Without correlation IDs, distributed tracing is impossible",
					tags: ["logging"],
					rollupTo: ["project"],
				},
			],
			architectureDelta: [
				{
					subsystem: "logging",
					type: "modify",
					description: "Added correlation ID propagation",
				},
			],
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		// Quest completed
		const quest = getJson<Quest>(newState, "quests/q1/quest.json");
		expect(quest!.status).toBe("completed");
		expect(quest!.updated).toBe(TS2);

		// Overview synced
		const overview = getJson<Overview>(newState, "quests/overview.json");
		const item = overview!.items.find((i) => i.name === "q1");
		expect(item!.status).toBe("completed");

		// Per-quest learnings
		const questLearnings = getJsonl<LearningEntry>(newState, "quests/q1/learnings.jsonl");
		expect(questLearnings).toHaveLength(1);
		expect(questLearnings![0]!.source).toBe("quests/q1");
		expect(questLearnings![0]!.rollup).toBe(true);

		// Project learnings rollup
		const projectLearnings = getJsonl<LearningEntry>(newState, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(1);

		// Architecture deltas
		const deltas = getJsonl<ArchitectureDelta>(newState, "quests/q1/architecture-deltas.jsonl");
		expect(deltas).toHaveLength(1);
		expect(deltas![0]!.subsystem).toBe("logging");
		expect(deltas![0]!.ts).toBe(TS2);

		// activeQuest cleared
		const project = getJson<Project>(newState, "project.json");
		expect(project!.activeQuest).toBeNull();
	});

	it("verificationPassed: false returns error", () => {
		const s = questInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_QUEST",
			quest: "q1",
			ts: TS2,
			verificationPassed: false,
			learnings: [],
			architectureDelta: [],
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_VERIFICATION_FAILED");
	});

	it("learnings with rollupTo 'epic' are silently skipped (quests are project-scoped)", () => {
		const s = questInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_QUEST",
			quest: "q1",
			ts: TS2,
			verificationPassed: true,
			learnings: [{
				category: "worked",
				summary: "Test",
				detail: "Detail",
				tags: [],
				rollupTo: ["epic"],
			}],
			architectureDelta: [],
		}) as ProjectState;

		// Per-quest learnings should have it
		const questLearnings = getJsonl<LearningEntry>(result, "quests/q1/learnings.jsonl");
		expect(questLearnings).toHaveLength(1);

		// Project learnings should NOT have it (rollupTo was "epic" only)
		const projectLearnings = getJsonl<LearningEntry>(result, "learnings.jsonl");
		expect(projectLearnings ?? []).toHaveLength(0);
	});

	it("learnings rolled up to project level", () => {
		const s = questInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_QUEST",
			quest: "q1",
			ts: TS2,
			verificationPassed: true,
			learnings: [{
				category: "domain",
				summary: "Important",
				detail: "Very important",
				tags: [],
				rollupTo: ["project"],
			}],
			architectureDelta: [],
		}) as ProjectState;

		const projectLearnings = getJsonl<LearningEntry>(result, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(1);
		expect(projectLearnings![0]!.summary).toBe("Important");
	});

	it("empty learnings and architectureDelta works", () => {
		const s = questInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_QUEST",
			quest: "q1",
			ts: TS2,
			verificationPassed: true,
			learnings: [],
			architectureDelta: [],
		});

		expect(isStateError(result)).toBe(false);
		const quest = getJson<Quest>(result as ProjectState, "quests/q1/quest.json");
		expect(quest!.status).toBe("completed");
	});

	it("rejects wrong status", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_QUEST", name: "q1", goal: "Test", ts: TS }) as ProjectState;

		const result = reduce(s, {
			type: "COMPLETE_QUEST",
			quest: "q1",
			ts: TS,
			verificationPassed: true,
			learnings: [],
			architectureDelta: [],
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("appends activity log", () => {
		const s = questInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_QUEST",
			quest: "q1",
			ts: TS2,
			verificationPassed: true,
			learnings: [],
			architectureDelta: [],
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		const entry = log![log!.length - 1]!;
		expect(entry.phase).toBe("complete-quest");
		expect(entry.scope).toBe("quests/q1");
	});
});
