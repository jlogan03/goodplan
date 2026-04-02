import type { EpicStatus } from "../../../schemas/entities/epic.js";
/**
 * CREATE_EPIC transition handler.
 * Guard: epic name must not already exist in tree.
 * Apply: create epic.json, subdirectories, update overview, append activity log.
 */
import type { ProjectState } from "../../tree.js";
import { getJson, hasChild, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { addEpicToOverview, appendActivityLog, buildInitialEpicJson, createEpicSubdirectories } from "./helpers.js";

type CreateEpicEvent = Extract<StateEvent, { type: "CREATE_EPIC" }>;

export function handleCreateEpic(
	state: ProjectState,
	event: CreateEpicEvent,
): ProjectState | StateError {
	// Guard: epic must not already exist
	if (hasChild(state, "epics", event.name)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Epic "${event.name}" already exists`,
			detail: { epic: event.name },
		};
	}

	const now = event.ts;
	let tree = state;

	// Create epic.json
	tree = setEntry(tree, `epics/${event.name}/epic.json`, {
		type: "json",
		content: buildInitialEpicJson(event.name, event.goal, now),
	});

	// Create subdirectories
	tree = createEpicSubdirectories(tree, event.name);

	// Guard: overview must exist
	if (getJson(tree, "overview.json") === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: "overview.json not found — is the project initialized?",
		};
	}

	// Update overview (includes slices: [] for epic overview item)
	tree = addEpicToOverview(tree, event.name, "created", now);

	// Append activity log
	tree = appendActivityLog(
		tree,
		now,
		"create-epic",
		`epics/${event.name}`,
		`Epic "${event.name}" created`,
	);

	return tree;
}

/** Transition table rows for CREATE_EPIC */
export const createEpicTransitions: ReadonlyArray<{
	from: "(none)";
	event: StateEvent["type"];
	to: EpicStatus;
}> = [{ from: "(none)", event: "CREATE_EPIC", to: "created" }] as const;
