import type { UnifiedOverview } from "../../../schemas/entities/overview.js";
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
	const slice = getSlice(state, event.epic, event.slice);
	const sliceOrErr = guardSliceStatus(slice, event.slice, "created", "BEGIN_PLAN", event.epic);
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Sequential enforcement: find this slice's position in the epic's embedded slices array
	const overview = getJson<UnifiedOverview>(state, "overview.json");
	const epicItem = overview?.epics.find((e) => e.name === event.epic);
	if (epicItem === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Epic "${event.epic}" not found in overview`,
			detail: { epic: event.epic, slice: event.slice },
		};
	}

	const seqIndex = epicItem.slices.findIndex((s) => s.name === event.slice);
	if (seqIndex > 0) {
		const prevSlice = epicItem.slices[seqIndex - 1];
		if (prevSlice === undefined) {
			return {
				code: "STATE_INVALID_TRANSITION",
				message: `Slice sequence inconsistency — previous slice at index ${seqIndex - 1} not found`,
				detail: { slice: event.slice, seqIndex },
			};
		}
		if (!isSliceTerminal(prevSlice.status as SliceStatus)) {
			return {
				code: "STATE_SLICE_NOT_READY",
				message: `Cannot begin planning slice "${event.slice}" — previous slice "${prevSlice.name}" is not yet completed or abandoned`,
				detail: {
					slice: event.slice,
					blockingSlice: prevSlice.name,
					blockingStatus: prevSlice.status,
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
	tree = setSliceStatus(tree, event.epic, event.slice, sliceOrErr, "planning", event.ts);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"begin-plan",
		`epics/${event.epic}/slices/${event.slice}`,
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
