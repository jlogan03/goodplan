import { describe, expect, it } from "vitest";
import {
	appendActivityLog,
	evaluateRefinement,
	guardEpicStatus,
	guardQuestStatus,
	guardSliceStatus,
	processLearnings,
	setEpicStatus,
	setQuestStatus,
	setSliceStatus,
} from "../../../src/core/state/transitions/helpers.js";
import type {
	RefinementInput,
	RefinementOutcome,
} from "../../../src/core/state/transitions/helpers.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { ProjectState } from "../../../src/core/tree.js";
import { ZERO_STATE, getJson, getJsonl, setEntry } from "../../../src/core/tree.js";
import type { Epic } from "../../../src/schemas/entities/epic.js";
import type { UnifiedOverview } from "../../../src/schemas/entities/overview.js";
import type { Quest } from "../../../src/schemas/entities/quest.js";
import type { Slice } from "../../../src/schemas/entities/slice.js";
import type { LearningEventEntry } from "../../../src/schemas/records/learning.js";
import type { Refinement } from "../../../src/schemas/shared.js";

// ── Fixtures ─────────────────────────────────────────────────

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-02-01T00:00:00.000Z";

function makeEpic(overrides?: Partial<Epic>): Epic {
	return {
		name: "e1",
		goal: "Goal",
		status: "created",
		verifications: [],
		refinement: null,
		created: TS,
		activated: null,
		updated: TS,
		...overrides,
	};
}

function makeSlice(overrides?: Partial<Slice>): Slice {
	return {
		name: "s1",
		goal: "Goal",
		status: "created",
		refinement: null,
		created: TS,
		updated: TS,
		...overrides,
	};
}

function makeQuest(overrides?: Partial<Quest>): Quest {
	return {
		name: "q1",
		goal: "Goal",
		status: "created",
		refinement: null,
		created: TS,
		updated: TS,
		...overrides,
	};
}

function stateWithEpicAndOverview(epic: Epic): ProjectState {
	let s: ProjectState = ZERO_STATE;
	s = setEntry(s, "epics/e1/epic.json", { type: "json", content: epic });
	s = setEntry(s, "overview.json", {
		type: "json",
		content: {
			epics: [{ name: "e1", status: epic.status, created: TS, completed: null, slices: [] }],
			quests: [],
			tasks: [],
		} satisfies UnifiedOverview,
	});
	return s;
}

function stateWithSliceAndOverview(slice: Slice): ProjectState {
	const epic = makeEpic({ status: "activated" });
	let s = stateWithEpicAndOverview(epic);
	s = setEntry(s, "epics/e1/slices/s1/slice.json", { type: "json", content: slice });
	// Add slice to overview
	const overview = getJson<UnifiedOverview>(s, "overview.json");
	if (overview === undefined) throw new Error("overview.json not found in test fixture");
	s = setEntry(s, "overview.json", {
		type: "json",
		content: {
			...overview,
			epics: overview.epics.map((item) =>
				item.name === "e1"
					? {
							...item,
							slices: [{ name: "s1", status: slice.status, created: TS, completed: null }],
						}
					: item,
			),
		},
	});
	return s;
}

function stateWithQuestAndOverview(quest: Quest): ProjectState {
	let s: ProjectState = ZERO_STATE;
	s = setEntry(s, "quests/q1/quest.json", { type: "json", content: quest });
	s = setEntry(s, "overview.json", {
		type: "json",
		content: {
			epics: [],
			quests: [{ name: "q1", status: quest.status, created: TS, completed: null }],
			tasks: [],
		} satisfies UnifiedOverview,
	});
	return s;
}

// ── evaluateRefinement ───────────────────────────────────────

describe("evaluateRefinement", () => {
	const refinement: Refinement = {
		round: 1,
		maxRounds: 10,
		scoreHistory: [],
	};

	it("advances when all scores pass threshold", () => {
		const input: RefinementInput = { scores: { quality: 9, clarity: 10 } };
		const result = evaluateRefinement(refinement, input);
		expect(result.action).toBe("advance");
	});

	it("advances when override is true regardless of scores", () => {
		const input: RefinementInput = { scores: { quality: 1 }, override: true };
		const result = evaluateRefinement(refinement, input);
		expect(result.action).toBe("advance");
	});

	it("advances when refinement is null (skip path)", () => {
		const input: RefinementInput = { scores: { quality: 1 } };
		const result = evaluateRefinement(null, input);
		expect(result.action).toBe("advance");
	});

	it("returns error when max rounds reached", () => {
		const atMax: Refinement = { round: 10, maxRounds: 10, scoreHistory: [] };
		const input: RefinementInput = { scores: { quality: 5 } };
		const result = evaluateRefinement(atMax, input);
		expect(result.action).toBe("error");
		const err = result as Extract<RefinementOutcome, { action: "error" }>;
		expect(err.error.code).toBe("STATE_MAX_ROUNDS_REACHED");
	});

	it("stays with incremented round when scores below threshold", () => {
		const input: RefinementInput = { scores: { quality: 5 } };
		const result = evaluateRefinement(refinement, input);
		expect(result.action).toBe("stay");
		const stay = result as Extract<RefinementOutcome, { action: "stay" }>;
		expect(stay.newRefinement.round).toBe(2);
		expect(stay.newRefinement.scoreHistory).toHaveLength(1);
		expect(stay.newRefinement.scoreHistory[0]?.round).toBe(1);
		expect(stay.newRefinement.scoreHistory[0]?.scores).toEqual({ quality: 5 });
	});
});

