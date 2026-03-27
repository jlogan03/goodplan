/**
 * RPC complete — runs entity completion via the state machine.
 * Pattern: loadState → build StateEvent → reduce → commitState → return CompleteResult.
 */

import type { Epic } from "../../schemas/entities/epic.js";
import type { EpicOverview } from "../../schemas/entities/overview.js";
import type { Quest } from "../../schemas/entities/quest.js";
import type { Slice } from "../../schemas/entities/slice.js";
import type { LearningEntry } from "../../schemas/records/learning.js";
import type { StateEvent } from "../../schemas/state-events.js";
import { GoodplanError } from "../../util/errors.js";
import { VERSION } from "../../version.js";
import { DEFAULT_INLINE_BUDGET, startContext } from "../context/index.js";
import { commitState } from "../data/commit.js";
import { loadState } from "../data/load.js";
import { reduce } from "../state/reduce.js";
import { ACTIVITY_PHASE_DEFERRED_SKIP } from "../state/transitions/helpers.js";
import { isStateError } from "../state/types.js";
import { getJson, getJsonl } from "../tree.js";
import type { ProjectState } from "../tree.js";
import { resolvePathReferences } from "./paths.js";
import type {
	CompleteInput,
	CompleteResult,
	DeferredItem,
	Target,
	WorkflowOptions,
} from "./types.js";
import { resolveEntityJsonPath, resolveEntityName } from "./types.js";
import { bumpDataVersionIfNeeded } from "./version-stamp.js";

/**
 * Complete an entity. Maps (target, input) to the appropriate COMPLETE_* event,
 * runs it through the state machine, and commits the result.
 */
export function complete(
	projectDir: string,
	target: Target,
	input: CompleteInput,
	options?: WorkflowOptions,
): CompleteResult {
	const oldState = loadState(projectDir);
	const ts = new Date().toISOString();
	const event = buildCompleteEvent(target, input, ts);

	const result = reduce(oldState, event);

	if (isStateError(result)) {
		throw new GoodplanError(result.code, result.message, result.detail);
	}

	// Version stamp: bump project.json.version if CLI version > data version (INV-001 exception — see version-stamp.ts)
	const stampedResult = bumpDataVersionIfNeeded(result, VERSION);

	commitState(projectDir, oldState, stampedResult, options?.force === true ? { force: true } : undefined);

	const completeResult: CompleteResult = {
		...buildCompleteResult(target, oldState, stampedResult),
		paths: resolvePathReferences(projectDir, target, "complete"),
	};

	// Wire --inline: assemble context bundle after state transition
	if (options?.inlineContext !== undefined) {
		const budget =
			options.inlineContext === true
				? DEFAULT_INLINE_BUDGET
				: typeof options.inlineContext === "number"
					? options.inlineContext
					: DEFAULT_INLINE_BUDGET;
		completeResult.context = startContext(stampedResult, "complete", target, {
			inlineBudget: budget,
		});
	}

	return completeResult;
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
				epic: target.epic,
				ts,
				verificationPassed: input.verificationPassed,
				deferred: input.deferred ?? [],
				learnings: input.learnings ?? [],
				architectureDelta: input.architectureDelta ?? [],
			};
		}
		case "quest": {
			if (input.type !== "quest") {
				throw new GoodplanError(
					"INTERNAL_ERROR",
					`CompleteInput.type '${input.type}' does not match target.type 'quest'`,
				);
			}
			return {
				type: "COMPLETE_QUEST",
				quest: target.name,
				ts,
				verificationPassed: input.verificationPassed,
				learnings: input.learnings ?? [],
				architectureDelta: input.architectureDelta ?? [],
			};
		}
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
		return buildSliceCompleteResult(target.name, target.epic, entity, oldState, newState);
	}

	if (target.type === "quest") {
		return buildQuestCompleteResult(target.name, entity, oldState, newState);
	}

	throw new GoodplanError(
		"INTERNAL_ERROR",
		`buildCompleteResult not yet implemented for target type: ${target.type}`,
	);
}

