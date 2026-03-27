import type { Epic } from "../../../schemas/entities/epic.js";
import type { Overview } from "../../../schemas/entities/overview.js";
import type { SliceStatus } from "../../../schemas/entities/slice.js";
/**
 * BEGIN_PLAN transition handler.
 * Guard: sequential enforcement — previous slice must be completed/abandoned OR this is the first slice.
 * Apply: set activeSlice, set status to planning, append activity log.
 * Pure function, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { getJson, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	appendActivityLog,
	getProject,
	getSlice,
	guardSliceStatus,
	isSliceTerminal,
	setSliceStatus,
} from "./helpers.js";

type BeginPlanEvent = Extract<StateEvent, { type: "BEGIN_PLAN" }>;

export function handleBeginPlan(
	state: ProjectState,
	event: BeginPlanEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.slice);
	const sliceOrErr = guardSliceStatus(slice, event.slice, "created", "BEGIN_PLAN");
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Sequential enforcement: find this slice's position in its epic's sliceSequence
	const epic = getJson<Epic>(state, `epics/${sliceOrErr.epic}/epic.json`);
	if (epic === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Epic "${sliceOrErr.epic}" not found`,
			detail: { epic: sliceOrErr.epic, slice: event.slice },
		};
	}

	// @ts-expect-error — Phase 2: sliceSequence removed, sequential enforcement moves to epics/overview.json slices array
	const seqIndex = epic.sliceSequence.indexOf(event.slice);
	if (seqIndex > 0) {
		// Check previous slice status via overview
		// @ts-expect-error — Phase 2: sliceSequence removed, use embedded slices array
		const prevSliceName = epic.sliceSequence[seqIndex - 1];
		if (prevSliceName === undefined) {
			return {
				code: "STATE_INVALID_TRANSITION",
				message: `Slice sequence inconsistency — previous slice at index ${seqIndex - 1} not found`,
				detail: { slice: event.slice, seqIndex },
			};
		}
		const overview = getJson<Overview>(state, "slices/overview.json");
		const prevItem = overview?.items.find((i) => i.name === prevSliceName);
		if (prevItem === undefined || !isSliceTerminal(prevItem.status as SliceStatus)) {
			return {
				code: "STATE_SLICE_NOT_READY",
				message: `Cannot begin planning slice "${event.slice}" — previous slice "${prevSliceName}" is not yet completed or abandoned`,
				detail: {
					slice: event.slice,
					blockingSlice: prevSliceName,
					blockingStatus: prevItem?.status ?? "unknown",
				},
			};
		}
	}

	let tree = state;

	// Set activeSlice in project.json
	const project = getProject(state);
	if (project !== undefined) {
		tree = setEntry(tree, "project.json", {
			type: "json",
			content: { ...project, activeSlice: event.slice, updated: event.ts },
		});
	}

	// Set status to planning + sync overview
	tree = setSliceStatus(tree, event.slice, sliceOrErr, "planning", event.ts);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-plan",
		`slices/${event.slice}`,
		`Slice "${event.slice}" planning started`,
	);

	return tree;
}

/** Transition table rows for BEGIN_PLAN */
export const beginPlanTransitions: ReadonlyArray<{
	from: SliceStatus;
	event: StateEvent["type"];
	to: SliceStatus | "(error)";
}> = [
	{ from: "created", event: "BEGIN_PLAN", to: "planning" },
	{ from: "created", event: "BEGIN_PLAN", to: "(error)" },
] as const;
