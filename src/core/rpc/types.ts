/**
 * Centralized RPC types — shared across begin, complete, submit.
 * Defined per rpc-layer-api.md (source of truth).
 */

import type { Verification, VerificationResult } from "../../schemas/entities/epic.js";
import type { DeferredItem } from "../../schemas/entities/slice.js";
import type { ArchitectureDeltaInput } from "../../schemas/records/architecture-delta.js";
import type { LearningInput } from "../../schemas/records/learning.js";

export type { DeferredItem } from "../../schemas/entities/slice.js";

// ── Phase types ──────────────────────────────────────────────

export type BeginPhase =
	| "create"
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

export type SubmitPhase =
	| "plan"
	| "refinement"
	| "implementation"
	| "explore"
	| "architecture"
	| "slices"
	| "refine-architecture"
	| "refine-slices";

// ── Target ───────────────────────────────────────────────────

// Extends rpc-layer-api.md spec with {type:'project'} for rpcInit compatibility.
// The spec defines four variants (epic, slice, quest, decision); project is added
// so that rpcInit can route through begin('create', {type:'project'}).
export type Target =
	| { type: "project" }
	| { type: "epic"; name: string }
	| { type: "slice"; name: string }
	| { type: "quest"; name: string }
	| { type: "decision"; id: string };

// ── Workflow options ─────────────────────────────────────────

export interface WorkflowOptions {
	inlineContext?: boolean | number;
	override?: boolean;
}

// ── Begin payload map ────────────────────────────────────────

/**
 * Per-phase payload types for begin(). Phases that carry no event-specific
 * data map to Record<string, never> (callers pass {}). This is required
 * by exactOptionalPropertyTypes — undefined is not a valid positional arg.
 */
export interface BeginPayloadMap {
	create: { name: string; goal?: string; epic?: string };
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
	"update-decision": Record<string, never>;
	rollup: Record<string, never>;
}

// ── Result types ─────────────────────────────────────────────

export interface BeginResult {
	entity: string;
	phase: string;
	previousStatus: string;
	newStatus: string;
}

export interface CompleteResult {
	entity: string;
	previousStatus: string;
	newStatus: string;
	deferredRouted?: DeferredItem[];
	deferredSkipped?: number;
	/** State-tree-relative paths (e.g., "epics/my-epic/architecture/"). The Commands layer resolves these to absolute filesystem paths. */
	architecturePaths?: {
		currentArchitecture: string;
		targetArchitecture?: string;
	};
	epicComplete?: boolean;
	learningsRolledUp?: { epic: number; project: number };
}

export interface SubmitResult {
	entity: string;
	phase: string;
	previousStatus: string;
	newStatus: string;
	advanced: boolean;
}

// ── Complete input ───────────────────────────────────────────

export type CompleteInput =
	| { type: "epic"; verificationResults: VerificationResult[] }
	| {
			type: "slice";
			verificationPassed: boolean;
			// RPC layer must coerce undefined → [] before dispatching COMPLETE_SLICE event
			// (event type requires non-optional arrays; these are optional at the input boundary)
			deferred?: DeferredItem[];
			learnings?: LearningInput[];
			architectureDelta?: ArchitectureDeltaInput[];
	  }
	| { type: "quest"; verificationPassed: boolean };

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
		case "decision":
			return target.id;
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
			return `slices/${target.name}/slice.json`;
		case "quest":
			return `quests/${target.name}/quest.json`;
		case "decision":
			return "decisions.jsonl";
	}
}
