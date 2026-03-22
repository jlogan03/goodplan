/**
 * RPC complete — runs entity completion via the state machine.
 * Pattern: loadState → build StateEvent → reduce → commitState → return CompleteResult.
 */

import type { Epic } from "../../schemas/entities/epic.js";
import type { Overview } from "../../schemas/entities/overview.js";
import type { Slice } from "../../schemas/entities/slice.js";
import type { LearningEntry } from "../../schemas/records/learning.js";
import type { StateEvent } from "../../schemas/state-events.js";
import { GoodplanError } from "../../util/errors.js";
import { commitState } from "../data/commit.js";
import { loadState } from "../data/load.js";
import { reduce } from "../state/reduce.js";
import { ACTIVITY_PHASE_DEFERRED_SKIP } from "../state/transitions/helpers.js";
import { isStateError } from "../state/types.js";
import { getJson, getJsonl } from "../tree.js";
import type { ProjectState } from "../tree.js";
import type {
	CompleteInput,
	CompleteResult,
	DeferredItem,
	Target,
	WorkflowOptions,
} from "./types.js";
import { resolveEntityJsonPath, resolveEntityName } from "./types.js";

/**
 * Complete an entity. Maps (target, input) to the appropriate COMPLETE_* event,
 * runs it through the state machine, and commits the result.
 */
export function complete(
	projectDir: string,
	target: Target,
	input: CompleteInput,
	_options?: WorkflowOptions,
): CompleteResult {
	const oldState = loadState(projectDir);
	const ts = new Date().toISOString();
	const event = buildCompleteEvent(target, input, ts);

	const result = reduce(oldState, event);

	if (isStateError(result)) {
		throw new GoodplanError(result.code, result.message, result.detail);
	}

	commitState(projectDir, oldState, result);

	return buildCompleteResult(target, oldState, result);
}

// ── Event building ───────────────────────────────────────────

function buildCompleteEvent(target: Target, input: CompleteInput, ts: string): StateEvent {
	switch (target.type) {
		case "epic": {
			if (input.type !== "epic") {
				throw new GoodplanError(
					"INTERNAL_ERROR",
					`CompleteInput.type '${input.type}' does not match target.type 'epic'`,
				);
			}
			return {
				type: "COMPLETE_EPIC",
				epic: target.name,
				ts,
				verificationResults: input.verificationResults,
			};
		}
		case "slice": {
			if (input.type !== "slice") {
				throw new GoodplanError(
					"INTERNAL_ERROR",
					`CompleteInput.type '${input.type}' does not match target.type 'slice'`,
				);
			}
			return {
				type: "COMPLETE_SLICE",
				slice: target.name,
				ts,
				verificationPassed: input.verificationPassed,
				deferred: input.deferred ?? [],
				learnings: input.learnings ?? [],
				architectureDelta: input.architectureDelta ?? [],
			};
		}
		case "quest":
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`complete({type:'${target.type}'}) is not yet implemented`,
			);
		default:
			throw new GoodplanError("INTERNAL_ERROR", `Cannot complete target type: ${target.type}`);
	}
}

// ── Result building ──────────────────────────────────────────

function buildCompleteResult(
	target: Target,
	oldState: ProjectState,
	newState: ProjectState,
): CompleteResult {
	const entity = resolveEntityName(target);
	const entityPath = resolveEntityJsonPath(target);

	if (target.type === "epic") {
		const oldEpic = getJson<Epic>(oldState, entityPath);
		const newEpic = getJson<Epic>(newState, entityPath);
		return {
			entity,
			previousStatus: oldEpic?.status ?? "none",
			newStatus: newEpic?.status ?? "unknown",
		};
	}

	if (target.type === "slice") {
		return buildSliceCompleteResult(target.name, entity, oldState, newState);
	}

	throw new GoodplanError(
		"INTERNAL_ERROR",
		`buildCompleteResult not yet implemented for target type: ${target.type}`,
	);
}