function buildSliceCompleteResult(
	sliceName: string,
	epicName: string,
	entity: string,
	oldState: ProjectState,
	newState: ProjectState,
): CompleteResult {
	const oldSlice = getJson<Slice>(oldState, `epics/${epicName}/slices/${sliceName}/slice.json`);
	const newSlice = getJson<Slice>(newState, `epics/${epicName}/slices/${sliceName}/slice.json`);

	const result: CompleteResult = {
		entity,
		previousStatus: oldSlice?.status ?? "none",
		newStatus: newSlice?.status ?? "unknown",
	};

	if (newSlice === undefined) return result;

	// Derive epicComplete: check all sibling slices in the epic via epics/overview.json
	const epicOverview = getJson<EpicOverview>(newState, "epics/overview.json");
	const epicEntry = epicOverview?.items.find((e) => e.name === newSlice.epic);
	if (epicEntry !== undefined) {
		const allDone = epicEntry.slices.every(
			(item) => item.status === "completed" || item.status === "abandoned",
		);
		result.epicComplete = allDone;
	}

	// Derive deferredRouted / deferredSkipped: count which deferred items target existing slices
	// oldSlice (already fetched above) is used as existence guard; no need to re-fetch.
	if (epicEntry !== undefined && oldSlice !== undefined) {
		// Collect deferred items that were routed by the state machine
		// We detect this by checking each target slice's deferred array in newState vs oldState
		const routedItems: DeferredItem[] = [];
		let skippedCount = 0;

		// Walk all slices across all epics to find newly-added deferred items sourced from this slice
		// Deferred items may target slices in different epics, so we need to iterate all epics
		const allSliceTuples: Array<{ itemEpicName: string; name: string }> = [];
		if (epicOverview !== undefined) {
			for (const epic of epicOverview.items) {
				for (const s of epic.slices) {
					allSliceTuples.push({ itemEpicName: epic.name, name: s.name });
				}
			}
		}

		for (const tuple of allSliceTuples) {
			if (tuple.name === sliceName && tuple.itemEpicName === epicName) continue;
			const oldTarget = getJson<Slice>(oldState, `epics/${tuple.itemEpicName}/slices/${tuple.name}/slice.json`);
			const newTarget = getJson<Slice>(newState, `epics/${tuple.itemEpicName}/slices/${tuple.name}/slice.json`);
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
		const archDeltas = getJsonl<unknown>(newState, `epics/${epicName}/slices/${sliceName}/architecture-deltas.jsonl`);
		if (archDeltas !== undefined && archDeltas.length > 0) {
			result.architecturePaths = {
				currentArchitecture: `epics/${newSlice.epic}/architecture`,
			};
		}
	}

	return result;
}

function buildQuestCompleteResult(
	questName: string,
	entity: string,
	oldState: ProjectState,
	newState: ProjectState,
): CompleteResult {
	const oldQuest = getJson<Quest>(oldState, `quests/${questName}/quest.json`);
	const newQuest = getJson<Quest>(newState, `quests/${questName}/quest.json`);

	const result: CompleteResult = {
		entity,
		previousStatus: oldQuest?.status ?? "none",
		newStatus: newQuest?.status ?? "unknown",
	};

	if (newQuest === undefined) return result;

	// Derive learningsRolledUp: compare old vs new learnings.jsonl at project level
	// (quests are project-scoped — no epic-level rollup)
	const projectLearningsOld = getJsonl<LearningEntry>(oldState, "learnings.jsonl") ?? [];
	const projectLearningsNew = getJsonl<LearningEntry>(newState, "learnings.jsonl") ?? [];
	const projectDelta = projectLearningsNew.length - projectLearningsOld.length;

	if (projectDelta > 0) {
		result.learningsRolledUp = { epic: 0, project: projectDelta };
	}

	// Architecture paths: quests use project-level architecture
	const archDeltas = getJsonl<unknown>(newState, `quests/${questName}/architecture-deltas.jsonl`);
	if (archDeltas !== undefined && archDeltas.length > 0) {
		result.architecturePaths = {
			currentArchitecture: "architecture",
		};
	}

	return result;
}
