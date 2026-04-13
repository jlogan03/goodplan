/**
 * Context bundling types.
 * Target and SubmitPhase were previously in core/rpc/types.ts (retired with v1).
 */

// ── Target ───────────────────────────────────────────────────

export type Target =
	| { type: "project" }
	| { type: "epic"; name: string }
	| { type: "slice"; name: string; epic: string }
	| { type: "quest"; name: string }
	| { type: "task"; name: string }
	| { type: "decision"; id: string }
	| { type: "rollup"; from: string; to: string };

/** Phases that have content priority orderings for context bundling. */
export type SubmitPhase =
	| "plan"
	| "refinement"
	| "implementation"
	| "explore"
	| "architecture"
	| "slices"
	| "refine-architecture"
	| "refine-slices"
	| "complete";

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

/** Projection of stored learning record for context bundles. */
export interface LearningSummary {
	category: "domain" | "worked" | "didnt-work" | "do-differently";
	summary: string;
	tags: string[];
	source: string;
	file: string;
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

