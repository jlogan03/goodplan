/**
 * Learning collection for context bundling.
 * Reads learnings.jsonl from state (project-level and optionally scope-level)
 * and projects to LearningSummary[].
 */

import type { LearningEntry } from "../../schemas/records/learning.js";
import { getJsonl } from "../tree.js";
import type { ProjectState } from "../tree.js";
import type { LearningSummary } from "./types.js";

const VALID_CATEGORIES = new Set<LearningSummary["category"]>([
	"domain",
	"worked",
	"didnt-work",
	"do-differently",
]);

/**
 * Collect learnings from the project state, projected to LearningSummary[].
 *
 * When `scope` is provided (e.g., "slices/01-data-layer"), learnings from both
 * the project-level `learnings.jsonl` and the scoped `<scope>/learnings.jsonl`
 * are collected. Without a scope, only project-level learnings are returned.
 *
 * Returns an empty array if no learnings.jsonl files exist in state.
 */
export function collectLearnings(
	state: ProjectState,
	scope?: string,
): LearningSummary[] {
	const summaries: LearningSummary[] = [];

	// Project-level learnings
	const projectEntries = getJsonl<LearningEntry>(state, "learnings.jsonl");
	if (projectEntries !== undefined) {
		for (const entry of projectEntries) {
			const summary = projectLearning(entry);
			if (summary !== undefined) summaries.push(summary);
		}
	}

	// Scope-level learnings (e.g., "slices/01-data-layer/learnings.jsonl")
	if (scope !== undefined) {
		const scopedEntries = getJsonl<LearningEntry>(state, `${scope}/learnings.jsonl`);
		if (scopedEntries !== undefined) {
			for (const entry of scopedEntries) {
				const summary = projectLearning(entry);
				if (summary !== undefined) summaries.push(summary);
			}
		}
	}

	return summaries;
}

function isValidCategory(category: string): category is LearningSummary["category"] {
	return VALID_CATEGORIES.has(category as LearningSummary["category"]);
}

function projectLearning(entry: LearningEntry): LearningSummary | undefined {
	if (!isValidCategory(entry.category)) return undefined;
	return {
		category: entry.category,
		summary: entry.summary,
		tags: entry.tags,
		source: entry.source,
		...("file" in entry ? { file: entry.file } : {}),
	};
}
