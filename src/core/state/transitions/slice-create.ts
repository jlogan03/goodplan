import type { Epic } from "../../../schemas/entities/epic.js";
import type { SliceStatus } from "../../../schemas/entities/slice.js";
/**
 * CREATE_SLICE transition handler.
 * Guard: slice name must not already exist in tree.
 * Apply: create slice.json in epics/<epic>/slices/<name>/, add to epic overview's slices array, append activity log.
 * Pure function, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { getJson, hasChild, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { addSliceToOverview, appendActivityLog, setEpicJson } from "./helpers.js";

type CreateSliceEvent = Extract<StateEvent, { type: "CREATE_SLICE" }>;

export function handleCreateSlice(
	state: ProjectState,
	event: CreateSliceEvent,
): ProjectState | StateError {
	// Guard: slice must not already exist within this epic
	if (hasChild(state, `epics/${event.epic}/slices`, event.name)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Slice "${event.name}" already exists`,
			detail: { slice: event.name },
		};
	}

	// Guard: parent epic must exist
	const epic = getJson<Epic>(state, `epics/${event.epic}/epic.json`);
	if (epic === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Epic "${event.epic}" not found — cannot create slice`,
			detail: { epic: event.epic, slice: event.name },
		};
	}

	const now = event.ts;
	let tree = state;

	// Create slice.json under nested path
	tree = setEntry(tree, `epics/${event.epic}/slices/${event.name}/slice.json`, {
		type: "json",
		content: {
			name: event.name,
			epic: event.epic,
			status: "created",
			goal: event.goal,
			deferred: [],
			refinement: null,
			created: now,
			updated: now,
		},
	});

	// Add slice to epic's embedded slices array in epics/overview.json
	tree = addSliceToOverview(tree, event.epic, {
		name: event.name,
		status: "created",
		created: now,
		completed: null,
	});

	// Update epic's updated timestamp
	tree = setEpicJson(tree, event.epic, {
		...epic,
		updated: now,
	});

	// Append activity log
	tree = appendActivityLog(
		tree,
		now,
		"create-slice",
		`epics/${event.epic}/slices/${event.name}`,
		`Slice "${event.name}" created for epic "${event.epic}"`,
	);

	return tree;
}

/** Transition table rows for CREATE_SLICE */
export const createSliceTransitions: ReadonlyArray<{
	from: "(none)";
	event: StateEvent["type"];
	to: SliceStatus;
}> = [{ from: "(none)", event: "CREATE_SLICE", to: "created" }] as const;
