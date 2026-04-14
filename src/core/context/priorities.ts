/**
 * Per-phase content priority tables for context bundling.
 * Each phase maps to an ordered list of content sources (highest priority first).
 * Sources are resolved against the state tree; dynamic paths use target interpolation.
 *
 * Source of truth: rpc-layer-api.md and transition-tables.md "Context Returns" tables.
 */

import type { ContentSource, ResolvedTarget, SubmitPhase, Target } from "./types.js";

/** Resolve the state-tree-relative JSON path for an entity target. */
export function resolveEntityJsonPath(target: Target): string {
	switch (target.type) {
		case "project":
			return "project.json";
		case "epic":
			return `epics/${target.name}/epic.json`;
		case "slice":
			return `epics/${target.epic}/slices/${target.name}/slice.json`;
		case "quest":
			return `quests/${target.name}/quest.json`;
		case "task":
			return `tasks/${target.name}/task.json`;
		case "decision":
			return "decisions.jsonl";
		case "rollup":
			return "learnings.jsonl";
	}
}

// ── Path helpers ────────────────────────────────────────────

function entityDir(target: Target): string {
	switch (target.type) {
		case "slice":
			return `epics/${target.epic}/slices/${target.name}`;
		case "quest":
			return `quests/${target.name}`;
		case "epic":
			return `epics/${target.name}`;
		default:
			return "";
	}
}

/** Resolve the epic name for architecture paths. Epic targets use their own name;
 *  slice/quest targets use the active epic from project.json. */
function epicName(rt: ResolvedTarget): string | undefined {
	if (rt.target.type === "epic") return rt.target.name;
	return rt.activeEpic;
}

// ── Priority table builders ─────────────────────────────────

/** plan: entity goal, current architecture, target architecture, conventions */
const planSources: ContentSource[] = [
	{ key: "entity-goal", path: (rt) => resolveEntityJsonPath(rt.target), sourceType: "markdown" },
	{ key: "current-architecture", path: "architecture", sourceType: "directory" },
	{
		key: "target-architecture",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/architecture` : undefined;
		},
		sourceType: "directory",
	},
	{ key: "conventions", path: "conventions.md", sourceType: "markdown" },
];

/** refinement: plan, entity goal, current architecture, target architecture, conventions */
const refinementSources: ContentSource[] = [
	{ key: "plan", path: (rt) => `${entityDir(rt.target)}/plan.md`, sourceType: "markdown" },
	{ key: "entity-goal", path: (rt) => resolveEntityJsonPath(rt.target), sourceType: "markdown" },
	{ key: "current-architecture", path: "architecture", sourceType: "directory" },
	{
		key: "target-architecture",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/architecture` : undefined;
		},
		sourceType: "directory",
	},
	{ key: "conventions", path: "conventions.md", sourceType: "markdown" },
];

/** implementation: refined plan, entity goal, current architecture, target architecture, conventions */
const implementationSources: ContentSource[] = [
	{
		key: "refined-plan",
		path: (rt) => `${entityDir(rt.target)}/plan-refined.md`,
		sourceType: "markdown",
	},
	{ key: "entity-goal", path: (rt) => resolveEntityJsonPath(rt.target), sourceType: "markdown" },
	{ key: "current-architecture", path: "architecture", sourceType: "directory" },
	{
		key: "target-architecture",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/architecture` : undefined;
		},
		sourceType: "directory",
	},
	{ key: "conventions", path: "conventions.md", sourceType: "markdown" },
];

/** complete: entity goal, slices overview, current architecture, target architecture */
const completeSources: ContentSource[] = [
	{ key: "entity-goal", path: (rt) => resolveEntityJsonPath(rt.target), sourceType: "markdown" },
	{ key: "slices-overview", path: "overview.json", sourceType: "markdown" },
	{ key: "current-architecture", path: "architecture", sourceType: "directory" },
	{
		key: "target-architecture",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/architecture` : undefined;
		},
		sourceType: "directory",
	},
];

