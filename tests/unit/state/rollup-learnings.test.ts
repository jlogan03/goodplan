import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJsonl, setEntry } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { LearningEntry } from "../../../src/schemas/records/learning.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function initProject(): ProjectState {
	return reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
}

function makeLearning(overrides: Partial<LearningEntry> = {}): LearningEntry {
	return {
		category: "domain",
		summary: "Test learning",
		file: "learnings/test-learning.md",
		tags: [],
		source: "slices/s1",
		rollup: true,
		rollupTo: ["project"],
		...overrides,
	};
}

describe("reduce — ROLLUP_LEARNINGS", () => {
	it("filters by rollupTo matching target and batch appends to target", () => {
		let s = initProject();
		// Set up source learnings with mixed rollupTo targets
		const learnings: LearningEntry[] = [
			makeLearning({ summary: "For project", rollupTo: ["project"] }),
			makeLearning({ summary: "For epic", rollupTo: ["epic"], rollup: true }),
			makeLearning({ summary: "No rollup", rollupTo: [], rollup: false }),
		];
		s = setEntry(s, "slices/s1/learnings.jsonl", { type: "jsonl", content: learnings });

		const result = reduce(s, {
			type: "ROLLUP_LEARNINGS",
			from: "slices/s1",
			to: "project",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		// Only the "project" tagged learning should appear in project learnings
		const projectLearnings = getJsonl<LearningEntry>(newState, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(1);
		expect(projectLearnings![0]!.summary).toBe("For project");

		// Source should no longer contain the rolled-up entry
		const sourceLearnings = getJsonl<LearningEntry>(newState, "slices/s1/learnings.jsonl");
		expect(sourceLearnings).toHaveLength(2);
		expect(sourceLearnings!.map((l) => l.summary)).toEqual(["For epic", "No rollup"]);
	});

	it("missing source returns error", () => {
		const s = initProject();
		const result = reduce(s, {
			type: "ROLLUP_LEARNINGS",
			from: "slices/nonexistent",
			to: "project",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("empty source returns unchanged state", () => {
		let s = initProject();
		s = setEntry(s, "slices/s1/learnings.jsonl", { type: "jsonl", content: [] });

		const result = reduce(s, {
			type: "ROLLUP_LEARNINGS",
			from: "slices/s1",
			to: "project",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		// State should be unchanged (no matching entries = no changes)
		expect(result).toBe(s);
	});

	it("only matching entries rolled up — non-matching stay in source only", () => {
		let s = initProject();
		const learnings: LearningEntry[] = [
			makeLearning({ summary: "Epic only", rollupTo: ["epic"] }),
			makeLearning({ summary: "Project only", rollupTo: ["project"] }),
			makeLearning({ summary: "Both", rollupTo: ["epic", "project"] }),
		];
		s = setEntry(s, "slices/s1/learnings.jsonl", { type: "jsonl", content: learnings });

		const result = reduce(s, {
			type: "ROLLUP_LEARNINGS",
			from: "slices/s1",
			to: "project",
			ts: TS2,
		}) as ProjectState;

		const projectLearnings = getJsonl<LearningEntry>(result, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(2); // "Project only" + "Both"

		const remaining = getJsonl<LearningEntry>(result, "slices/s1/learnings.jsonl");
		expect(remaining).toHaveLength(1); // "Epic only"
		expect(remaining![0]!.summary).toBe("Epic only");
	});

	it("rollup to epic uses active epic from project.json", () => {
		let s = initProject();
		s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Build", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_SLICE", name: "s1", epic: "e1", goal: "Slice", ts: TS }) as ProjectState;

		// Activate the epic by going through the full lifecycle
		s = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "BEGIN_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE", epic: "e1", ts: TS,
			scores: { q: 10 },
		}) as ProjectState;
		s = reduce(s, { type: "BEGIN_SLICING", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_SLICING", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_REFINE_SLICES", epic: "e1", ts: TS,
			scores: { q: 10 },
		}) as ProjectState;
		s = reduce(s, {
			type: "ADD_VERIFICATION", epic: "e1", ts: TS,
			verification: { description: "test", status: "pending", addedDuring: "defining-slices", modifiedDuring: null },
		}) as ProjectState;
		s = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS }) as ProjectState;

		// Set up source learnings
		const learnings: LearningEntry[] = [
			makeLearning({ summary: "Epic rollup", rollupTo: ["epic"] }),
		];
		s = setEntry(s, "slices/s1/learnings.jsonl", { type: "jsonl", content: learnings });

		const result = reduce(s, {
			type: "ROLLUP_LEARNINGS",
			from: "slices/s1",
			to: "epic",
			ts: TS2,
		}) as ProjectState;

		const epicLearnings = getJsonl<LearningEntry>(result, "epics/e1/learnings.jsonl");
		expect(epicLearnings).toHaveLength(1);
		expect(epicLearnings![0]!.summary).toBe("Epic rollup");
	});

	it("rollup to epic with no active epic returns error", () => {
		let s = initProject();
		s = setEntry(s, "slices/s1/learnings.jsonl", {
			type: "jsonl",
			content: [makeLearning({ rollupTo: ["epic"] })],
		});

		const result = reduce(s, {
			type: "ROLLUP_LEARNINGS",
			from: "slices/s1",
			to: "epic",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("appends activity log with count", () => {
		let s = initProject();
		s = setEntry(s, "slices/s1/learnings.jsonl", {
			type: "jsonl",
			content: [
				makeLearning({ summary: "L1", rollupTo: ["project"] }),
				makeLearning({ summary: "L2", rollupTo: ["project"] }),
			],
		});

		const result = reduce(s, {
			type: "ROLLUP_LEARNINGS",
			from: "slices/s1",
			to: "project",
			ts: TS2,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		const entry = log![log!.length - 1]!;
		expect(entry.phase).toBe("rollup-learnings");
		expect(entry.summary).toContain("2");
	});
});
