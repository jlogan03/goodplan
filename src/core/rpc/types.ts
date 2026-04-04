/**
 * Centralized RPC types — shared across begin, complete, submit.
 * Defined per rpc-layer-api.md (source of truth).
 */

import type { Verification, VerificationResult } from "../../schemas/entities/epic.js";
import type { DeferredItem } from "../../schemas/entities/slice.js";
import type { TaskContext } from "../../schemas/entities/task.js";
import type { ArchitectureDeltaInput } from "../../schemas/records/architecture-delta.js";
import type { DecisionEntry } from "../../schemas/records/decision.js";
import type { LearningInput } from "../../schemas/records/learning.js";
// Type-only import — no runtime circular dependency. The context module
// imports Target/SubmitPhase from here; this imports ContextBundle from there.
// Both are `import type` (erased at compile time), which is safe.
import type { ContextBundle } from "../context/types.js";
import type { NextCommands } from "./next-commands.js";

/** Changes allowed on decision:update — mirrors Partial<Omit<DecisionEntry, "id" | "date">> */
export type UpdateDecisionChanges = Partial<Omit<DecisionEntry, "id" | "date">>;

export type { DeferredItem } from "../../schemas/entities/slice.js";

// ── Phase types ──────────────────────────────────────────────

export type BeginPhase =
	| "create"
	| "create-decision"
	| "create-task"
	| "drop-task"
	| "convert-task"
	| "explore"
	| "define-architecture"
	| "refine-architecture"
	| "define-slices"
	| "refine-slices"
	| "activate"
	| "plan"
	| "refine-plan"
	| "implement"
	| "abandon"
	| "add-verification"
	| "update-verification"
	| "update-decision"
	| "rollup";

/** Phases that have content priority orderings for context bundling.
 *  Encompasses both `submit-*` command phases and the `complete` phase
 *  (which assembles context inline during entity completion). */
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

// ── Target ───────────────────────────────────────────────────

// Extends rpc-layer-api.md spec with {type:'project'} for rpcInit compatibility.
// The spec defines four variants (epic, slice, quest, decision); project is added
// so that rpcInit can route through begin('create', {type:'project'}).
export type Target =
	| { type: "project" }
	| { type: "epic"; name: string }
	| { type: "slice"; name: string; epic: string }
	| { type: "quest"; name: string }
	| { type: "task"; name: string }
	| { type: "decision"; id: string }
	| { type: "rollup"; from: string; to: string };

// ── Workflow options ─────────────────────────────────────────

export interface WorkflowOptions {
	inlineContext?: boolean | number;
	override?: boolean;
	force?: boolean;
}

// ── Begin payload map ────────────────────────────────────────

/**
 * Per-phase payload types for begin(). Phases that carry no event-specific
 * data map to Record<string, never> (callers pass {}). This is required
 * by exactOptionalPropertyTypes — undefined is not a valid positional arg.
 */
export interface BeginPayloadMap {
	create: { name: string; goal?: string; epic?: string };
	"create-decision": { id: string; domain: string; title: string; summary: string; entityPath?: string; reconsiderWhen?: string[] };
	"create-task": { name: string; title: string; description?: string; context?: TaskContext };
	"drop-task": { reason: string };
	"convert-task": { to: "quest" | "epic"; name?: string; goal?: string };
	explore: Record<string, never>;
	"define-architecture": Record<string, never>;
	"refine-architecture": Record<string, never>;
	"define-slices": Record<string, never>;
	"refine-slices": Record<string, never>;
	activate: Record<string, never>;
	plan: Record<string, never>;
	"refine-plan": Record<string, never>;
	implement: Record<string, never>;
	abandon: { reason: string };
	"add-verification": { verification: Verification };
	"update-verification": { index: number; verification: Verification };
	"update-decision": { changes: UpdateDecisionChanges };
	rollup: { from: string; to: string };
}

// ── Path references ──────────────────────────────────────────

