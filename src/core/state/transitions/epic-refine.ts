/**
 * COMPLETE_REFINE_ARCHITECTURE and COMPLETE_REFINE_SLICES handlers.
 * Uses shared refinement circuit breaker logic.
 * Pure functions, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import type { StateEvent, StateError } from "../types.js";
import { isStateError } from "../types.js";
import type { EpicStatus } from "../../../schemas/entities/epic.js";
import {
	appendActivityLog,
	evaluateRefinement,
	getEpic,
	guardEpicStatus,
	setEpicJson,
	updateOverviewStatus,
} from "./helpers.js";

type CompleteRefineArchEvent = Extract<StateEvent, { type: "COMPLETE_REFINE_ARCHITECTURE" }>;
type CompleteRefineSlicesEvent = Extract<StateEvent, { type: "COMPLETE_REFINE_SLICES" }>;

export function handleCompleteRefineArchitecture(
	state: ProjectState,
	event: CompleteRefineArchEvent,
): ProjectState | StateError {
	// Skip path: architecture-defined → architecture-refined (no BEGIN_REFINE needed)
	// Normal path: refining-architecture → architecture-refined or stay
	const epic = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		["architecture-defined", "refining-architecture"],
		"COMPLETE_REFINE_ARCHITECTURE",
	);
	if (isStateError(epic)) return epic;

	const outcome = evaluateRefinement(epic.refinement, {
		scores: event.scores,
		override: event.override,
	});

	if (outcome.action === "error") return outcome.error;

	if (outcome.action === "advance") {
		// Record final scores in refinement history if we have refinement state
		const finalRefinement = epic.refinement !== null
			? {
					...epic.refinement,
					scoreHistory: [
						...epic.refinement.scoreHistory,
						{ round: epic.refinement.round, scores: event.scores },
					],
				}
			: null;

		let tree = setEpicJson(state, event.epic, {
			...epic,
			status: "architecture-refined",
			updated: event.ts,
			refinement: finalRefinement,
		});
		tree = updateOverviewStatus(tree, event.epic, "architecture-refined");
		tree = appendActivityLog(tree, event.ts, "complete-refine-architecture", `epics/${event.epic}`, `Epic "${event.epic}" architecture refined`);
		return tree;
	}

	// Stay in refining-architecture
	let tree = setEpicJson(state, event.epic, {
		...epic,
		status: "refining-architecture",
		updated: event.ts,
		refinement: outcome.newRefinement,
	});
	tree = appendActivityLog(tree, event.ts, "refine-architecture-round", `epics/${event.epic}`, `Epic "${event.epic}" architecture refinement round ${outcome.newRefinement.round - 1} completed`);
	return tree;
}

export function handleCompleteRefineSlices(
	state: ProjectState,
	event: CompleteRefineSlicesEvent,
): ProjectState | StateError {
	// Skip path: slices-defined → slices-refined (no BEGIN_REFINE needed)
	// Normal path: refining-slices → slices-refined or stay
	const epic = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		["slices-defined", "refining-slices"],
		"COMPLETE_REFINE_SLICES",
	);
	if (isStateError(epic)) return epic;

	const outcome = evaluateRefinement(epic.refinement, {
		scores: event.scores,
		override: event.override,
	});

	if (outcome.action === "error") return outcome.error;

	if (outcome.action === "advance") {
		const finalRefinement = epic.refinement !== null
			? {
					...epic.refinement,
					scoreHistory: [
						...epic.refinement.scoreHistory,
						{ round: epic.refinement.round, scores: event.scores },
					],
				}
			: null;

		let tree = setEpicJson(state, event.epic, {
			...epic,
			status: "slices-refined",
			updated: event.ts,
			refinement: finalRefinement,
		});
		tree = updateOverviewStatus(tree, event.epic, "slices-refined");
		tree = appendActivityLog(tree, event.ts, "complete-refine-slices", `epics/${event.epic}`, `Epic "${event.epic}" slices refined`);
		return tree;
	}

	// Stay in refining-slices
	let tree = setEpicJson(state, event.epic, {
		...epic,
		status: "refining-slices",
		updated: event.ts,
		refinement: outcome.newRefinement,
	});
	tree = appendActivityLog(tree, event.ts, "refine-slices-round", `epics/${event.epic}`, `Epic "${event.epic}" slice refinement round ${outcome.newRefinement.round - 1} completed`);
	return tree;
}

/** Transition table rows for epic refinement handlers (I4: includes error rows) */
export const epicRefineTransitions: ReadonlyArray<{
	from: EpicStatus;
	event: StateEvent["type"];
	to: EpicStatus | "(error)";
}> = [
	{ from: "architecture-defined", event: "COMPLETE_REFINE_ARCHITECTURE", to: "architecture-refined" },
	{ from: "refining-architecture", event: "COMPLETE_REFINE_ARCHITECTURE", to: "refining-architecture" },
	{ from: "refining-architecture", event: "COMPLETE_REFINE_ARCHITECTURE", to: "architecture-refined" },
	{ from: "refining-architecture", event: "COMPLETE_REFINE_ARCHITECTURE", to: "(error)" },
	{ from: "slices-defined", event: "COMPLETE_REFINE_SLICES", to: "slices-refined" },
	{ from: "refining-slices", event: "COMPLETE_REFINE_SLICES", to: "refining-slices" },
	{ from: "refining-slices", event: "COMPLETE_REFINE_SLICES", to: "slices-refined" },
	{ from: "refining-slices", event: "COMPLETE_REFINE_SLICES", to: "(error)" },
] as const;
