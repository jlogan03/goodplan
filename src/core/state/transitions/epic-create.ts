/**
 * CREATE_EPIC transition handler.
 * Guard: epic name must not already exist in tree.
 * Apply: create epic.json, subdirectories, update overview, append activity log.
 */
import type { ProjectState } from "../../tree.js";
import { getJson, hasChild, setEntry } from "../../tree.js";
import type { StateEvent, StateError } from "../types.js";
import type { EpicStatus } from "../../../schemas/entities/epic.js";
import type { Overview } from "../../../schemas/entities/overview.js";
import { appendActivityLog } from "./helpers.js";

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
		content: {
			name: event.name,
			status: "created",
			goal: event.goal,
			verifications: [],
			refinement: null,
			sliceSequence: [],
			created: now,
			activated: null,
			updated: now,
		},
	});

	// Create subdirectories
	tree = setEntry(tree, `epics/${event.name}/architecture`, {
		type: "directory",
		contents: {},
	});
	tree = setEntry(tree, `epics/${event.name}/research`, {
		type: "directory",
		contents: {},
	});
	tree = setEntry(tree, `epics/${event.name}/brainstorm`, {
		type: "directory",
		contents: {},
	});
	tree = setEntry(tree, `epics/${event.name}/prototypes`, {
		type: "directory",
		contents: {},
	});

	// Update overview
	const overview = getJson<Overview>(tree, "epics/overview.json");
	if (overview === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: "epics/overview.json not found — is the project initialized?",
		};
	}
	tree = setEntry(tree, "epics/overview.json", {
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
}> = [
	{ from: "(none)", event: "CREATE_EPIC", to: "created" },
] as const;
