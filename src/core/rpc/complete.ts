/**
 * RPC complete — runs entity completion via the state machine.
 * Pattern: loadState → map inputs → build StateEvent → reduce → write .md files → commitState → return CompleteResult.
 */

import type { Epic } from "../../schemas/entities/epic.js";
import type { EpicOverview } from "../../schemas/entities/overview.js";
import type { Quest } from "../../schemas/entities/quest.js";
import type { Slice } from "../../schemas/entities/slice.js";
import type { LearningEntry, LearningEventEntry, LearningInput } from "../../schemas/records/learning.js";
import type { StateEvent } from "../../schemas/state-events.js";
import { GoodplanError } from "../../util/errors.js";
import { deriveSlug } from "../../util/slug.js";
import { VERSION } from "../../version.js";
import { DEFAULT_INLINE_BUDGET, startContext } from "../context/index.js";
import { commitState } from "../data/commit.js";
import { loadState } from "../data/load.js";
import type { MarkdownFile } from "../data/markdown-files.js";
import { writeMarkdownFiles } from "../data/markdown-files.js";
import { reduce } from "../state/reduce.js";
import { ACTIVITY_PHASE_DEFERRED_SKIP } from "../state/transitions/helpers.js";
import { isStateError } from "../state/types.js";
import { getJson, getJsonl } from "../tree.js";
import type { ProjectState } from "../tree.js";
import { computeNextCommands } from "./next-commands.js";
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
 *
 * For slice/quest completion with learnings:
 * 1. Map LearningInput[] to LearningEventEntry[] (derive slugs, set file paths)
 * 2. Build StateEvent with LearningEventEntry[]
 * 3. reduce() - state machine stores file references in JSONL (pure, no I/O)
 * 4. Write .md files to disk (after reduce succeeds, before commitState)
 * 5. commitState() - persists JSONL and other state changes
 */
