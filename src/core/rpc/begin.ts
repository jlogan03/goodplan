/**
 * RPC begin — initiates a workflow phase via the state machine.
 * Pattern: loadState → build StateEvent → reduce → commitState → return BeginResult.
 */

import type { Epic } from "../../schemas/entities/epic.js";
import type { Project } from "../../schemas/entities/project.js";
import type { Quest } from "../../schemas/entities/quest.js";
import type { Slice } from "../../schemas/entities/slice.js";
import type { StateEvent } from "../../schemas/state-events.js";
import { GoodplanError } from "../../util/errors.js";
import { commitState } from "../data/commit.js";
import { loadState } from "../data/load.js";
import { reduce } from "../state/reduce.js";
import { isStateError } from "../state/types.js";
import { getJson } from "../tree.js";
import type { ProjectState } from "../tree.js";
import type { BeginPayloadMap, BeginPhase, BeginResult, Target, WorkflowOptions } from "./types.js";
import { resolveEntityJsonPath, resolveEntityName } from "./types.js";

/**
 * Begin a workflow phase. Maps (phase, target, payload) to a StateEvent,
 * runs it through the state machine, and commits the result.
 */
export function begin<P extends BeginPhase>(
	projectDir: string,
	phase: P,
	target: Target,
	payload: BeginPayloadMap[P],
	_options?: WorkflowOptions,
): BeginResult {
	const oldState = loadState(projectDir);
	const ts = new Date().toISOString();
	const event = buildBeginEvent(phase, target, payload, ts);

	const result = reduce(oldState, event);

	if (isStateError(result)) {
		throw new GoodplanError(result.code, result.message, result.detail);
	}

	commitState(projectDir, oldState, result);

	return buildBeginResult(phase, target, oldState, result);
}

// ── Event building ───────────────────────────────────────────

function buildBeginEvent<P extends BeginPhase>(
	phase: P,
	target: Target,
	payload: BeginPayloadMap[P],
	ts: string,
): StateEvent {
	// Cast safety: TypeScript cannot narrow the generic P inside a switch on phase,
	// so `as BeginPayloadMap[X]` casts are required. Each cast is safe because
	// the switch case guarantees phase === X, and P extends BeginPhase ensures
	// payload: BeginPayloadMap[P] matches BeginPayloadMap[X] when P === X.
	switch (phase) {
		case "create":
			return buildCreateEvent(target, payload as BeginPayloadMap["create"], ts);
		case "explore":
			return { type: "BEGIN_EXPLORE", epic: requireEpicName(target), ts };
		case "define-architecture":
			return { type: "BEGIN_ARCHITECTURE", epic: requireEpicName(target), ts };
		case "refine-architecture":
			return { type: "BEGIN_REFINE_ARCHITECTURE", epic: requireEpicName(target), ts };
		case "define-slices":
			return { type: "BEGIN_SLICING", epic: requireEpicName(target), ts };
		case "refine-slices":
			return { type: "BEGIN_REFINE_SLICES", epic: requireEpicName(target), ts };
		case "activate":
			return { type: "ACTIVATE_EPIC", epic: requireEpicName(target), ts };
		case "abandon":
			return buildAbandonEvent(target, payload as BeginPayloadMap["abandon"], ts);
		case "add-verification":
			return {
				type: "ADD_VERIFICATION",
				epic: requireEpicName(target),
				ts,
				verification: (payload as BeginPayloadMap["add-verification"]).verification,
			};
		case "update-verification": {
			const p = payload as BeginPayloadMap["update-verification"];
			return {
				type: "UPDATE_VERIFICATION",
				epic: requireEpicName(target),
				ts,
				index: p.index,
				verification: p.verification,
			};
		}
		case "plan":
			return buildPlanPhaseEvent(target, ts);
		case "refine-plan":
			return buildRefinePlanEvent(target, ts);
		case "implement":
			return buildImplementEvent(target, ts);
		case "update-decision":
		case "rollup":
			throw new GoodplanError("INTERNAL_ERROR", `begin('${phase}') is not yet implemented`);
		default: {
			const _exhaustive: never = phase;
			throw new GoodplanError("INTERNAL_ERROR", `Unknown begin phase: ${String(_exhaustive)}`);
		}
	}
}

