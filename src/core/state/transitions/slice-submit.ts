import type { QuestStatus } from "../../../schemas/entities/quest.js";
import type { SliceStatus } from "../../../schemas/entities/slice.js";
/**
 * Slice and quest submit handlers: COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND,
 * COMPLETE_IMPLEMENTATION + quest variants.
 * Pure functions, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { hasChild } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	appendActivityLog,
	evaluateRefinement,
	getQuest,
	getSlice,
	guardQuestStatus,
	guardSliceStatus,
	setQuestStatus,
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

// ── Slice handlers ──────────────────────────────────────────

export function handleCompletePlan(
	state: ProjectState,
	event: CompletePlanEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.epic, event.slice);
	const sliceOrErr = guardSliceStatus(slice, event.slice, "planning", "COMPLETE_PLAN", event.epic);
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Guard: plan.md must exist
	if (!hasChild(state, `epics/${event.epic}/slices/${event.slice}`, "plan.md")) {
		return {
			code: "STATE_CONTENT_MISSING",
			message: `Cannot complete plan for slice "${event.slice}" — plan.md not found`,
			detail: { slice: event.slice, missing: "plan.md" },
		};
	}

	let tree = setSliceStatus(state, event.epic, event.slice, sliceOrErr, "plan-created", event.ts);
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-plan",
		`epics/${event.epic}/slices/${event.slice}`,
		`Slice "${event.slice}" plan completed`,
	);
	return tree;
}

export function handleCompleteRefinementRound(
	state: ProjectState,
	event: CompleteRefinementRoundEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.epic, event.slice);
	// Two valid from-statuses: plan-created (skip/first round) and refining (normal)
	const sliceOrErr = guardSliceStatus(
		slice,
		event.slice,
		["plan-created", "refining"],
		"COMPLETE_REFINEMENT_ROUND",
		event.epic,
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
			event.epic,
			event.slice,
			{ ...sliceOrErr, refinement: finalRefinement },
			"plan-refined",
			event.ts,
		);
		tree = appendActivityLog(
			tree,
			event.ts,
			"complete-refinement",
			`epics/${event.epic}/slices/${event.slice}`,
			`Slice "${event.slice}" plan refined`,
		);
		return tree;
	}

	// Stay in refining
	let tree = setSliceStatus(
		state,
		event.epic,
		event.slice,
		{ ...sliceOrErr, refinement: outcome.newRefinement },
		"refining",
		event.ts,
	);
	tree = appendActivityLog(
		tree,
		event.ts,
		"refinement-round",
		`epics/${event.epic}/slices/${event.slice}`,
		`Slice "${event.slice}" refinement round ${outcome.newRefinement.round - 1} completed`,
	);
	return tree;
}

export function handleCompleteImplementation(
	state: ProjectState,
	event: CompleteImplementationEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.epic, event.slice);
	const sliceOrErr = guardSliceStatus(
		slice,
		event.slice,
		"implementing",
		"COMPLETE_IMPLEMENTATION",
		event.epic,
	);
	if (isStateError(sliceOrErr)) return sliceOrErr;

	let tree = setSliceStatus(
		state,
		event.epic,
		event.slice,
		sliceOrErr,
		"implementation-complete",
		event.ts,
	);
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-implementation",
		`epics/${event.epic}/slices/${event.slice}`,
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
	const questOrErr = guardQuestStatus(quest, event.quest, "planning", "COMPLETE_QUEST_PLAN");
	if (isStateError(questOrErr)) return questOrErr;

	// Guard: plan.md must exist
	if (!hasChild(state, `quests/${event.quest}`, "plan.md")) {
		return {
			code: "STATE_CONTENT_MISSING",
			message: `Cannot complete plan for quest "${event.quest}" — plan.md not found`,
			detail: { quest: event.quest, missing: "plan.md" },
		};
	}

	let tree = setQuestStatus(state, event.quest, questOrErr, "plan-created", event.ts);
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
	const questOrErr = guardQuestStatus(
		quest,
		event.quest,
		["plan-created", "refining"],
		"COMPLETE_QUEST_REFINEMENT_ROUND",
	);
	if (isStateError(questOrErr)) return questOrErr;

	const outcome = evaluateRefinement(questOrErr.refinement, {
		scores: event.scores,
		override: event.override,
	});

	if (outcome.action === "error") return outcome.error;

	if (outcome.action === "advance") {
		const finalRefinement =
			questOrErr.refinement !== null
				? {
						...questOrErr.refinement,
						scoreHistory: [
							...questOrErr.refinement.scoreHistory,
							{ round: questOrErr.refinement.round, scores: event.scores },
						],
					}
				: null;

		let tree = setQuestStatus(
			state,
			event.quest,
			{ ...questOrErr, refinement: finalRefinement },
			"plan-refined",
			event.ts,
		);
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
	let tree = setQuestStatus(
		state,
		event.quest,
		{ ...questOrErr, refinement: outcome.newRefinement },
		"refining",
		event.ts,
	);
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
	const questOrErr = guardQuestStatus(
		quest,
		event.quest,
		"implementing",
		"COMPLETE_QUEST_IMPLEMENTATION",
	);
	if (isStateError(questOrErr)) return questOrErr;

	let tree = setQuestStatus(state, event.quest, questOrErr, "implementation-complete", event.ts);
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
