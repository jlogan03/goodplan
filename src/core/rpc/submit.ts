/**
 * RPC submit — triggers state transitions for sub-agent content submission.
 * Pattern: loadState → build StateEvent → reduce → commitState → return SubmitResult.
 *
 * Content is already on the filesystem (written by the sub-agent via start-* paths).
 * submit() is a pure state-transition trigger.
 */

import type { Epic } from "../../schemas/entities/epic.js";
import type { Slice } from "../../schemas/entities/slice.js";
import type { StateEvent } from "../../schemas/state-events.js";
import { GoodplanError } from "../../util/errors.js";
import { commitState } from "../data/commit.js";
import { loadState } from "../data/load.js";
import { reduce } from "../state/reduce.js";
import { isStateError } from "../state/types.js";
import { getJson } from "../tree.js";
import type { ProjectState } from "../tree.js";
import type { SubmitInput, SubmitPhase, SubmitResult, Target, WorkflowOptions } from "./types.js";
import { resolveEntityJsonPath, resolveEntityName } from "./types.js";

/**
 * Submit sub-agent content. Maps (phase, target) to the appropriate COMPLETE_* event
 * (submit phases map to completion events, not begin events).
 *
 * The `phase` parameter and `content.phase` are intentionally redundant.
 * `phase` drives event mapping; `content.phase` is the discriminant for the payload union.
 * They must match — a mismatch is an internal consistency failure.
 */
export function submit(
	projectDir: string,
	phase: SubmitPhase,
	target: Target,
	content: SubmitInput,
	options?: WorkflowOptions,
): SubmitResult {
	// Assert phase consistency (INTERNAL_ERROR, not user-facing)
	if (phase !== content.phase) {
		throw new GoodplanError(
			"INTERNAL_ERROR",
			`submit() phase mismatch: parameter '${phase}' !== content.phase '${content.phase}'`,
		);
	}

	const oldState = loadState(projectDir);
	const ts = new Date().toISOString();
	const event = buildSubmitEvent(phase, target, content, ts, options);

	const result = reduce(oldState, event);

	if (isStateError(result)) {
		throw new GoodplanError(result.code, result.message, result.detail);
	}

	commitState(projectDir, oldState, result);

	return buildSubmitResult(phase, target, oldState, result);
}

// ── Event building ───────────────────────────────────────────

function buildSubmitEvent(
	phase: SubmitPhase,
	target: Target,
	content: SubmitInput,
	ts: string,
	options?: WorkflowOptions,
): StateEvent {
	switch (phase) {
		case "plan":
			return buildPlanEvent(target, ts);
		case "refinement":
			return buildRefinementEvent(target, content, ts, options);
		case "implementation":
			return buildImplementationEvent(target, ts);
		case "explore":
			return { type: "COMPLETE_EXPLORE", epic: requireEpicName(target), ts };
		case "architecture":
			return { type: "COMPLETE_ARCHITECTURE", epic: requireEpicName(target), ts };
		case "slices":
			return { type: "COMPLETE_SLICING", epic: requireEpicName(target), ts };
		case "refine-architecture": {
			if (content.phase !== "refine-architecture") {
				throw new GoodplanError("INTERNAL_ERROR", "Unreachable: phase mismatch already checked");
			}
			return {
				type: "COMPLETE_REFINE_ARCHITECTURE",
				epic: requireEpicName(target),
				ts,
				scores: content.scores,
				...spreadOverride(options),
			};
		}
		case "refine-slices": {
			if (content.phase !== "refine-slices") {
				throw new GoodplanError("INTERNAL_ERROR", "Unreachable: phase mismatch already checked");
			}
			return {
				type: "COMPLETE_REFINE_SLICES",
				epic: requireEpicName(target),
				ts,
				scores: content.scores,
				...spreadOverride(options),
			};
		}
		default: {
			const _exhaustive: never = phase;
			throw new GoodplanError("INTERNAL_ERROR", `Unknown submit phase: ${String(_exhaustive)}`);
		}
	}
}

function buildPlanEvent(target: Target, ts: string): StateEvent {
	switch (target.type) {
		case "slice":
			return { type: "COMPLETE_PLAN", slice: target.name, ts };
		case "quest":
			return { type: "COMPLETE_QUEST_PLAN", quest: target.name, ts };
		default:
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`submit('plan') requires slice or quest target, got ${target.type}`,
			);
	}
}

function buildRefinementEvent(
	target: Target,
	content: SubmitInput,
	ts: string,
	options?: WorkflowOptions,
): StateEvent {
	if (content.phase !== "refinement") {
		throw new GoodplanError("INTERNAL_ERROR", "Unreachable: phase mismatch already checked");
	}
	switch (target.type) {
		case "slice":
			return {
				type: "COMPLETE_REFINEMENT_ROUND",
				slice: target.name,
				ts,
				scores: content.scores,
				...spreadOverride(options),
			};
		case "quest":
			return {
				type: "COMPLETE_QUEST_REFINEMENT_ROUND",
				quest: target.name,
				ts,
				scores: content.scores,
				...spreadOverride(options),
			};
		default:
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`submit('refinement') requires slice or quest target, got ${target.type}`,
			);
	}
}

function buildImplementationEvent(target: Target, ts: string): StateEvent {
	switch (target.type) {
		case "slice":
			return { type: "COMPLETE_IMPLEMENTATION", slice: target.name, ts };
		case "quest":
			return { type: "COMPLETE_QUEST_IMPLEMENTATION", quest: target.name, ts };
		default:
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`submit('implementation') requires slice or quest target, got ${target.type}`,
			);
	}
}

// ── Result building ──────────────────────────────────────────

function buildSubmitResult(
	phase: string,
	target: Target,
	oldState: ProjectState,
	newState: ProjectState,
): SubmitResult {
	const entity = resolveEntityName(target);
	const { previousStatus, newStatus } = resolveStatuses(target, oldState, newState);

	return {
		entity,
		phase,
		previousStatus,
		newStatus,
		advanced: previousStatus !== newStatus,
	};
}

function resolveStatuses(
	target: Target,
	oldState: ProjectState,
	newState: ProjectState,
): { previousStatus: string; newStatus: string } {
	const entityPath = resolveEntityJsonPath(target);

	if (target.type === "epic") {
		const oldEpic = getJson<Epic>(oldState, entityPath);
		const newEpic = getJson<Epic>(newState, entityPath);
		return {
			previousStatus: oldEpic?.status ?? "none",
			newStatus: newEpic?.status ?? "unknown",
		};
	}

	if (target.type === "slice") {
		const oldSlice = getJson<Slice>(oldState, entityPath);
		const newSlice = getJson<Slice>(newState, entityPath);
		return {
			previousStatus: oldSlice?.status ?? "none",
			newStatus: newSlice?.status ?? "unknown",
		};
	}

	// Quest submit phases — deferred to slice 05.
	return { previousStatus: "pre-submit", newStatus: "post-submit" };
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Spread override only when defined — prevents `override: undefined`
 * which violates exactOptionalPropertyTypes on the StateEvent union.
 */
function spreadOverride(options?: WorkflowOptions): { override: boolean } | Record<string, never> {
	if (options?.override !== undefined) {
		return { override: options.override };
	}
	return {};
}

function requireEpicName(target: Target): string {
	if (target.type !== "epic") {
		throw new GoodplanError("VALIDATION_INVALID_INPUT", `Expected epic target, got ${target.type}`);
	}
	return target.name;
}