export function complete(
	projectDir: string,
	target: Target,
	input: CompleteInput,
	options?: WorkflowOptions,
): CompleteResult {
	const oldState = loadState(projectDir);
	const ts = new Date().toISOString();

	// Map LearningInput to LearningEventEntry and collect markdown files to write
	const { event, markdownFiles } = buildCompleteEventWithLearnings(target, input, ts, oldState);

	const result = reduce(oldState, event);

	if (isStateError(result)) {
		throw new GoodplanError(result.code, result.message, result.detail);
	}

	// Version stamp: bump project.json.version if CLI version > data version (INV-001 exception)
	const stampedResult = bumpDataVersionIfNeeded(result, VERSION);

	// Write .md files AFTER reduce succeeds (avoids orphans if reduce fails)
	// but BEFORE commitState (so filesystem has files before JSONL references them).
	// Trade-off: if commitState fails, orphan .md files remain — these are inert since
	// all learning reads go through JSONL. The reverse (commit first) risks dangling refs.
	if (markdownFiles.length > 0) {
		writeMarkdownFiles(projectDir, markdownFiles);
	}

	commitState(projectDir, oldState, stampedResult, options?.force === true ? { force: true } : undefined);

	const baseResult = buildCompleteResult(target, oldState, stampedResult);
	const completeResult: CompleteResult = {
		...baseResult,
		paths: resolvePathReferences(projectDir, target, "complete"),
		nextCommands: computeNextCommands(target, baseResult.newStatus),
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

// ── Slug + LearningInput to LearningEventEntry mapping ──────

/**
 * Collect existing slugs from learnings.jsonl entries at the given scope path.
 * Extracts slug from `file` field (e.g., "learnings/some-slug.md" -> "some-slug").
 */
function collectExistingSlugs(state: ProjectState, scopePath: string): Set<string> {
	const slugs = new Set<string>();
	const entries = getJsonl<LearningEntry>(state, `${scopePath}/learnings.jsonl`);
	if (entries === undefined) return slugs;
	for (const entry of entries) {
		const match = /^learnings\/(.+)\.md$/.exec(entry.file);
		if (match?.[1] !== undefined) {
			slugs.add(match[1]);
		}
	}
	return slugs;
}

/**
 * Map LearningInput[] to LearningEventEntry[] by deriving slugs and setting file paths.
 * Also returns the markdown files to write after reduce succeeds.
 */
function mapLearningInputs(
	inputs: LearningInput[],
	source: string,
	state: ProjectState,
	scopePath: string,
): { entries: LearningEventEntry[]; markdownFiles: MarkdownFile[] } {
	if (inputs.length === 0) {
		return { entries: [], markdownFiles: [] };
	}

	const existingSlugs = collectExistingSlugs(state, scopePath);
	const entries: LearningEventEntry[] = [];
	const markdownFiles: MarkdownFile[] = [];

	for (const input of inputs) {
		const slug = deriveSlug(input.summary, existingSlugs);
		existingSlugs.add(slug);

		const file = `learnings/${slug}.md`;
		entries.push({
			category: input.category,
			summary: input.summary,
			file,
			tags: input.tags,
			source,
			rollup: input.rollupTo.length > 0,
			rollupTo: input.rollupTo,
		});

		// Scope-relative file path resolved to .goodplan/ path
		markdownFiles.push({
			path: `${scopePath}/${file}`,
			content: input.detail,
		});
	}

	return { entries, markdownFiles };
}

// ── Event building ───────────────────────────────────────────

interface EventWithMarkdown {
	event: StateEvent;
	markdownFiles: MarkdownFile[];
}

function buildCompleteEventWithLearnings(
	target: Target,
	input: CompleteInput,
	ts: string,
	state: ProjectState,
): EventWithMarkdown {
	switch (target.type) {
		case "epic": {
			if (input.type !== "epic") {
				throw new GoodplanError(
					"INTERNAL_ERROR",
					`CompleteInput.type '${input.type}' does not match target.type 'epic'`,
				);
			}
			return {
				event: {
					type: "COMPLETE_EPIC",
					epic: target.name,
					ts,
					verificationResults: input.verificationResults,
				},
				markdownFiles: [],
			};
		}
		case "slice": {
			if (input.type !== "slice") {
				throw new GoodplanError(
					"INTERNAL_ERROR",
					`CompleteInput.type '${input.type}' does not match target.type 'slice'`,
				);
			}
			const scopePath = `epics/${target.epic}/slices/${target.name}`;
			const source = scopePath;
			const { entries, markdownFiles } = mapLearningInputs(
				input.learnings ?? [],
				source,
				state,
				scopePath,
			);
			return {
				event: {
					type: "COMPLETE_SLICE",
					slice: target.name,
					epic: target.epic,
					ts,
					verificationPassed: input.verificationPassed,
					deferred: input.deferred ?? [],
					learnings: entries,
					architectureDelta: input.architectureDelta ?? [],
				},
				markdownFiles,
			};
		}
		case "quest": {
			if (input.type !== "quest") {
				throw new GoodplanError(
					"INTERNAL_ERROR",
					`CompleteInput.type '${input.type}' does not match target.type 'quest'`,
				);
			}
			const questScopePath = `quests/${target.name}`;
			const questSource = questScopePath;
			const { entries: questEntries, markdownFiles: questMdFiles } = mapLearningInputs(
				input.learnings ?? [],
				questSource,
				state,
				questScopePath,
			);
			return {
				event: {
					type: "COMPLETE_QUEST",
					quest: target.name,
					ts,
					verificationPassed: input.verificationPassed,
					learnings: questEntries,
					architectureDelta: input.architectureDelta ?? [],
				},
				markdownFiles: questMdFiles,
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
): Omit<CompleteResult, "nextCommands" | "paths" | "context"> {
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
): Omit<CompleteResult, "nextCommands" | "paths" | "context"> {
	const oldSlice = getJson<Slice>(oldState, `epics/${epicName}/slices/${sliceName}/slice.json`);
	const newSlice = getJson<Slice>(newState, `epics/${epicName}/slices/${sliceName}/slice.json`);

	const result: Omit<CompleteResult, "nextCommands" | "paths" | "context"> = {
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

	// Derive deferredRouted / deferredSkipped
	if (epicEntry !== undefined && oldSlice !== undefined) {
		const routedItems: DeferredItem[] = [];
		let skippedCount = 0;

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

	// Derive learningsRolledUp
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

	// Architecture paths
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
): Omit<CompleteResult, "nextCommands" | "paths" | "context"> {
	const oldQuest = getJson<Quest>(oldState, `quests/${questName}/quest.json`);
	const newQuest = getJson<Quest>(newState, `quests/${questName}/quest.json`);

	const result: Omit<CompleteResult, "nextCommands" | "paths" | "context"> = {
		entity,
		previousStatus: oldQuest?.status ?? "none",
		newStatus: newQuest?.status ?? "unknown",
	};

	if (newQuest === undefined) return result;

	// Derive learningsRolledUp (quests are project-scoped, no epic rollup)
	const projectLearningsOld = getJsonl<LearningEntry>(oldState, "learnings.jsonl") ?? [];
	const projectLearningsNew = getJsonl<LearningEntry>(newState, "learnings.jsonl") ?? [];
	const projectDelta = projectLearningsNew.length - projectLearningsOld.length;

	if (projectDelta > 0) {
		result.learningsRolledUp = { epic: 0, project: projectDelta };
	}

	// Architecture paths
	const archDeltas = getJsonl<unknown>(newState, `quests/${questName}/architecture-deltas.jsonl`);
	if (archDeltas !== undefined && archDeltas.length > 0) {
		result.architecturePaths = {
			currentArchitecture: "architecture",
		};
	}

	return result;
}
