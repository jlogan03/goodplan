import type { SliceStatus } from "../../../schemas/entities/slice.js";
/**
 * ABANDON_SLICE transition handler.
 * Guard: status must be non-terminal (not completed, not abandoned).
 * Apply: set abandoned, record reason, sync overview, clear activeSlice if active.
 * Pure function, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import {
	appendActivityLog,
	getProject,
	getSlice,
	isSliceTerminal,
	setSliceStatus,
} from "./helpers.js";

type AbandonSliceEvent = Extract<StateEvent, { type: "ABANDON_SLICE" }>;

export function handleAbandonSlice(
	state: ProjectState,
	event: AbandonSliceEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.slice);
	if (slice === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Slice "${event.slice}" not found`,
			detail: { slice: event.slice, event: "ABANDON_SLICE" },
		};
	}

	// Guard: must not be in a terminal state
	if (isSliceTerminal(slice.status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot abandon slice "${event.slice}" in terminal status "${slice.status}"`,
			detail: { slice: event.slice, event: "ABANDON_SLICE", currentStatus: slice.status },
		};
	}

	let tree = state;

	// Set status to abandoned + sync overview
	tree = setSliceStatus(tree, event.slice, slice, "abandoned", event.ts);

	// Clear activeSlice if this was the active slice
	const project = getProject(tree);
	if (project !== undefined && project.activeSlice === event.slice) {
		tree = setEntry(tree, "project.json", {
			type: "json",
			content: { ...project, activeSlice: null, updated: event.ts },
		});
	}

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"abandon-slice",
		`slices/${event.slice}`,
		`Slice "${event.slice}" abandoned: ${event.reason}`,
	);

	return tree;
}

/** Transition table rows for ABANDON_SLICE */
export const abandonSliceTransitions: ReadonlyArray<{
	from: SliceStatus | "* (non-terminal)" | "* (terminal)";
	event: StateEvent["type"];
	to: SliceStatus | "(error)";
}> = [
	{ from: "* (non-terminal)", event: "ABANDON_SLICE", to: "abandoned" },
	{ from: "* (terminal)", event: "ABANDON_SLICE", to: "(error)" },
] as const;
