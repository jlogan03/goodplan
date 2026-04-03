import type { SliceStatus } from "../../../schemas/entities/slice.js";
/**
 * BEGIN_REFINEMENT, BEGIN_IMPLEMENTATION, and UPDATE_IMPLEMENTATION_PHASE transition handlers.
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
	setSliceJson,
	setSliceStatus,
} from "./helpers.js";

type BeginRefinementEvent = Extract<StateEvent, { type: "BEGIN_REFINEMENT" }>;
type BeginImplementationEvent = Extract<StateEvent, { type: "BEGIN_IMPLEMENTATION" }>;
type UpdateImplementationPhaseEvent = Extract<StateEvent, { type: "UPDATE_IMPLEMENTATION_PHASE" }>;

export function handleBeginRefinement(
	state: ProjectState,
	event: BeginRefinementEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.epic, event.slice);
	const sliceOrErr = guardSliceStatus(
		slice,
		event.slice,
		"plan-created",
		"BEGIN_REFINEMENT",
		event.epic,
	);
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Initialize refinement state and set status + sync overview
	let tree = setSliceStatus(
		state,
		event.epic,
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
		`epics/${event.epic}/slices/${event.slice}`,
		`Slice "${event.slice}" refinement started`,
	);

	return tree;
}

export function handleBeginImplementation(
	state: ProjectState,
	event: BeginImplementationEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.epic, event.slice);
	const sliceOrErr = guardSliceStatus(
		slice,
		event.slice,
		"plan-refined",
		"BEGIN_IMPLEMENTATION",
		event.epic,
	);
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Guard: plan-refined.md must exist
	if (!hasChild(state, `epics/${event.epic}/slices/${event.slice}`, "plan-refined.md")) {
		return {
			code: "STATE_CONTENT_MISSING",
			message: `Cannot begin implementation for slice "${event.slice}" — plan-refined.md not found`,
			detail: { slice: event.slice, missing: "plan-refined.md" },
		};
	}

	// Set status to implementing, initialize implementationPhase to 0 + sync overview
	let tree = setSliceStatus(
		state,
		event.epic,
		event.slice,
		{ ...sliceOrErr, implementationPhase: 0 },
		"implementing",
		event.ts,
	);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-implementation",
		`epics/${event.epic}/slices/${event.slice}`,
		`Slice "${event.slice}" implementation started`,
	);

	return tree;
}

export function handleUpdateImplementationPhase(
	state: ProjectState,
	event: UpdateImplementationPhaseEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.epic, event.slice);
	const sliceOrErr = guardSliceStatus(
		slice,
		event.slice,
		"implementing",
		"UPDATE_IMPLEMENTATION_PHASE",
		event.epic,
	);
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Guard: monotonic — new phase must be >= current implementationPhase
	const current = sliceOrErr.implementationPhase ?? 0;
	if (event.phase < current) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot set implementationPhase to ${event.phase} — current is ${current} (must be monotonically increasing)`,
			detail: {
				slice: event.slice,
				epic: event.epic,
				currentPhase: current,
				requestedPhase: event.phase,
			},
		};
	}

	let tree = setSliceJson(state, event.epic, event.slice, {
		...sliceOrErr,
		implementationPhase: event.phase,
		updated: event.ts,
	});

	tree = appendActivityLog(
		tree,
		event.ts,
		"update-implementation-phase",
		`epics/${event.epic}/slices/${event.slice}`,
		`Slice "${event.slice}" implementation phase updated to ${event.phase}`,
	);

	return tree;
}

/** Transition table rows for BEGIN_REFINEMENT, BEGIN_IMPLEMENTATION, and UPDATE_IMPLEMENTATION_PHASE */
export const sliceImplementTransitions: ReadonlyArray<{
	from: SliceStatus;
	event: StateEvent["type"];
	to: SliceStatus | "(error)";
}> = [
	{ from: "plan-created", event: "BEGIN_REFINEMENT", to: "refining" },
	{ from: "plan-refined", event: "BEGIN_IMPLEMENTATION", to: "implementing" },
	{ from: "plan-refined", event: "BEGIN_IMPLEMENTATION", to: "(error)" },
	{ from: "implementing", event: "UPDATE_IMPLEMENTATION_PHASE", to: "implementing" },
	{ from: "implementing", event: "UPDATE_IMPLEMENTATION_PHASE", to: "(error)" },
] as const;
