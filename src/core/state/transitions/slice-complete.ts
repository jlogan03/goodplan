import type { SliceStatus } from "../../../schemas/entities/slice.js";
import type { ArchitectureDelta } from "../../../schemas/records/architecture-delta.js";
import type { LearningEventEntry } from "../../../schemas/records/learning.js";
/**
 * COMPLETE_SLICE transition handler — the most complex handler in the system.
 * Deferred routing, learnings rollup, architecture delta recording,
 * status completion, activeSlice clearing.
 * Pure function, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { getJsonl, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	ACTIVITY_PHASE_DEFERRED_SKIP,
	appendActivityLog,
	getProject,
	getSlice,
	guardSliceStatus,
	processLearnings,
	setSliceJson,
	setSliceStatus,
} from "./helpers.js";

type CompleteSliceEvent = Extract<StateEvent, { type: "COMPLETE_SLICE" }>;

export function handleCompleteSlice(
	state: ProjectState,
	event: CompleteSliceEvent,
): ProjectState | StateError {
	const slice = getSlice(state, event.epic, event.slice);
	const sliceOrErr = guardSliceStatus(
		slice,
		event.slice,
		"implementation-complete",
		"COMPLETE_SLICE",
		event.epic,
	);
	if (isStateError(sliceOrErr)) return sliceOrErr;

	// Guard: verificationPassed must be true
	if (!event.verificationPassed) {
		return {
			code: "STATE_VERIFICATION_FAILED",
			message: `Cannot complete slice "${event.slice}" — verification did not pass`,
			detail: { slice: event.slice, verificationPassed: false },
		};
	}

	let tree = state;

	// 1. Deferred routing: append each deferred item to the target slice's deferred array
	for (const item of event.deferred) {
		const targetEpic = item.targetEpic ?? event.epic;
		const targetSlice = getSlice(tree, targetEpic, item.targetSlice);
		if (targetSlice === undefined) {
			// Target doesn't exist — skip but log warning in activity log (INV-007)
			tree = appendActivityLog(
				tree,
				event.ts,
				ACTIVITY_PHASE_DEFERRED_SKIP,
				`epics/${event.epic}/slices/${event.slice}`,
				`Deferred item skipped — target slice "${item.targetSlice}" not found: ${item.description}`,
			);
			continue;
		}
		tree = setSliceJson(tree, targetEpic, item.targetSlice, {
			...targetSlice,
			deferred: [...targetSlice.deferred, item],
			updated: event.ts,
		});
	}

	// 2. Learnings: LearningEventEntry[] with `file` already set by RPC layer.
	//    Slices roll up to both "epic" and "project".
	const learningEntries: LearningEventEntry[] = event.learnings;
	const source = `epics/${event.epic}/slices/${event.slice}`;
	tree = processLearnings(
		tree,
		learningEntries,
		source,
		new Set(["epic", "project"]),
		sliceOrErr.epic,
	);

	// 3. Architecture deltas: write to per-slice architecture-deltas.jsonl
	if (event.architectureDelta.length > 0) {
		// Inject ts from the event timestamp onto each delta
		const deltas: ArchitectureDelta[] = event.architectureDelta.map((d) => ({
			...d,
			ts: event.ts,
		}));
		const existingDeltas =
			getJsonl<ArchitectureDelta>(
				tree,
				`epics/${event.epic}/slices/${event.slice}/architecture-deltas.jsonl`,
			) ?? [];
		tree = setEntry(tree, `epics/${event.epic}/slices/${event.slice}/architecture-deltas.jsonl`, {
			type: "jsonl",
			content: [...existingDeltas, ...deltas],
		});
	}

	// 4. Set status to completed + sync overview
	tree = setSliceStatus(tree, event.epic, event.slice, sliceOrErr, "completed", event.ts);

	// 5. Clear activeSlice in project.json
	const project = getProject(tree);
	if (project !== undefined) {
		tree = setEntry(tree, "project.json", {
			type: "json",
			content: { ...project, activeSlice: null, updated: event.ts },
		});
	}

	// 6. Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-slice",
		`epics/${event.epic}/slices/${event.slice}`,
		`Slice "${event.slice}" completed`,
	);

	return tree;
}

/** Transition table rows for COMPLETE_SLICE */
export const completeSliceTransitions: ReadonlyArray<{
	from: SliceStatus;
	event: StateEvent["type"];
	to: SliceStatus | "(error)";
}> = [
	{ from: "implementation-complete", event: "COMPLETE_SLICE", to: "completed" },
	{ from: "implementation-complete", event: "COMPLETE_SLICE", to: "(error)" },
] as const;
