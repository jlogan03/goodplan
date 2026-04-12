import type { EpicStatus } from "../../../schemas/entities/epic.js";
/**
 * Epic phase transition handlers: BEGIN/COMPLETE for explore→architecture→slicing chain.
 * Pure functions, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	MAX_REFINEMENT_ROUNDS,
	appendActivityLog,
	getEpic,
	guardEpicStatus,
	setEpicStatus,
	updateOverviewStatus,
} from "./helpers.js";

type BeginExploreEvent = Extract<StateEvent, { type: "BEGIN_EXPLORE" }>;
type CompleteExploreEvent = Extract<StateEvent, { type: "COMPLETE_EXPLORE" }>;
type BeginArchitectureEvent = Extract<StateEvent, { type: "BEGIN_ARCHITECTURE" }>;
type CompleteArchitectureEvent = Extract<StateEvent, { type: "COMPLETE_ARCHITECTURE" }>;
type BeginRefineArchitectureEvent = Extract<StateEvent, { type: "BEGIN_REFINE_ARCHITECTURE" }>;
type BeginSlicingEvent = Extract<StateEvent, { type: "BEGIN_SLICING" }>;
type CompleteSlicingEvent = Extract<StateEvent, { type: "COMPLETE_SLICING" }>;
type BeginRefineSlicesEvent = Extract<StateEvent, { type: "BEGIN_REFINE_SLICES" }>;

// ── Handlers ────────────────────────────────────────────────

export function handleBeginExplore(
	state: ProjectState,
	event: BeginExploreEvent,
): ProjectState | StateError {
	const result = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		"created",
		"BEGIN_EXPLORE",
	);
	if (isStateError(result)) return result;

	let tree = setEpicStatus(state, event.epic, result, "exploring", event.ts);
	tree = updateOverviewStatus(tree, event.epic, "exploring");
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-explore",
		`epics/${event.epic}`,
		`Epic "${event.epic}" exploration started`,
	);
	return tree;
}

export function handleCompleteExplore(
	state: ProjectState,
	event: CompleteExploreEvent,
): ProjectState | StateError {
	// Two valid from-statuses: created (skip path) and exploring (normal path)
	const result = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		["created", "exploring"],
		"COMPLETE_EXPLORE",
	);
	if (isStateError(result)) return result;

	let tree = setEpicStatus(state, event.epic, result, "explored", event.ts);
	tree = updateOverviewStatus(tree, event.epic, "explored");
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-explore",
		`epics/${event.epic}`,
		`Epic "${event.epic}" exploration completed`,
	);
	return tree;
}

export function handleBeginArchitecture(
	state: ProjectState,
	event: BeginArchitectureEvent,
): ProjectState | StateError {
	const result = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		"explored",
		"BEGIN_ARCHITECTURE",
	);
	if (isStateError(result)) return result;

	let tree = setEpicStatus(state, event.epic, result, "defining-architecture", event.ts);
	tree = updateOverviewStatus(tree, event.epic, "defining-architecture");
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-architecture",
		`epics/${event.epic}`,
		`Epic "${event.epic}" architecture definition started`,
	);
	return tree;
}

export function handleCompleteArchitecture(
	state: ProjectState,
	event: CompleteArchitectureEvent,
): ProjectState | StateError {
	// Two valid from-statuses: explored (skip path) and defining-architecture (normal path)
	const result = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		["explored", "defining-architecture"],
		"COMPLETE_ARCHITECTURE",
	);
	if (isStateError(result)) return result;

	let tree = setEpicStatus(state, event.epic, result, "architecture-defined", event.ts);
	tree = updateOverviewStatus(tree, event.epic, "architecture-defined");
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-architecture",
		`epics/${event.epic}`,
		`Epic "${event.epic}" architecture defined`,
	);
	return tree;
}

export function handleBeginRefineArchitecture(
	state: ProjectState,
	event: BeginRefineArchitectureEvent,
): ProjectState | StateError {
	const result = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		"architecture-defined",
		"BEGIN_REFINE_ARCHITECTURE",
	);
	if (isStateError(result)) return result;

	// Initialize refinement state
	let tree = setEntry(state, `epics/${event.epic}/epic.json`, {
		type: "json",
		content: {
			...result,
			status: "refining-architecture" as const,
			updated: event.ts,
			refinement: { round: 1, maxRounds: MAX_REFINEMENT_ROUNDS, scoreHistory: [] },
		},
	});
	tree = updateOverviewStatus(tree, event.epic, "refining-architecture");
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-refine-architecture",
		`epics/${event.epic}`,
		`Epic "${event.epic}" architecture refinement started`,
	);
	return tree;
}

export function handleBeginSlicing(
	state: ProjectState,
	event: BeginSlicingEvent,
): ProjectState | StateError {
	const result = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		"architecture-refined",
		"BEGIN_SLICING",
	);
	if (isStateError(result)) return result;

	let tree = setEpicStatus(state, event.epic, result, "defining-slices", event.ts);
	tree = updateOverviewStatus(tree, event.epic, "defining-slices");
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-slicing",
		`epics/${event.epic}`,
		`Epic "${event.epic}" slice definition started`,
	);
	return tree;
}

export function handleCompleteSlicing(
	state: ProjectState,
	event: CompleteSlicingEvent,
): ProjectState | StateError {
	const result = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		"defining-slices",
		"COMPLETE_SLICING",
	);
	if (isStateError(result)) return result;

	let tree = setEpicStatus(state, event.epic, result, "slices-defined", event.ts);
	tree = updateOverviewStatus(tree, event.epic, "slices-defined");
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-slicing",
		`epics/${event.epic}`,
		`Epic "${event.epic}" slices defined`,
	);
	return tree;
}

export function handleBeginRefineSlices(
	state: ProjectState,
	event: BeginRefineSlicesEvent,
): ProjectState | StateError {
	const result = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		"slices-defined",
		"BEGIN_REFINE_SLICES",
	);
	if (isStateError(result)) return result;

	// Initialize refinement state
	let tree = setEntry(state, `epics/${event.epic}/epic.json`, {
		type: "json",
		content: {
			...result,
			status: "refining-slices" as const,
			updated: event.ts,
			refinement: { round: 1, maxRounds: MAX_REFINEMENT_ROUNDS, scoreHistory: [] },
		},
	});
	tree = updateOverviewStatus(tree, event.epic, "refining-slices");
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-refine-slices",
		`epics/${event.epic}`,
		`Epic "${event.epic}" slice refinement started`,
	);
	return tree;
}

/** Transition table rows for epic phase handlers */
export const epicPhaseTransitions: ReadonlyArray<{
	from: EpicStatus | "(none)";
	event: StateEvent["type"];
	to: EpicStatus | "(same)" | "(error)";
}> = [
	{ from: "created", event: "BEGIN_EXPLORE", to: "exploring" },
	{ from: "created", event: "COMPLETE_EXPLORE", to: "explored" },
	{ from: "exploring", event: "COMPLETE_EXPLORE", to: "explored" },
	{ from: "explored", event: "BEGIN_ARCHITECTURE", to: "defining-architecture" },
	{ from: "explored", event: "COMPLETE_ARCHITECTURE", to: "architecture-defined" },
	{ from: "defining-architecture", event: "COMPLETE_ARCHITECTURE", to: "architecture-defined" },
	{ from: "architecture-defined", event: "BEGIN_REFINE_ARCHITECTURE", to: "refining-architecture" },
	{ from: "architecture-refined", event: "BEGIN_SLICING", to: "defining-slices" },
	{ from: "defining-slices", event: "COMPLETE_SLICING", to: "slices-defined" },
	{ from: "slices-defined", event: "BEGIN_REFINE_SLICES", to: "refining-slices" },
] as const;