/**
 * File/directory paths returned in operation results. Keys are logical names
 * (e.g., "plan", "architecture", "research"), values are absolute filesystem paths.
 * Always populated by the RPC layer; typed optional for backward compatibility
 * with consumers that don't expect it.
 */
// Shallow type is intentional per spec — primary consumers are LLM skills parsing JSON dynamically.
// TODO: Consider discriminated union per-phase PathReferences (e.g., PlanPaths, ExplorePaths)
// when consumers need compile-time key guarantees. Per-phase keys are documented in JSDoc on resolvePathReferences.
export type PathReferences = Record<string, string>;

// ── Result types ─────────────────────────────────────────────

export interface BeginResult {
	entity: string;
	phase: string;
	previousStatus: string;
	newStatus: string;
	/** Always populated by the RPC layer; typed optional for backward compatibility with consumers that don't expect it. */
	paths?: PathReferences;
	nextCommands: NextCommands;
}

/** Specialized result for rollup operations — no meaningful entity status. */
export interface RollupResult {
	phase: "rollup";
	from: string;
	to: string;
	rolledUp: number;
}

export interface CompleteResult {
	entity: string;
	previousStatus: string;
	newStatus: string;
	deferredRouted?: DeferredItem[];
	deferredSkipped?: number;
	/** State-tree-relative paths (e.g., "epics/my-epic/architecture/"). The Commands layer resolves these to absolute filesystem paths. Retained for backward compatibility; new consumers should use `paths`. */
	architecturePaths?: {
		currentArchitecture: string;
		targetArchitecture?: string;
	};
	epicComplete?: boolean;
	learningsRolledUp?: { epic: number; project: number };
	/** Context bundle included when `options.inlineContext` is set. */
	context?: ContextBundle;
	/** Always populated by the RPC layer; typed optional for backward compatibility with consumers that don't expect it. Uses absolute paths (unlike architecturePaths which uses state-tree-relative paths). */
	paths?: PathReferences;
	nextCommands: NextCommands;
}

export interface SubmitResult {
	entity: string;
	phase: string;
	previousStatus: string;
	newStatus: string;
	advanced: boolean;
	/** Always populated by the RPC layer; typed optional for backward compatibility with consumers that don't expect it. */
	paths?: PathReferences;
	nextCommands: NextCommands;
}

// ── Complete input ───────────────────────────────────────────

export type CompleteInput =
	| { type: "epic"; verificationResults: VerificationResult[]; learnings?: LearningInput[] }
	| {
			type: "slice";
			verificationPassed: boolean;
			// RPC layer must coerce undefined → [] before dispatching COMPLETE_SLICE event
			// (event type requires non-optional arrays; these are optional at the input boundary)
			deferred?: DeferredItem[];
			learnings?: LearningInput[];
			architectureDelta?: ArchitectureDeltaInput[];
	  }
	| {
			type: "quest";
			verificationPassed: boolean;
			learnings?: LearningInput[];
			architectureDelta?: ArchitectureDeltaInput[];
	  };

// ── Submit input ─────────────────────────────────────────────

export type SubmitInput =
	| { phase: "plan" }
	| { phase: "refinement"; scores: Record<string, number> }
	| { phase: "implementation" }
	| { phase: "explore" }
	| { phase: "architecture" }
	| { phase: "slices" }
	| { phase: "refine-architecture"; scores: Record<string, number> }
	| { phase: "refine-slices"; scores: Record<string, number> };

// ── Shared entity resolution helpers ────────────────────────

/** Resolve the display name for a target. Exhaustive over all Target variants. */
export function resolveEntityName(target: Target): string {
	switch (target.type) {
		case "project":
			return "project";
		case "epic":
			return target.name;
		case "slice":
			return target.name;
		case "quest":
			return target.name;
		case "task":
			return target.name;
		case "decision":
			return target.id;
		case "rollup":
			return `rollup:${target.from}->${target.to}`;
	}
}

/** Resolve the JSON file path within the state tree for a target. Exhaustive over all Target variants. */
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
