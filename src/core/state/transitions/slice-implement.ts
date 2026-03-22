import type { SliceStatus } from "../../../schemas/entities/slice.js";
/**
 * BEGIN_REFINEMENT and BEGIN_IMPLEMENTATION transition handlers.
 * Pure functions, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { hasChild } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	MAX_REFINEMENT_ROUNDS,
	appendActivityLog,
	getSlice,
	guardSliceStatus,
	setSliceStatus,
} from "./helpers.js";

type BeginRefinementEvent = Extract<StateEvent, { type: "BEGIN_REFINEMENT" }>;
type BeginImplementationEvent = Extract<StateEvent, { type: "BEGIN_IMPLEMENTATION" }>;

export function handleBeginRefinement(
	state: ProjectState,
	event: BeginRefinementEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.slice);
	const sliceOrErr = guardSliceStatus(slice, event.slice, "plan-created", "BEGIN_REFINEMENT");
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Initialize refinement state and set status + sync overview
	let tree = setSliceStatus(
		state,
		event.slice,
		{
			...sliceOrErr,
			refinement: { round: 1, maxRounds: MAX_REFINEMENT_ROUNDS, scoreHistory: [] },
		},
		"refining",
		event.ts,
	);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-refinement",
		`slices/${event.slice}`,
		`Slice "${event.slice}" refinement started`,
	);

	return tree;
}

export function handleBeginImplementation(
	state: ProjectState,
	event: BeginImplementationEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.slice);
	const sliceOrErr = guardSliceStatus(slice, event.slice, "plan-refined", "BEGIN_IMPLEMENTATION");
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Guard: plan-refined.md must exist
	if (!hasChild(state, `slices/${event.slice}`, "plan-refined.md")) {
		return {
			code: "STATE_CONTENT_MISSING",
			message: `Cannot begin implementation for slice "${event.slice}" — plan-refined.md not found`,
			detail: { slice: event.slice, missing: "plan-refined.md" },
		};
	}

	// Set status to implementing + sync overview
	let tree = setSliceStatus(state, event.slice, sliceOrErr, "implementing", event.ts);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-implementation",
		`slices/${event.slice}`,
		`Slice "${event.slice}" implementation started`,
	);

	return tree;
}

/** Transition table rows for BEGIN_REFINEMENT and BEGIN_IMPLEMENTATION */
export const sliceImplementTransitions: ReadonlyArray<{
	from: SliceStatus;
	event: StateEvent["type"];
	to: SliceStatus | "(error)";
}> = [
	{ from: "plan-created", event: "BEGIN_REFINEMENT", to: "refining" },
	{ from: "plan-refined", event: "BEGIN_IMPLEMENTATION", to: "implementing" },
	{ from: "plan-refined", event: "BEGIN_IMPLEMENTATION", to: "(error)" },
] as const;
