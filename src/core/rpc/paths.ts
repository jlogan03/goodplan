/**
 * Path resolution for RPC result types.
 * Maps (phase, target) → absolute filesystem paths for artifact locations.
 *
 * Skills use these paths to know where to write/read artifacts.
 * Always returns an object (empty `{}` for phases with no specific paths, never `undefined`).
 */

import * as nodePath from "node:path";
import type { BeginPhase, PathReferences, SubmitPhase, Target } from "./types.js";

/**
 * Resolve absolute paths for artifacts relevant to a given phase and target.
 *
 * Guaranteed keys per phase:
 * - `plan` / `submit-plan` → `{ plan: string }`
 * - `refine-plan` / `submit-refine-plan` → `{ plan: string, planRefined: string }`
 * - `implement` / `submit-implement` → `{ implementation: string }`
 * - `explore` / `submit-explore` → `{ research: string, brainstorm: string }`
 * - `define-architecture` / `refine-architecture` / `submit-define-architecture` / `submit-refine-architecture` → `{ architecture: string }`
 * - `define-slices` / `refine-slices` / `submit-define-slices` / `submit-refine-slices` → `{ slices: string }`
 * - `create`, `activate`, `abandon`, `complete`, and other lifecycle phases → `{}`
 *
 * Submit phases resolve the same paths as their corresponding begin phase:
 * - `submit-plan` → same as `plan`
 * - `submit-refine-plan` → same as `refine-plan`
 * - `submit-implement` → same as `implement`
 * - `submit-explore` → same as `explore`
 * - `submit-define-architecture` → same as `define-architecture`
 * - `submit-refine-architecture` → same as `refine-architecture`
 * - `submit-define-slices` → same as `define-slices`
 */
export function resolvePathReferences(
	projectDir: string,
	target: Target,
	// "complete" is in SubmitPhase but listed explicitly: complete() passes this literal directly
	phase: BeginPhase | SubmitPhase | "complete",
): PathReferences {
	const entityDir = resolveEntityDir(projectDir, target);
	if (entityDir === undefined) return {};

	const beginPhase = mapToBeginPhase(phase);
	return resolveForBeginPhase(entityDir, beginPhase);
}

// ── Submit-to-begin mapping ──────────────────────────────────

/**
 * Map a phase to its begin-phase equivalent for path resolution.
 * Submit phases resolve the same paths as their corresponding begin phase.
 */
// "complete" is in SubmitPhase but listed explicitly: complete() passes this literal directly
function mapToBeginPhase(phase: BeginPhase | SubmitPhase | "complete"): BeginPhase | "complete" {
	switch (phase) {
		// SubmitPhase → BeginPhase mappings
		case "plan":
			return "plan";
		case "refinement":
			return "refine-plan";
		case "implementation":
			return "implement";
		case "explore":
			return "explore";
		case "architecture":
			return "define-architecture";
		case "slices":
			return "define-slices";
		case "refine-architecture":
			return "refine-architecture";
		case "refine-slices":
			return "refine-slices";
		case "complete":
			return "complete";
		// BeginPhase values pass through
		case "create":
		case "create-decision":
		case "define-architecture":
		case "define-slices":
		case "activate":
		case "refine-plan":
		case "implement":
		case "abandon":
		case "add-verification":
		case "update-verification":
		case "update-decision":
		case "rollup":
			return phase;
		default: {
			const _exhaustive: never = phase;
			return _exhaustive;
		}
	}
}

// ── Per-phase path resolution ────────────────────────────────

function resolveForBeginPhase(entityDir: string, phase: BeginPhase | "complete"): PathReferences {
	switch (phase) {
		case "plan":
			return { plan: nodePath.join(entityDir, "plan.md") };
		case "refine-plan":
			return {
				plan: nodePath.join(entityDir, "plan.md"),
				planRefined: nodePath.join(entityDir, "plan-refined.md"),
			};
		case "implement":
			return { implementation: nodePath.join(entityDir, "implementation") };
		case "explore":
			return {
				research: nodePath.join(entityDir, "research"),
				brainstorm: nodePath.join(entityDir, "brainstorm"),
			};
		case "define-architecture":
		case "refine-architecture":
			return { architecture: nodePath.join(entityDir, "architecture") };
		case "define-slices":
		case "refine-slices":
			return { slices: nodePath.join(entityDir, "slices") };
		// Lifecycle phases — no specific artifact paths
		case "create":
		case "create-decision":
		case "activate":
		case "abandon":
		case "add-verification":
		case "update-verification":
		case "update-decision":
		case "rollup":
		case "complete":
			return {};
		default: {
			const _exhaustive: never = phase;
			return _exhaustive;
		}
	}
}

// ── Entity directory resolution ──────────────────────────────

function resolveEntityDir(projectDir: string, target: Target): string | undefined {
	switch (target.type) {
		case "epic":
			return nodePath.join(projectDir, "epics", target.name);
		case "slice":
			return nodePath.join(projectDir, "slices", target.name);
		case "quest":
			return nodePath.join(projectDir, "quests", target.name);
		// These target types have no entity directory — return undefined to yield empty paths.
		case "project":
		case "decision":
		case "rollup":
			return undefined;
	}
}