/** explore (epic): epic goal, research, brainstorm, conventions, completed epics, completed quests, pending quests */
/** explore (quest): quest goal, conventions, completed epics, completed quests, pending quests */
const exploreEpicSources: ContentSource[] = [
	{
		key: "epic-goal",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/epic.json` : undefined;
		},
		sourceType: "markdown",
	},
	{
		key: "research",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/research` : undefined;
		},
		sourceType: "directory",
	},
	{
		key: "brainstorm",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/brainstorm` : undefined;
		},
		sourceType: "directory",
	},
	{ key: "conventions", path: "conventions.md", sourceType: "markdown" },
	{ key: "completed-epics", path: "overview.json", sourceType: "markdown" },
	{ key: "completed-quests", path: "overview.json", sourceType: "markdown" },
	{ key: "pending-quests", path: "quests", sourceType: "directory" },
];

const exploreQuestSources: ContentSource[] = [
	{ key: "entity-goal", path: (rt) => resolveEntityJsonPath(rt.target), sourceType: "markdown" },
	{ key: "current-architecture", path: "architecture", sourceType: "directory" },
	{
		key: "target-architecture",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/architecture` : undefined;
		},
		sourceType: "directory",
	},
	{ key: "conventions", path: "conventions.md", sourceType: "markdown" },
	{ key: "completed-epics", path: "overview.json", sourceType: "markdown" },
	{ key: "completed-quests", path: "overview.json", sourceType: "markdown" },
	{ key: "pending-quests", path: "quests", sourceType: "directory" },
];

/** architecture: epic goal, exploration output, conventions, existing architecture */
const architectureSources: ContentSource[] = [
	{
		key: "epic-goal",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/epic.json` : undefined;
		},
		sourceType: "markdown",
	},
	{
		key: "research",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/research` : undefined;
		},
		sourceType: "directory",
	},
	{
		key: "brainstorm",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/brainstorm` : undefined;
		},
		sourceType: "directory",
	},
	{ key: "conventions", path: "conventions.md", sourceType: "markdown" },
	{
		key: "existing-architecture",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/architecture` : undefined;
		},
		sourceType: "directory",
	},
];

/** slices: epic goal, full architecture, conventions, learnings */
const slicesSources: ContentSource[] = [
	{
		key: "epic-goal",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/epic.json` : undefined;
		},
		sourceType: "markdown",
	},
	{
		key: "architecture",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/architecture` : undefined;
		},
		sourceType: "directory",
	},
	{ key: "conventions", path: "conventions.md", sourceType: "markdown" },
];

/** refine-architecture: epic goal, current architecture, exploration output, conventions */
const refineArchitectureSources: ContentSource[] = [
	{
		key: "epic-goal",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/epic.json` : undefined;
		},
		sourceType: "markdown",
	},
	{
		key: "architecture",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/architecture` : undefined;
		},
		sourceType: "directory",
	},
	{
		key: "research",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/research` : undefined;
		},
		sourceType: "directory",
	},
	{ key: "conventions", path: "conventions.md", sourceType: "markdown" },
];

/** refine-slices: epic goal, full architecture, current slice definitions, conventions, learnings */
const refineSlicesSources: ContentSource[] = [
	{
		key: "epic-goal",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/epic.json` : undefined;
		},
		sourceType: "markdown",
	},
	{
		key: "architecture",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/architecture` : undefined;
		},
		sourceType: "directory",
	},
	{
		key: "slice-definitions",
		path: (rt) => {
			const e = epicName(rt);
			return e ? `epics/${e}/slices` : undefined;
		},
		sourceType: "directory",
	},
	{ key: "conventions", path: "conventions.md", sourceType: "markdown" },
];

// ── Phase → priority table mapping ─────────────────────────

const PRIORITY_TABLES: Record<SubmitPhase, ContentSource[]> = {
	plan: planSources,
	refinement: refinementSources,
	implementation: implementationSources,
	complete: completeSources,
	explore: exploreEpicSources,
	architecture: architectureSources,
	slices: slicesSources,
	"refine-architecture": refineArchitectureSources,
	"refine-slices": refineSlicesSources,
};

/**
 * Get the content priority table for a given phase.
 * Returns an ordered list of content sources (highest priority first).
 * When target is provided and phase is "explore", selects quest-specific
 * sources for quest targets (quest explore uses different priority ordering).
 */
export function getPriorityTable(phase: SubmitPhase, target?: Target): ContentSource[] {
	if (phase === "explore" && target !== undefined && target.type === "quest") {
		return exploreQuestSources;
	}
	return PRIORITY_TABLES[phase];
}

/**
 * Resolve the source path for a content source, given a resolved target.
 * Returns undefined if the path function returns undefined (e.g., no active epic).
 */
export function resolveSourcePath(source: ContentSource, rt: ResolvedTarget): string | undefined {
	if (typeof source.path === "function") {
		return source.path(rt);
	}
	return source.path;
}