// ── guardEpicStatus ──────────────────────────────────────────

describe("guardEpicStatus", () => {
	it("returns StateError when epic is undefined", () => {
		const result = guardEpicStatus(undefined, "e1", "created", "TEST");
		expect(isStateError(result)).toBe(true);
		expect(result).toHaveProperty("code", "STATE_INVALID_TRANSITION");
		expect(result).toHaveProperty("message");
		expect((result as StateError).message).toContain("not found");
	});

	it("returns StateError when status does not match", () => {
		const epic = makeEpic({ status: "created" });
		const result = guardEpicStatus(epic, "e1", "activated", "TEST");
		expect(isStateError(result)).toBe(true);
		expect(result).toHaveProperty("message");
		expect((result as StateError).message).toContain("created");
	});

	it("returns epic when status matches single expected", () => {
		const epic = makeEpic({ status: "activated" });
		const result = guardEpicStatus(epic, "e1", "activated", "TEST");
		expect(isStateError(result)).toBe(false);
		expect(result).toHaveProperty("status", "activated");
	});

	it("returns epic when status matches one of array", () => {
		const epic = makeEpic({ status: "exploring" });
		const result = guardEpicStatus(epic, "e1", ["created", "exploring"], "TEST");
		expect(isStateError(result)).toBe(false);
		expect(result).toHaveProperty("status", "exploring");
	});
});

// ── guardSliceStatus ─────────────────────────────────────────

describe("guardSliceStatus", () => {
	it("returns StateError when slice is undefined", () => {
		const result = guardSliceStatus(undefined, "s1", "created", "TEST");
		expect(isStateError(result)).toBe(true);
		expect(result).toHaveProperty("message");
		expect((result as StateError).message).toContain("not found");
	});

	it("returns StateError when status does not match", () => {
		const slice = makeSlice({ status: "created" });
		const result = guardSliceStatus(slice, "s1", "implementing", "TEST");
		expect(isStateError(result)).toBe(true);
	});

	it("returns slice when status matches", () => {
		const slice = makeSlice({ status: "implementing" });
		const result = guardSliceStatus(slice, "s1", "implementing", "TEST");
		expect(isStateError(result)).toBe(false);
		expect(result).toHaveProperty("status", "implementing");
	});

	it("includes epic context in error when epicName provided", () => {
		const result = guardSliceStatus(undefined, "s1", "created", "TEST", "e1");
		expect(isStateError(result)).toBe(true);
		expect(result).toHaveProperty("message");
		expect((result as StateError).message).toContain("epic");
	});

	it("returns slice when status matches one of array", () => {
		const slice = makeSlice({ status: "planning" });
		const result = guardSliceStatus(slice, "s1", ["created", "planning"], "TEST");
		expect(isStateError(result)).toBe(false);
	});
});

// ── guardQuestStatus ─────────────────────────────────────────

describe("guardQuestStatus", () => {
	it("returns StateError when quest is undefined", () => {
		const result = guardQuestStatus(undefined, "q1", "created", "TEST");
		expect(isStateError(result)).toBe(true);
		expect(result).toHaveProperty("message");
		expect((result as StateError).message).toContain("not found");
	});

	it("returns StateError when status does not match", () => {
		const quest = makeQuest({ status: "created" });
		const result = guardQuestStatus(quest, "q1", "planning", "TEST");
		expect(isStateError(result)).toBe(true);
	});

	it("returns quest when status matches", () => {
		const quest = makeQuest({ status: "planning" });
		const result = guardQuestStatus(quest, "q1", "planning", "TEST");
		expect(isStateError(result)).toBe(false);
		expect(result).toHaveProperty("status", "planning");
	});

	it("returns quest when status matches one of array", () => {
		const quest = makeQuest({ status: "implementing" });
		const result = guardQuestStatus(quest, "q1", ["planning", "implementing"], "TEST");
		expect(isStateError(result)).toBe(false);
	});
});

// ── processLearnings ─────────────────────────────────────────

