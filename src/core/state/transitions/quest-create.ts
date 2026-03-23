import type { Overview } from "../../../schemas/entities/overview.js";
import type { QuestStatus } from "../../../schemas/entities/quest.js";
/**
 * CREATE_QUEST transition handler.
 * Guard: quest name must not already exist in tree.
 * Apply: create quest.json, update quests/overview.json, append activity log.
 * Pure function, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { getJson, hasChild, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { appendActivityLog } from "./helpers.js";

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

	// Guard: quests/overview.json must exist (init.ts creates it unconditionally)
	const overview = getJson<Overview>(state, "quests/overview.json");
	if (overview === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: "quests/overview.json not found — is the project initialized?",
		};
	}

	const now = event.ts;
	let tree = state;

	// Create quest.json
	tree = setEntry(tree, `quests/${event.name}/quest.json`, {
		type: "json",
		content: {
			name: event.name,
			status: "created",
			goal: event.goal,
			refinement: null,
			created: now,
			updated: now,
		},
	});

	// Update quests/overview.json — no epic field (quests are project-scoped)
	tree = setEntry(tree, "quests/overview.json", {
		type: "json",
		content: {
			items: [
				...overview.items,
				{ name: event.name, status: "created", created: now, completed: null },
			],
		},
	});

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