function buildCreateEvent(
	target: Target,
	payload: BeginPayloadMap["create"],
	ts: string,
): StateEvent {
	switch (target.type) {
		case "project":
			return { type: "INIT_PROJECT", name: payload.name, ts };
		case "epic": {
			if (payload.goal === undefined) {
				throw new GoodplanError(
					"VALIDATION_INVALID_INPUT",
					"goal is required when creating an epic",
				);
			}
			return {
				type: "CREATE_EPIC",
				name: payload.name,
				goal: payload.goal,
				ts,
			};
		}
		case "slice": {
			if (payload.epic === undefined) {
				throw new GoodplanError("VALIDATION_INVALID_INPUT", "slice:create requires --epic <name>");
			}
			if (payload.goal === undefined) {
				throw new GoodplanError(
					"VALIDATION_INVALID_INPUT",
					"goal is required when creating a slice",
				);
			}
			return {
				type: "CREATE_SLICE",
				name: payload.name,
				epic: payload.epic,
				goal: payload.goal,
				ts,
			};
		}
		case "quest": {
			if (payload.goal === undefined) {
				throw new GoodplanError(
					"VALIDATION_INVALID_INPUT",
					"goal is required when creating a quest",
				);
			}
			return {
				type: "CREATE_QUEST",
				name: payload.name,
				goal: payload.goal,
				ts,
			};
		}
		case "decision":
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`begin('create', {type:'${target.type}'}) is not yet implemented`,
			);
		default: {
			const _exhaustive: never = target;
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`Unknown target type for create: ${String((_exhaustive as Target).type)}`,
			);
		}
	}
}

function buildAbandonEvent(
	target: Target,
	payload: BeginPayloadMap["abandon"],
	ts: string,
): StateEvent {
	switch (target.type) {
		case "epic":
			return { type: "ABANDON_EPIC", epic: target.name, ts, reason: payload.reason };
		case "slice":
			return { type: "ABANDON_SLICE", slice: target.name, ts, reason: payload.reason };
		case "quest":
			return { type: "ABANDON_QUEST", quest: target.name, ts, reason: payload.reason };
		default:
			throw new GoodplanError("INTERNAL_ERROR", `Cannot abandon target type: ${target.type}`);
	}
}

function buildPlanPhaseEvent(target: Target, ts: string): StateEvent {
	switch (target.type) {
		case "slice":
			return { type: "BEGIN_PLAN", slice: target.name, ts };
		case "quest":
			return { type: "BEGIN_QUEST_PLAN", quest: target.name, ts };
		default:
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`begin('plan') requires slice or quest target, got ${target.type}`,
			);
	}
}

function buildRefinePlanEvent(target: Target, ts: string): StateEvent {
	switch (target.type) {
		case "slice":
			return { type: "BEGIN_REFINEMENT", slice: target.name, ts };
		case "quest":
			return { type: "BEGIN_QUEST_REFINEMENT", quest: target.name, ts };
		default:
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`begin('refine-plan') requires slice or quest target, got ${target.type}`,
			);
	}
}

function buildImplementEvent(target: Target, ts: string): StateEvent {
	switch (target.type) {
		case "slice":
			return { type: "BEGIN_IMPLEMENTATION", slice: target.name, ts };
		case "quest":
			return { type: "BEGIN_QUEST_IMPLEMENTATION", quest: target.name, ts };
		default:
			throw new GoodplanError(
				"INTERNAL_ERROR",
				`begin('implement') requires slice or quest target, got ${target.type}`,
			);
	}
}

// ── Result building ──────────────────────────────────────────

function buildBeginResult(
	phase: string,
	target: Target,
	oldState: ProjectState,
	newState: ProjectState,
): BeginResult {
	const entityPath = resolveEntityJsonPath(target);
	const entity = resolveEntityName(target);

	let previousStatus = "none";
	let newStatus = "unknown";

	if (phase === "create" && target.type === "project") {
		previousStatus = "none";
		const project = getJson<Project>(newState, "project.json");
		newStatus = project !== undefined ? "initialized" : "unknown";
	} else if (target.type === "epic") {
		const oldEpic = getJson<Epic>(oldState, entityPath);
		const newEpic = getJson<Epic>(newState, entityPath);
		previousStatus = oldEpic?.status ?? "none";
		newStatus = newEpic?.status ?? "unknown";
	} else if (target.type === "slice") {
		const oldSlice = getJson<Slice>(oldState, entityPath);
		const newSlice = getJson<Slice>(newState, entityPath);
		previousStatus = oldSlice?.status ?? "none";
		newStatus = newSlice?.status ?? "unknown";
	} else if (target.type === "quest") {
		const oldQuest = getJson<Quest>(oldState, entityPath);
		const newQuest = getJson<Quest>(newState, entityPath);
		previousStatus = oldQuest?.status ?? "none";
		newStatus = newQuest?.status ?? "unknown";
	}

	return { entity, phase, previousStatus, newStatus };
}

// ── Helpers ──────────────────────────────────────────────────

function requireEpicName(target: Target): string {
	if (target.type !== "epic") {
		throw new GoodplanError("VALIDATION_INVALID_INPUT", `Expected epic target, got ${target.type}`);
	}
	return target.name;
}
