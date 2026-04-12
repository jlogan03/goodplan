import type { QuestStatus } from "../../../schemas/entities/quest.js";
/**
 * BEGIN_QUEST_REFINEMENT and BEGIN_QUEST_IMPLEMENTATION transition handlers.
 * Pure functions, no I/O.
 *
 * Note: activeQuest is NOT set here — it was already set by BEGIN_QUEST_PLAN.
 * These transitions happen within an already-active quest (consistent with
 * the slice pattern and transition tables).
 */
import type { ProjectState } from "../../tree.js";
import { hasChild } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	MAX_REFINEMENT_ROUNDS,
	appendActivityLog,
	getQuest,
	guardQuestStatus,
	setQuestStatus,
} from "./helpers.js";

type BeginQuestRefinementEvent = Extract<StateEvent, { type: "BEGIN_QUEST_REFINEMENT" }>;
type BeginQuestImplementationEvent = Extract<StateEvent, { type: "BEGIN_QUEST_IMPLEMENTATION" }>;

export function handleBeginQuestRefinement(
	state: ProjectState,
	event: BeginQuestRefinementEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	const questOrErr = guardQuestStatus(quest, event.quest, "plan-created", "BEGIN_QUEST_REFINEMENT");
	if (isStateError(questOrErr)) return questOrErr;

	// Initialize refinement state and set status + sync overview
	let tree = setQuestStatus(
		state,
		event.quest,
		{
			...questOrErr,
			refinement: { round: 1, maxRounds: MAX_REFINEMENT_ROUNDS, scoreHistory: [] },
		},
		"refining",
		event.ts,
	);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-quest-refinement",
		`quests/${event.quest}`,
		`Quest "${event.quest}" refinement started`,
	);

	return tree;
}

export function handleBeginQuestImplementation(
	state: ProjectState,
	event: BeginQuestImplementationEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	const questOrErr = guardQuestStatus(
		quest,
		event.quest,
		"plan-refined",
		"BEGIN_QUEST_IMPLEMENTATION",
	);
	if (isStateError(questOrErr)) return questOrErr;

	// Guard: plan-refined.md must exist
	if (!hasChild(state, `quests/${event.quest}`, "plan-refined.md")) {
		return {
			code: "STATE_CONTENT_MISSING",
			message: `Cannot begin implementation for quest "${event.quest}" — plan-refined.md not found`,
			detail: { quest: event.quest, missing: "plan-refined.md" },
		};
	}

	// Set status to implementing + sync overview
	let tree = setQuestStatus(state, event.quest, questOrErr, "implementing", event.ts);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-quest-implementation",
		`quests/${event.quest}`,
		`Quest "${event.quest}" implementation started`,
	);

	return tree;
}

/** Transition table rows for BEGIN_QUEST_REFINEMENT and BEGIN_QUEST_IMPLEMENTATION */
export const questImplementTransitions: ReadonlyArray<{
	from: QuestStatus;
	event: StateEvent["type"];
	to: QuestStatus | "(error)";
}> = [
	{ from: "plan-created", event: "BEGIN_QUEST_REFINEMENT", to: "refining" },
	{ from: "plan-refined", event: "BEGIN_QUEST_IMPLEMENTATION", to: "implementing" },
	{ from: "plan-refined", event: "BEGIN_QUEST_IMPLEMENTATION", to: "(error)" },
] as const;