describe("processLearnings", () => {
	const baseLearning: LearningEventEntry = {
		category: "worked",
		summary: "Test learning",
		file: "learnings/test.md",
		tags: ["test"],
		source: "epics/e1/slices/s1",
		rollup: true,
		rollupTo: ["epic", "project"],
	};

	it("returns state unchanged for empty array", () => {
		const state = ZERO_STATE;
		const result = processLearnings(
			state,
			[],
			"epics/e1/slices/s1",
			new Set(["epic", "project"]),
			"e1",
		);
		expect(result).toBe(state);
	});

	it("rolls up to both epic and project when targets include both", () => {
		let state: ProjectState = ZERO_STATE;
		state = setEntry(state, "project.json", { type: "json", content: {} });
		const result = processLearnings(
			state,
			[baseLearning],
			"epics/e1/slices/s1",
			new Set(["epic", "project"]),
			"e1",
		);

		const sourceLearnings = getJsonl<LearningEventEntry>(
			result,
			"epics/e1/slices/s1/learnings.jsonl",
		);
		expect(sourceLearnings).toHaveLength(1);
		expect(sourceLearnings?.[0]).toMatchObject({
			category: "worked",
			summary: "Test learning",
			tags: ["test"],
		});

		const epicLearnings = getJsonl<LearningEventEntry>(result, "epics/e1/learnings.jsonl");
		expect(epicLearnings).toHaveLength(1);

		const projectLearnings = getJsonl<LearningEventEntry>(result, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(1);
	});

	it("rolls up to project only when epic not in available targets", () => {
		const projectOnlyLearning: LearningEventEntry = {
			...baseLearning,
			rollupTo: ["project"],
		};
		const state: ProjectState = ZERO_STATE;
		const result = processLearnings(
			state,
			[projectOnlyLearning],
			"quests/q1",
			new Set(["project"]),
		);

		const sourceLearnings = getJsonl<LearningEventEntry>(result, "quests/q1/learnings.jsonl");
		expect(sourceLearnings).toHaveLength(1);

		const epicLearnings = getJsonl<LearningEventEntry>(result, "epics/e1/learnings.jsonl");
		expect(epicLearnings).toBeUndefined();

		const projectLearnings = getJsonl<LearningEventEntry>(result, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(1);
	});

	it("skips epic rollup when epicName not provided even if target requests it", () => {
		const result = processLearnings(
			ZERO_STATE,
			[baseLearning],
			"quests/q1",
			new Set(["epic", "project"]),
		);

		// Epic learnings not written because epicName was not given
		const epicLearnings = getJsonl<LearningEventEntry>(result, "epics/e1/learnings.jsonl");
		expect(epicLearnings).toBeUndefined();

		// Project still gets rollup
		const projectLearnings = getJsonl<LearningEventEntry>(result, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(1);
	});
});

// ── appendActivityLog ────────────────────────────────────────

describe("appendActivityLog", () => {
	it("appends to existing activity log", () => {
		let state: ProjectState = ZERO_STATE;
		state = setEntry(state, "activity-log.jsonl", {
			type: "jsonl",
			content: [{ ts: TS, phase: "init", scope: "project", status: "complete", summary: "Init" }],
		});

		const result = appendActivityLog(state, TS2, "test", "scope", "Did a thing");
		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		expect(log).toHaveLength(2);
		expect(log?.[1]?.phase).toBe("test");
		expect(log?.[1]?.summary).toBe("Did a thing");
	});

	it("creates log when none exists", () => {
		const result = appendActivityLog(ZERO_STATE, TS, "init", "project", "Started");
		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		expect(log).toHaveLength(1);
	});
});

// ── setSliceStatus ───────────────────────────────────────────

describe("setSliceStatus", () => {
	it("updates slice status AND syncs overview", () => {
		const slice = makeSlice({ status: "created" });
		const state = stateWithSliceAndOverview(slice);

		const result = setSliceStatus(state, "e1", "s1", slice, "implementing", TS2);

		const updated = getJson<Slice>(result, "epics/e1/slices/s1/slice.json");
		expect(updated?.status).toBe("implementing");
		expect(updated?.updated).toBe(TS2);

		const overview = getJson<UnifiedOverview>(result, "overview.json");
		const epicItem = overview?.epics.find((i) => i.name === "e1");
		const sliceItem = epicItem?.slices.find((s) => s.name === "s1");
		expect(sliceItem?.status).toBe("implementing");
	});
});

// ── setQuestStatus ───────────────────────────────────────────

describe("setQuestStatus", () => {
	it("updates quest status AND syncs overview", () => {
		const quest = makeQuest({ status: "created" });
		const state = stateWithQuestAndOverview(quest);

		const result = setQuestStatus(state, "q1", quest, "planning", TS2);

		const updated = getJson<Quest>(result, "quests/q1/quest.json");
		expect(updated?.status).toBe("planning");
		expect(updated?.updated).toBe(TS2);

		const overview = getJson<UnifiedOverview>(result, "overview.json");
		const questItem = overview?.quests.find((i) => i.name === "q1");
		expect(questItem?.status).toBe("planning");
	});
});

// ── setEpicStatus ────────────────────────────────────────────

describe("setEpicStatus", () => {
	it("updates epic.json status and timestamp (no overview sync)", () => {
		const epic = makeEpic({ status: "created" });
		const state = stateWithEpicAndOverview(epic);

		const result = setEpicStatus(state, "e1", epic, "exploring", TS2);

		const updated = getJson<Epic>(result, "epics/e1/epic.json");
		expect(updated?.status).toBe("exploring");
		expect(updated?.updated).toBe(TS2);

		// Overview is NOT updated by setEpicStatus (that's updateOverviewStatus)
		const overview = getJson<UnifiedOverview>(result, "overview.json");
		const item = overview?.epics.find((i) => i.name === "e1");
		expect(item?.status).toBe("created");
	});
});
