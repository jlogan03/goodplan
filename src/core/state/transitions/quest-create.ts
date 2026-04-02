import type { UnifiedOverview } from "../../../schemas/entities/overview.js";
import type { QuestStatus } from "../../../schemas/entities/quest.js";
/**
 * CREATE_QUEST transition handler.
 * Guard: quest name must not already exist in tree.
 * Apply: create quest.json, update overview.json, append activity log.
 * Pure function, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { getJson, hasChild, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { addQuestToOverview, appendActivityLog, buildInitialQuestJson } from "./helpers.js";

type CreateQuestEvent = Extract<StateEvent, { type: "CREATE_QUEST" }>;

export function handleCreateQuest(
	state: ProjectState,
	event: CreateQuestEvent,
): ProjectState | StateError {
	// Guard: quest must not already exist
	if (hasChild(state, "quests", event.name)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Quest "${event.name}" already exists`,
			detail: { quest: event.name },
		};
	}

	// Guard: overview.json must exist (init.ts creates it unconditionally)
	const overview = getJson<UnifiedOverview>(state, "overview.json");
	if (overview === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: "overview.json not found — is the project initialized?",
		};
	}

	const now = event.ts;
	let tree = state;

	// Create quest.json
	tree = setEntry(tree, `quests/${event.name}/quest.json`, {
		type: "json",
		content: buildInitialQuestJson(event.name, event.goal, now),
	});

	// Update overview.json — no epic field (quests are project-scoped)
	tree = addQuestToOverview(tree, event.name, "created", now);

	// Append activity log
	tree = appendActivityLog(
		tree,
		now,
		"create-quest",
		`quests/${event.name}`,
		`Quest "${event.name}" created`,
	);

	return tree;
}

/** Transition table rows for CREATE_QUEST */
export const createQuestTransitions: ReadonlyArray<{
	from: "(none)";
	event: StateEvent["type"];
	to: QuestStatus;
}> = [{ from: "(none)", event: "CREATE_QUEST", to: "created" }] as const;
