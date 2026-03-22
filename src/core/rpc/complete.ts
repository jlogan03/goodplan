/**
 * RPC complete — runs entity completion via the state machine.
 * Pattern: loadState → build StateEvent → reduce → commitState → return CompleteResult.
 */

import type { Epic } from "../../schemas/entities/epic.js";
import type { StateEvent } from "../../schemas/state-events.js";
import { GoodplanError } from "../../util/errors.js";
import { commitState } from "../data/commit.js";
import { loadState } from "../data/load.js";
import { getJson } from "../tree.js";
import type { ProjectState } from "../tree.js";
import { reduce } from "../state/reduce.js";
import { isStateError } from "../state/types.js";
import type { CompleteInput, CompleteResult, Target, WorkflowOptions } from "./types.js";
import { resolveEntityJsonPath, resolveEntityName } from "./types.js";

/**
 * Complete an entity. Maps (target, input) to the appropriate COMPLETE_* event,
 * runs it through the state machine, and commits the result.
 */
export function complete(
	projectDir: string,
	target: Target,
	input: CompleteInput,
	_options?: WorkflowOptions,
): CompleteResult {
	const oldState = loadState(projectDir);
	const ts = new Date().toISOString();
	const event = buildCompleteEvent(target, input, ts);

	const result = reduce(oldState, event);

	if (isStateError(result)) {
		throw new GoodplanError(result.code, result.message, result.detail);
	}

	commitState(projectDir, oldState, result);

	return buildCompleteResult(target, oldState, result);
}

// ── Event building ───────────────────────────────────────────

function buildCompleteEvent(
	target: Target,
	input: CompleteInput,
	ts: string,
): StateEvent {
	switch (target.type) {
		case "epic": {
			if (input.type !== "epic") {
				throw new GoodplanError(
					"INTERNAL_ERROR",
					`CompleteInput.type '${input.type}' does not match target.type 'epic'`,
				);
			}
			return {
				type: "COMPLETE_EPIC",
				epic: target.name,
				ts,
				verificationResults: input.verificationResults,
			};
		}
		case "slice":
		case "quest":
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`complete({type:'${target.type}'}) is not yet implemented`,
			);
		default:
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`Cannot complete target type: ${target.type}`,
			);
	}
}

// ── Result building ──────────────────────────────────────────

function buildCompleteResult(
	target: Target,
	oldState: ProjectState,
	newState: ProjectState,
): CompleteResult {
	const entity = resolveEntityName(target);
	const entityPath = resolveEntityJsonPath(target);

	if (target.type !== "epic") {
		// buildCompleteEvent throws for non-epic targets, so this is unreachable.
		// Explicit guard prevents silently wrong results if non-epic support is added
		// to buildCompleteEvent without updating this function.
		throw new GoodplanError(
			"INTERNAL_ERROR",
			`buildCompleteResult not yet implemented for target type: ${target.type}`,
		);
	}

	const oldEpic = getJson<Epic>(oldState, entityPath);
	const newEpic = getJson<Epic>(newState, entityPath);

	return {
		entity,
		previousStatus: oldEpic?.status ?? "none",
		newStatus: newEpic?.status ?? "unknown",
	};
}
