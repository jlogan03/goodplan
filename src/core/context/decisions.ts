/**
 * Decision collection for context bundling.
 * Reads decisions.jsonl from state and projects to DecisionSummary[].
 */

import type { DecisionEntry } from "../../schemas/records/decision.js";
import { getJsonl } from "../tree.js";
import type { ProjectState } from "../tree.js";
import type { DecisionSummary } from "./types.js";

/**
 * Collect active and revisiting decisions from the project state.
 * Superseded decisions are excluded from context bundles.
 * Returns an empty array if decisions.jsonl doesn't exist in state.
 */
export function collectDecisions(state: ProjectState): DecisionSummary[] {
	const entries = getJsonl<DecisionEntry>(state, "decisions.jsonl");
	if (entries === undefined) return [];

	const summaries: DecisionSummary[] = [];
	for (const entry of entries) {
		if (entry.status === "active" || entry.status === "revisiting") {
			summaries.push({
				id: entry.id,
				status: entry.status,
				domain: entry.domain,
				title: entry.title,
				summary: entry.summary,
			});
		}
	}
	return summaries;
}
