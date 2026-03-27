/**
 * Context bundling types — peer module to the RPC layer.
 * Defined per rpc-layer-api.md. The RPC layer imports from here if needed,
 * not the reverse.
 */

import type { SubmitPhase, Target } from "../rpc/types.js";

// ── Context bundle ──────────────────────────────────────────

export interface ContextBundle {
	inline: Record<string, string>;
	references: string[];
	decisions: DecisionSummary[];
	learnings: LearningSummary[];
}

// ── Projections ─────────────────────────────────────────────

/** Projection of DecisionEntry for context bundles — omits detail fields.
 *  Only active and revisiting decisions are collected; superseded decisions
 *  are filtered out by collectDecisions(). */
export interface DecisionSummary {
	id: string;
	status: "active" | "revisiting";
	domain: string;
	title: string;
	summary: string;
}

/** Projection of stored learning record for context bundles.
 *  The `file` field is present for new-format entries (learnings/ directory pattern)
 *  and absent for legacy entries (inline detail). Consumers should use `"file" in learning`
 *  checks (not `learning.file !== undefined`) to satisfy `exactOptionalPropertyTypes`. */
export interface LearningSummary {
	category: "domain" | "worked" | "didnt-work" | "do-differently";
	summary: string;
	tags: string[];
	source: string;
	file?: string;
}

// ── Content source definition ───────────────────────────────

/** Target augmented with the active epic name (resolved from project.json by startContext).
 *  Path functions use this to reference epic-level content for slice/quest phases. */
export interface ResolvedTarget {
	target: Target;
	activeEpic: string | undefined;
}

/** A single entry in a phase's priority table. */
export interface ContentSource {
	/** Unique key for this source (used as key in inline map). */
	key: string;
	/** State-tree-relative path, or a function that computes it from the resolved target.
	 *  Functions may return undefined when the path cannot be computed (e.g., no active epic). */
	path: string | ((rt: ResolvedTarget) => string | undefined);
	/** Whether the source is a single markdown file or a directory to expand. */
	sourceType: "markdown" | "directory";
}

// ── Options ─────────────────────────────────────────────────

export interface StartContextOptions {
	/** Inline budget in bytes. When set, content is inlined in priority order
	 *  up to this limit. When undefined, all content goes to references. */
	inlineBudget?: number;
}

// ── Re-export phase type for convenience ────────────────────

export type { SubmitPhase, Target };
