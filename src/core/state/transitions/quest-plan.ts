import type { QuestStatus } from "../../../schemas/entities/quest.js";
/**
 * BEGIN_QUEST_PLAN transition handler.
 * Guard: activeQuest == null — reject if another quest is already active.
 * Apply: set activeQuest in project.json, set quest status to planning, append activity log.
 * Pure function, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	appendActivityLog,
	getProject,
	getQuest,
	guardQuestStatus,
	setQuestStatus,
} from "./helpers.js";

type BeginQuestPlanEvent = Extract<StateEvent, { type: "BEGIN_QUEST_PLAN" }>;

export function handleBeginQuestPlan(
	state: ProjectState,
	event: BeginQuestPlanEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	const questOrErr = guardQuestStatus(quest, event.quest, ["created", "explored"], "BEGIN_QUEST_PLAN");
	if (isStateError(questOrErr)) return questOrErr;

	// Guard: no other quest is currently active
	const project = getProject(state);
	if (project !== undefined && project.activeQuest !== null) {
		return {
			code: "STATE_QUEST_ALREADY_ACTIVE",
			message: `Cannot begin planning quest "${event.quest}" — quest "${project.activeQuest}" is already active. Complete or abandon it first.`,
			detail: {
				quest: event.quest,
				activeQuest: project.activeQuest,
			},
		};
	}

	let tree = state;

	// Set activeQuest in project.json
	if (project !== undefined) {
		tree = setEntry(tree, "project.json", {
			type: "json",
			content: { ...project, activeQuest: event.quest, updated: event.ts },
		});
	}

	// Set status to planning + sync overview
	tree = setQuestStatus(tree, event.quest, questOrErr, "planning", event.ts);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-quest-plan",
		`quests/${event.quest}`,
		`Quest "${event.quest}" planning started`,
	);

	return tree;
}

/** Transition table rows for BEGIN_QUEST_PLAN */
export const beginQuestPlanTransitions: ReadonlyArray<{
	from: QuestStatus;
	event: StateEvent["type"];
	to: QuestStatus | "(error)";
}> = [
	{ from: "created", event: "BEGIN_QUEST_PLAN", to: "planning" },
	{ from: "created", event: "BEGIN_QUEST_PLAN", to: "(error)" },
	{ from: "explored", event: "BEGIN_QUEST_PLAN", to: "planning" },
	{ from: "explored", event: "BEGIN_QUEST_PLAN", to: "(error)" },
] as const;
