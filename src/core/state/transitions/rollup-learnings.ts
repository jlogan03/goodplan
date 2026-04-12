/**
 * ROLLUP_LEARNINGS transition handler.
 * Copies matching learnings from a source scope to a target scope,
 * removing rolled-up entries from the source for idempotency.
 * Pure function, no I/O.
 */
import type { Project } from "../../../schemas/entities/project.js";
import type { LearningEntry } from "../../../schemas/records/learning.js";
import type { ProjectState } from "../../tree.js";
import { getJson, getJsonl, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { appendActivityLog } from "./helpers.js";

type RollupLearningsEvent = Extract<StateEvent, { type: "ROLLUP_LEARNINGS" }>;

/**
 * Resolve the target scope label to a learnings.jsonl path.
 * - "project" -> root "learnings.jsonl"
 * - "epic" -> "epics/<activeEpic>/learnings.jsonl"
 */
function resolveTargetPath(state: ProjectState, to: string): string | StateError {
	if (to === "project") {
		return "learnings.jsonl";
	}
	if (to === "epic") {
		const project = getJson<Project>(state, "project.json");
		if (project === undefined || project.activeEpic === null) {
			return {
				code: "STATE_INVALID_TRANSITION",
				message: `Cannot rollup learnings to "epic" — no active epic`,
				detail: { to },
			};
		}
		return `epics/${project.activeEpic}/learnings.jsonl`;
	}
	return {
		code: "STATE_INVALID_TRANSITION",
		message: `Invalid rollup target "${to}" — expected "project" or "epic"`,
		detail: { to },
	};
}

export function handleRollupLearnings(
	state: ProjectState,
	event: RollupLearningsEvent,
): ProjectState | StateError {
	// Resolve source path: `from` is a relative scope path like "slices/01-auth"
	const sourcePath = `${event.from}/learnings.jsonl`;
	const sourceLearnings = getJsonl<LearningEntry>(state, sourcePath);

	if (sourceLearnings === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Source learnings not found at "${sourcePath}"`,
			detail: { from: event.from, sourcePath },
		};
	}

	// Resolve target path
	const targetPathOrErr = resolveTargetPath(state, event.to);
	if (typeof targetPathOrErr !== "string") {
		return targetPathOrErr;
	}
	const targetPath = targetPathOrErr;

	// Filter: only entries whose rollupTo includes the target scope label
	const matching: LearningEntry[] = [];
	const remaining: LearningEntry[] = [];
	for (const entry of sourceLearnings) {
		if (entry.rollupTo.includes(event.to)) {
			matching.push(entry);
		} else {
			remaining.push(entry);
		}
	}

	// Nothing to roll up — return unchanged state
	if (matching.length === 0) {
		return state;
	}

	let tree = state;

	// Remove rolled-up entries from source (idempotency)
	tree = setEntry(tree, sourcePath, {
		type: "jsonl",
		content: remaining,
	});

	// Batch append to target, deduplicating by summary+source to handle
	// overlap with auto-rollup during COMPLETE_SLICE / COMPLETE_QUEST
	const targetLearnings = getJsonl<LearningEntry>(tree, targetPath) ?? [];
	const deduped = matching.filter(
		(entry) =>
			!targetLearnings.some(
				(existing) => existing.summary === entry.summary && existing.source === entry.source,
			),
	);
	tree = setEntry(tree, targetPath, {
		type: "jsonl",
		content: [...targetLearnings, ...deduped],
	});

	// Activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"rollup-learnings",
		event.from,
		`Rolled up ${matching.length} learning(s) from "${event.from}" to "${event.to}"`,
	);

	return tree;
}