function buildSliceCompleteResult(
	sliceName: string,
	entity: string,
	oldState: ProjectState,
	newState: ProjectState,
): CompleteResult {
	const oldSlice = getJson<Slice>(oldState, `slices/${sliceName}/slice.json`);
	const newSlice = getJson<Slice>(newState, `slices/${sliceName}/slice.json`);

	const result: CompleteResult = {
		entity,
		previousStatus: oldSlice?.status ?? "none",
		newStatus: newSlice?.status ?? "unknown",
	};

	if (newSlice === undefined) return result;

	// Derive epicComplete: check all sibling slices in the epic via overview.json
	const overview = getJson<Overview>(newState, "slices/overview.json");
	if (overview !== undefined) {
		const epicSlices = overview.items.filter((item) => item.epic === newSlice.epic);
		const allDone = epicSlices.every(
			(item) => item.status === "completed" || item.status === "abandoned",
		);
		result.epicComplete = allDone;
	}

	// Derive deferredRouted / deferredSkipped: count which deferred items target existing slices
	// oldSlice (already fetched above) is used as existence guard; no need to re-fetch.
	if (overview !== undefined && oldSlice !== undefined) {
		// Collect deferred items that were routed by the state machine
		// We detect this by checking each target slice's deferred array in newState vs oldState
		const routedItems: DeferredItem[] = [];
		let skippedCount = 0;

		// Walk all slices in overview to find newly-added deferred items sourced from this slice
		for (const item of overview.items) {
			if (item.name === sliceName) continue;
			const oldTarget = getJson<Slice>(oldState, `slices/${item.name}/slice.json`);
			const newTarget = getJson<Slice>(newState, `slices/${item.name}/slice.json`);
			if (newTarget === undefined) continue;
			const oldDeferredCount = oldTarget?.deferred.length ?? 0;
			if (newTarget.deferred.length > oldDeferredCount) {
				for (let i = oldDeferredCount; i < newTarget.deferred.length; i++) {
					const d = newTarget.deferred[i];
					if (d !== undefined) {
						routedItems.push(d);
					}
				}
			}
		}

		// Count skipped by checking activity log for deferred-skip entries
		// The state machine logs skipped items. We can count by analyzing:
		// total deferred items that target non-existent slices
		// Alternative approach: look at activity log diff
		const oldLog = getJsonl<Record<string, unknown>>(oldState, "activity-log.jsonl") ?? [];
		const newLog = getJsonl<Record<string, unknown>>(newState, "activity-log.jsonl") ?? [];
		const newEntries = newLog.slice(oldLog.length);
		skippedCount = newEntries.filter(
			(entry) => entry.phase === ACTIVITY_PHASE_DEFERRED_SKIP,
		).length;

		if (routedItems.length > 0) {
			result.deferredRouted = routedItems;
		}
		if (skippedCount > 0) {
			result.deferredSkipped = skippedCount;
		}
	}

	// Derive learningsRolledUp: compare old vs new learnings.jsonl at epic/project levels
	const epicLearningsOld =
		getJsonl<LearningEntry>(oldState, `epics/${newSlice.epic}/learnings.jsonl`) ?? [];
	const epicLearningsNew =
		getJsonl<LearningEntry>(newState, `epics/${newSlice.epic}/learnings.jsonl`) ?? [];
	const projectLearningsOld = getJsonl<LearningEntry>(oldState, "learnings.jsonl") ?? [];
	const projectLearningsNew = getJsonl<LearningEntry>(newState, "learnings.jsonl") ?? [];

	const epicDelta = epicLearningsNew.length - epicLearningsOld.length;
	const projectDelta = projectLearningsNew.length - projectLearningsOld.length;

	if (epicDelta > 0 || projectDelta > 0) {
		result.learningsRolledUp = { epic: epicDelta, project: projectDelta };
	}

	// Architecture paths: return state-tree-relative directories for the LLM to update.
	// The Commands layer resolves these to absolute filesystem paths.
	if (newSlice !== undefined) {
		const archDeltas = getJsonl<unknown>(newState, `slices/${sliceName}/architecture-deltas.jsonl`);
		if (archDeltas !== undefined && archDeltas.length > 0) {
			result.architecturePaths = {
				currentArchitecture: `epics/${newSlice.epic}/architecture`,
			};
		}
	}

	return result;
}
