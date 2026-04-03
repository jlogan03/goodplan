import type { QuestStatus } from "../../../schemas/entities/quest.js";
/**
 * BEGIN_QUEST_EXPLORE and COMPLETE_QUEST_EXPLORE transition handlers.
 * Pure functions, no I/O.
 *
 * Note: BEGIN_QUEST_EXPLORE does NOT set activeQuest (following the epic pattern
 * where BEGIN_EXPLORE does not set activeEpic). This allows other quests to
 * remain accessible during a potentially long explore phase.
 */
import type { ProjectState } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import { appendActivityLog, getQuest, guardQuestStatus, setQuestStatus } from "./helpers.js";

type BeginQuestExploreEvent = Extract<StateEvent, { type: "BEGIN_QUEST_EXPLORE" }>;
type CompleteQuestExploreEvent = Extract<StateEvent, { type: "COMPLETE_QUEST_EXPLORE" }>;

export function handleBeginQuestExplore(
	state: ProjectState,
	event: BeginQuestExploreEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	const questOrErr = guardQuestStatus(quest, event.quest, "created", "BEGIN_QUEST_EXPLORE");
	if (isStateError(questOrErr)) return questOrErr;

	// Set status to exploring + sync overview (no activeQuest change)
	let tree = setQuestStatus(state, event.quest, questOrErr, "exploring", event.ts);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-quest-explore",
		`quests/${event.quest}`,
		`Quest "${event.quest}" exploration started`,
	);

	return tree;
}

export function handleCompleteQuestExplore(
	state: ProjectState,
	event: CompleteQuestExploreEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	// Two valid from-statuses: created (skip path) and exploring (normal path)
	const questOrErr = guardQuestStatus(
		quest,
		event.quest,
		["created", "exploring"],
		"COMPLETE_QUEST_EXPLORE",
	);
	if (isStateError(questOrErr)) return questOrErr;

	// Set status to explored + sync overview
	let tree = setQuestStatus(state, event.quest, questOrErr, "explored", event.ts);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-quest-explore",
		`quests/${event.quest}`,
		`Quest "${event.quest}" exploration completed`,
	);

	return tree;
}

/** Transition table rows for BEGIN_QUEST_EXPLORE and COMPLETE_QUEST_EXPLORE */
export const questExploreTransitions: ReadonlyArray<{
	from: QuestStatus;
	event: StateEvent["type"];
	to: QuestStatus | "(error)";
}> = [
	{ from: "created", event: "BEGIN_QUEST_EXPLORE", to: "exploring" },
	{ from: "created", event: "BEGIN_QUEST_EXPLORE", to: "(error)" },
	{ from: "created", event: "COMPLETE_QUEST_EXPLORE", to: "explored" },
	{ from: "created", event: "COMPLETE_QUEST_EXPLORE", to: "(error)" },
	{ from: "exploring", event: "COMPLETE_QUEST_EXPLORE", to: "explored" },
	{ from: "exploring", event: "COMPLETE_QUEST_EXPLORE", to: "(error)" },
] as const;
