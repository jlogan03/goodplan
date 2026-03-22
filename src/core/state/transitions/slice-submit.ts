import type { Quest, QuestStatus } from "../../../schemas/entities/quest.js";
import type { SliceStatus } from "../../../schemas/entities/slice.js";
/**
 * Slice and quest submit handlers: COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND,
 * COMPLETE_IMPLEMENTATION + quest variants.
 * Pure functions, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { getJson, hasChild, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	appendActivityLog,
	evaluateRefinement,
	getSlice,
	guardSliceStatus,
	setSliceStatus,
} from "./helpers.js";

type CompletePlanEvent = Extract<StateEvent, { type: "COMPLETE_PLAN" }>;
type CompleteRefinementRoundEvent = Extract<StateEvent, { type: "COMPLETE_REFINEMENT_ROUND" }>;
type CompleteImplementationEvent = Extract<StateEvent, { type: "COMPLETE_IMPLEMENTATION" }>;
type CompleteQuestPlanEvent = Extract<StateEvent, { type: "COMPLETE_QUEST_PLAN" }>;
type CompleteQuestRefinementRoundEvent = Extract<
	StateEvent,
	{ type: "COMPLETE_QUEST_REFINEMENT_ROUND" }
>;
type CompleteQuestImplementationEvent = Extract<
	StateEvent,
	{ type: "COMPLETE_QUEST_IMPLEMENTATION" }
>;

// ── Quest helpers (local) ───────────────────────────────────
// TODO(slice-05): consolidate quest helpers to helpers.ts

function getQuest(state: ProjectState, name: string): Quest | undefined {
	return getJson<Quest>(state, `quests/${name}/quest.json`);
}

function setQuestJson(state: ProjectState, name: string, content: Quest): ProjectState {
	return setEntry(state, `quests/${name}/quest.json`, {
		type: "json",
		content,
	});
}

function guardQuestStatus(
	quest: Quest | undefined,
	questName: string,
	expected: QuestStatus | QuestStatus[],
	eventType: string,
): StateError | null {
	if (quest === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Quest "${questName}" not found`,
			detail: { quest: questName, event: eventType },
		};
	}
	const allowed: QuestStatus[] = Array.isArray(expected) ? expected : [expected];
	if (!allowed.includes(quest.status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot ${eventType} on quest "${questName}" in status "${quest.status}" (expected ${allowed.join(" or ")})`,
			detail: { quest: questName, event: eventType, currentStatus: quest.status },
		};
	}
	return null;
}

// ── Slice handlers ──────────────────────────────────────────

export function handleCompletePlan(
	state: ProjectState,
	event: CompletePlanEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.slice);
	const sliceOrErr = guardSliceStatus(slice, event.slice, "planning", "COMPLETE_PLAN");
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Guard: plan.md must exist
	if (!hasChild(state, `slices/${event.slice}`, "plan.md")) {
		return {
			code: "STATE_CONTENT_MISSING",
			message: `Cannot complete plan for slice "${event.slice}" — plan.md not found`,
			detail: { slice: event.slice, missing: "plan.md" },
		};
	}

	let tree = setSliceStatus(state, event.slice, sliceOrErr, "plan-created", event.ts);
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-plan",
		`slices/${event.slice}`,
		`Slice "${event.slice}" plan completed`,
	);
	return tree;
}

export function handleCompleteRefinementRound(
	state: ProjectState,
	event: CompleteRefinementRoundEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.slice);
	// Two valid from-statuses: plan-created (skip/first round) and refining (normal)
	const sliceOrErr = guardSliceStatus(
		slice,
		event.slice,
		["plan-created", "refining"],
		"COMPLETE_REFINEMENT_ROUND",
	);
	if (isStateError(sliceOrErr)) return sliceOrErr;

	const outcome = evaluateRefinement(sliceOrErr.refinement, {
		scores: event.scores,
		override: event.override,
	});

	if (outcome.action === "error") return outcome.error;

	if (outcome.action === "advance") {
		// Record final scores in refinement history if we have refinement state
		const finalRefinement =
			sliceOrErr.refinement !== null
				? {
						...sliceOrErr.refinement,
						scoreHistory: [
							...sliceOrErr.refinement.scoreHistory,
							{ round: sliceOrErr.refinement.round, scores: event.scores },
						],
					}
				: null;

		let tree = setSliceStatus(
			state,
			event.slice,
			{ ...sliceOrErr, refinement: finalRefinement },
			"plan-refined",
			event.ts,
		);
		tree = appendActivityLog(
			tree,
			event.ts,
			"complete-refinement",
			`slices/${event.slice}`,
			`Slice "${event.slice}" plan refined`,
		);
		return tree;
	}

	// Stay in refining
	let tree = setSliceStatus(
		state,
		event.slice,
		{ ...sliceOrErr, refinement: outcome.newRefinement },
		"refining",
		event.ts,
	);
	tree = appendActivityLog(
		tree,
		event.ts,
		"refinement-round",
		`slices/${event.slice}`,
		`Slice "${event.slice}" refinement round ${outcome.newRefinement.round - 1} completed`,
	);
	return tree;
}

export function handleCompleteImplementation(
	state: ProjectState,
	event: CompleteImplementationEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.slice);
	const sliceOrErr = guardSliceStatus(
		slice,
		event.slice,
		"implementing",
		"COMPLETE_IMPLEMENTATION",
	);
	if (isStateError(sliceOrErr)) return sliceOrErr;

	let tree = setSliceStatus(state, event.slice, sliceOrErr, "implementation-complete", event.ts);
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-implementation",
		`slices/${event.slice}`,
		`Slice "${event.slice}" implementation completed`,
	);
	return tree;
}

// ── Quest handlers ──────────────────────────────────────────

export function handleCompleteQuestPlan(
	state: ProjectState,
	event: CompleteQuestPlanEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	const err = guardQuestStatus(quest, event.quest, "planning", "COMPLETE_QUEST_PLAN");
	if (err !== null) return err;

	// Guard: plan.md must exist
	if (!hasChild(state, `quests/${event.quest}`, "plan.md")) {
		return {
			code: "STATE_CONTENT_MISSING",
			message: `Cannot complete plan for quest "${event.quest}" — plan.md not found`,
			detail: { quest: event.quest, missing: "plan.md" },
		};
	}

	let tree = setQuestJson(state, event.quest, {
		...quest!,
		status: "plan-created",
		updated: event.ts,
	});
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-quest-plan",
		`quests/${event.quest}`,
		`Quest "${event.quest}" plan completed`,
	);
	return tree;
}

export function handleCompleteQuestRefinementRound(
	state: ProjectState,
	event: CompleteQuestRefinementRoundEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	// Two valid from-statuses: plan-created (skip/first round) and refining (normal)
	const err = guardQuestStatus(
		quest,
		event.quest,
		["plan-created", "refining"],
		"COMPLETE_QUEST_REFINEMENT_ROUND",
	);
	if (err !== null) return err;

	const outcome = evaluateRefinement(quest!.refinement, {
		scores: event.scores,
		override: event.override,
	});

	if (outcome.action === "error") return outcome.error;

	if (outcome.action === "advance") {
		const finalRefinement =
			quest!.refinement !== null
				? {
						...quest!.refinement,
						scoreHistory: [
							...quest!.refinement.scoreHistory,
							{ round: quest!.refinement.round, scores: event.scores },
						],
					}
				: null;

		let tree = setQuestJson(state, event.quest, {
			...quest!,
			status: "plan-refined",
			updated: event.ts,
			refinement: finalRefinement,
		});
		tree = appendActivityLog(
			tree,
			event.ts,
			"complete-quest-refinement",
			`quests/${event.quest}`,
			`Quest "${event.quest}" plan refined`,
		);
		return tree;
	}

	// Stay in refining
	let tree = setQuestJson(state, event.quest, {
		...quest!,
		status: "refining",
		updated: event.ts,
		refinement: outcome.newRefinement,
	});
	tree = appendActivityLog(
		tree,
		event.ts,
		"quest-refinement-round",
		`quests/${event.quest}`,
		`Quest "${event.quest}" refinement round ${outcome.newRefinement.round - 1} completed`,
	);
	return tree;
}

export function handleCompleteQuestImplementation(
	state: ProjectState,
	event: CompleteQuestImplementationEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	const err = guardQuestStatus(quest, event.quest, "implementing", "COMPLETE_QUEST_IMPLEMENTATION");
	if (err !== null) return err;

	let tree = setQuestJson(state, event.quest, {
		...quest!,
		status: "implementation-complete",
		updated: event.ts,
	});
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-quest-implementation",
		`quests/${event.quest}`,
		`Quest "${event.quest}" implementation completed`,
	);
	return tree;
}

/** Transition table rows for slice submit handlers (I4: includes error rows) */
export const sliceSubmitTransitions: ReadonlyArray<{
	from: SliceStatus;
	event: StateEvent["type"];
	to: SliceStatus | "(error)";
}> = [
	{ from: "planning", event: "COMPLETE_PLAN", to: "plan-created" },
	{ from: "planning", event: "COMPLETE_PLAN", to: "(error)" },
	{ from: "plan-created", event: "COMPLETE_REFINEMENT_ROUND", to: "plan-refined" },
	{ from: "refining", event: "COMPLETE_REFINEMENT_ROUND", to: "refining" },
	{ from: "refining", event: "COMPLETE_REFINEMENT_ROUND", to: "plan-refined" },
	{ from: "refining", event: "COMPLETE_REFINEMENT_ROUND", to: "(error)" },
	{ from: "implementing", event: "COMPLETE_IMPLEMENTATION", to: "implementation-complete" },
] as const;

/** Transition table rows for quest submit handlers (I4: includes error rows) */
export const questSubmitTransitions: ReadonlyArray<{
	from: QuestStatus;
	event: StateEvent["type"];
	to: QuestStatus | "(error)";
}> = [
	{ from: "planning", event: "COMPLETE_QUEST_PLAN", to: "plan-created" },
	{ from: "planning", event: "COMPLETE_QUEST_PLAN", to: "(error)" },
	{ from: "plan-created", event: "COMPLETE_QUEST_REFINEMENT_ROUND", to: "plan-refined" },
	{ from: "refining", event: "COMPLETE_QUEST_REFINEMENT_ROUND", to: "refining" },
	{ from: "refining", event: "COMPLETE_QUEST_REFINEMENT_ROUND", to: "plan-refined" },
	{ from: "refining", event: "COMPLETE_QUEST_REFINEMENT_ROUND", to: "(error)" },
	{ from: "implementing", event: "COMPLETE_QUEST_IMPLEMENTATION", to: "implementation-complete" },
] as const;
