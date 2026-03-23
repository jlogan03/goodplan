import type { QuestStatus } from "../../../schemas/entities/quest.js";
/**
 * ABANDON_QUEST transition handler.
 * Guard: status must be non-terminal (not completed, not abandoned).
 * Apply: set abandoned, record reason, sync overview, clear activeQuest if active.
 * Pure function, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import {
	appendActivityLog,
	getProject,
	getQuest,
	isQuestTerminal,
	setQuestStatus,
} from "./helpers.js";

type AbandonQuestEvent = Extract<StateEvent, { type: "ABANDON_QUEST" }>;

export function handleAbandonQuest(
	state: ProjectState,
	event: AbandonQuestEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	if (quest === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Quest "${event.quest}" not found`,
			detail: { quest: event.quest, event: "ABANDON_QUEST" },
		};
	}

	// Guard: must not be in a terminal state
	if (isQuestTerminal(quest.status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot abandon quest "${event.quest}" in terminal status "${quest.status}"`,
			detail: { quest: event.quest, event: "ABANDON_QUEST", currentStatus: quest.status },
		};
	}

	let tree = state;

	// Set status to abandoned + sync overview
	tree = setQuestStatus(tree, event.quest, quest, "abandoned", event.ts);

	// Clear activeQuest if this was the active quest
	const project = getProject(tree);
	if (project !== undefined && project.activeQuest === event.quest) {
		tree = setEntry(tree, "project.json", {
			type: "json",
			content: { ...project, activeQuest: null, updated: event.ts },
		});
	}

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"abandon-quest",
		`quests/${event.quest}`,
		`Quest "${event.quest}" abandoned: ${event.reason}`,
	);

	return tree;
}

/** Transition table rows for ABANDON_QUEST */
export const abandonQuestTransitions: ReadonlyArray<{
	from: QuestStatus | "* (non-terminal)" | "* (terminal)";
	event: StateEvent["type"];
	to: QuestStatus | "(error)";
}> = [
	{ from: "* (non-terminal)", event: "ABANDON_QUEST", to: "abandoned" },
	{ from: "* (terminal)", event: "ABANDON_QUEST", to: "(error)" },
] as const;
