/**
 * Context bundling module — peer to the RPC layer.
 * Assembles the ContextBundle for start-* commands and --inline on mutations.
 *
 * Read-only — no state mutations, no reduce() call.
 * Caller provides the state (does NOT call loadState internally).
 */

import { getJson } from "../tree.js";
import type { ProjectState } from "../tree.js";
import { applyBudget } from "./budget.js";
import type { CollectedEntry } from "./collect.js";
import { resolveContentSource } from "./collect.js";
import { collectDecisions } from "./decisions.js";
import { collectLearnings } from "./learnings.js";
import { getPriorityTable } from "./priorities.js";
import type { ResolvedTarget } from "./types.js";
import type { ContextBundle, StartContextOptions, SubmitPhase, Target } from "./types.js";

export type {
	ContextBundle,
	DecisionSummary,
	LearningSummary,
	StartContextOptions,
} from "./types.js";
export { DEFAULT_INLINE_BUDGET } from "./budget.js";

/**
 * Assemble a context bundle for the given phase and target.
 *
 * Collects content from the state tree in priority order per the phase's
 * priority table, applies budget-based inlining if `options.inlineBudget`
 * is set, and includes decisions and learnings.
 *
 * When no budget is set, `inline` is `{}` and all content goes to `references`.
 */
export function startContext(
	state: ProjectState,
	phase: SubmitPhase,
	target: Target,
	options?: StartContextOptions,
): ContextBundle {
	// Resolve the active epic for slice/quest target paths
	const activeEpic = resolveActiveEpic(state, target);
	const rt: ResolvedTarget = { target, activeEpic };

	// Collect content entries in priority order
	const priorityTable = getPriorityTable(phase, target);
	const allEntries: CollectedEntry[] = [];

	for (const source of priorityTable) {
		const entries = resolveContentSource(state, source, rt);
		allEntries.push(...entries);
	}

	// Deduplicate by key (first occurrence wins — preserves priority order)
	const seen = new Set<string>();
	const deduped: CollectedEntry[] = [];
	for (const entry of allEntries) {
		if (!seen.has(entry.key)) {
			seen.add(entry.key);
			deduped.push(entry);
		}
	}

	// Apply budget or reference-only mode
	const budget = options?.inlineBudget;
	let inline: Record<string, string>;
	let references: string[];

	if (budget !== undefined) {
		const result = applyBudget(deduped, budget);
		inline = result.inline;
		references = result.references;
	} else {
		// No budget — all content goes to references
		inline = {};
		references = deduped.map((e) => e.key);
	}

	// Collect decisions and learnings
	const decisions = collectDecisions(state);
	const scope = resolveScope(target);
	const learnings = collectLearnings(state, scope);

	return { inline, references, decisions, learnings };
}

// ── Helpers ─────────────────────────────────────────────────

function resolveActiveEpic(state: ProjectState, target: Target): string | undefined {
	if (target.type === "epic") return target.name;
	// For slice/quest targets, look up the active epic from project.json
	const project = getJson<{ activeEpic: string | null }>(state, "project.json");
	return project?.activeEpic ?? undefined;
}

function resolveScope(target: Target): string | undefined {
	switch (target.type) {
		case "slice":
			return `epics/${target.epic}/slices/${target.name}`;
		case "quest":
			return `quests/${target.name}`;
		default:
			return undefined;
	}
}
