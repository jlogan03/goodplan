/**
 * RPC begin — initiates a workflow phase via the state machine.
 * Pattern: loadState → build StateEvent → reduce → commitState → return BeginResult.
 */

import type { Epic } from "../../schemas/entities/epic.js";
import type { Project } from "../../schemas/entities/project.js";
import type { Quest } from "../../schemas/entities/quest.js";
import type { Slice } from "../../schemas/entities/slice.js";
import type { Task } from "../../schemas/entities/task.js";
import type { DecisionEntry } from "../../schemas/records/decision.js";
import type { LearningEntry } from "../../schemas/records/learning.js";
import type { StateEvent } from "../../schemas/state-events.js";
import { GoodplanError } from "../../util/errors.js";
import { VERSION } from "../../version.js";
import { commitState } from "../data/commit.js";
import { loadState } from "../data/load.js";
import type { MarkdownCopy } from "../data/markdown-files.js";
import { copyMarkdownFiles } from "../data/markdown-files.js";
import { reduce } from "../state/reduce.js";
import { isStateError } from "../state/types.js";
import { getJson, getJsonl } from "../tree.js";
import type { ProjectState } from "../tree.js";
import { computeNextCommands } from "./next-commands.js";
import { resolvePathReferences } from "./paths.js";
import type {
	BeginPayloadMap,
	BeginPhase,
	BeginResult,
	RollupResult,
	Target,
	WorkflowOptions,
} from "./types.js";
import { resolveEntityJsonPath, resolveEntityName } from "./types.js";
import { bumpDataVersionIfNeeded } from "./version-stamp.js";

/**
 * Begin a workflow phase. Maps (phase, target, payload) to a StateEvent,
 * runs it through the state machine, and commits the result.
 */
export function begin<P extends BeginPhase>(
	projectDir: string,
	phase: P,
	target: Target,
	payload: BeginPayloadMap[P],
	options?: WorkflowOptions,
): P extends "rollup" ? RollupResult : BeginResult {
	const oldState = loadState(projectDir);

	// Validate entityPath for create-decision before building event
	if (phase === "create-decision") {
		const cdPayload = payload as BeginPayloadMap["create-decision"];
		if (cdPayload.entityPath !== undefined) {
			validateEntityPath(oldState, cdPayload.entityPath);
		}
	}

	const ts = new Date().toISOString();
	const event = buildBeginEvent(phase, target, payload, ts);

	const result = reduce(oldState, event);

	if (isStateError(result)) {
		throw new GoodplanError(result.code, result.message, result.detail);
	}

	// Version stamp: bump project.json.version if CLI version > data version (INV-001 exception — see version-stamp.ts)
	const stampedResult = bumpDataVersionIfNeeded(result, VERSION);

	// For rollup: copy .md files from source to target scope before commitState
	if (phase === "rollup" && target.type === "rollup") {
		const copies = collectRollupMarkdownCopies(target, oldState, stampedResult);
		if (copies.length > 0) {
			copyMarkdownFiles(projectDir, copies);
		}
	}

	commitState(
		projectDir,
		oldState,
		stampedResult,
		options?.force === true ? { force: true } : undefined,
	);

	// Rollup has a different result type (RollupResult) — paths field not applicable
	if (phase === "rollup" && target.type === "rollup") {
		return buildRollupResult(target, oldState, stampedResult) as P extends "rollup"
			? RollupResult
			: BeginResult;
	}

	const baseResult = buildBeginResult(phase, target, oldState, stampedResult);
	const beginResult: BeginResult = {
		...baseResult,
		paths: resolvePathReferences(projectDir, target, phase),
		nextCommands: computeNextCommands(target, baseResult.newStatus),
	};
	return beginResult as P extends "rollup" ? RollupResult : BeginResult;
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
			if (target.type === "quest") {
				return { type: "BEGIN_QUEST_EXPLORE", quest: target.name, ts };
			}
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
		case "create-task": {
			const ctp = payload as BeginPayloadMap["create-task"];
			if (target.type !== "task") {
				throw new GoodplanError("VALIDATION_INVALID_INPUT", "create-task requires task target");
			}
			return {
				type: "CREATE_TASK",
				name: target.name,
				title: ctp.title,
				ts,
				...(ctp.description ? { description: ctp.description } : {}),
				...(ctp.context ? { context: ctp.context } : {}),
			};
		}
		case "drop-task": {
			const dtp = payload as BeginPayloadMap["drop-task"];
			if (target.type !== "task") {
				throw new GoodplanError("VALIDATION_INVALID_INPUT", "drop-task requires task target");
			}
			return {
				type: "DROP_TASK",
				name: target.name,
				reason: dtp.reason,
				ts,
			};
		}
		case "convert-task": {
			const cvp = payload as BeginPayloadMap["convert-task"];
			if (target.type !== "task") {
				throw new GoodplanError("VALIDATION_INVALID_INPUT", "convert-task requires task target");
			}
			return {
				type: "CONVERT_TASK",
				name: target.name,
				to: cvp.to,
				convertedName: cvp.name ?? target.name,
				ts,
				...(cvp.goal ? { convertedGoal: cvp.goal } : {}),
			};
		}
		case "create-decision": {
			const cdp = payload as BeginPayloadMap["create-decision"];
			return {
				type: "CREATE_DECISION",
				id: cdp.id,
				domain: cdp.domain,
				title: cdp.title,
				summary: cdp.summary,
				...(cdp.entityPath !== undefined ? { entityPath: cdp.entityPath } : {}),
				...(cdp.reconsiderWhen !== undefined ? { reconsiderWhen: cdp.reconsiderWhen } : {}),
				ts,
			};
		}
		case "update-decision": {
			const udp = payload as BeginPayloadMap["update-decision"];
			if (target.type !== "decision") {
				throw new GoodplanError(
					"VALIDATION_INVALID_INPUT",
					"update-decision requires decision target",
				);
			}
			return {
				type: "UPDATE_DECISION",
				id: target.id,
				changes: udp.changes,
				ts,
			};
		}
		case "rollup": {
			const rp = payload as BeginPayloadMap["rollup"];
			return {
				type: "ROLLUP_LEARNINGS",
				from: rp.from,
				to: rp.to,
				ts,
			};
		}
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
		case "task":
			throw new GoodplanError(
				"INTERNAL_ERROR",
				"Use begin('create-task', ...) for task creation, not begin('create', {type:'task'})",
			);
		case "decision":
			throw new GoodplanError(
				"INTERNAL_ERROR",
				"Use begin('create-decision', ...) for decision creation, not begin('create', {type:'decision'})",
			);
		case "rollup":
			throw new GoodplanError(
				"INTERNAL_ERROR",
				"Rollup target cannot be used with begin('create', ...)",
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
			return {
				type: "ABANDON_SLICE",
				slice: target.name,
				epic: target.epic,
				ts,
				reason: payload.reason,
			};
		case "quest":
			return { type: "ABANDON_QUEST", quest: target.name, ts, reason: payload.reason };
		default:
			throw new GoodplanError("INTERNAL_ERROR", `Cannot abandon target type: ${target.type}`);
	}
}

function buildPlanPhaseEvent(target: Target, ts: string): StateEvent {
	switch (target.type) {
		case "slice":
			return { type: "BEGIN_PLAN", slice: target.name, epic: target.epic, ts };
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
			return { type: "BEGIN_REFINEMENT", slice: target.name, epic: target.epic, ts };
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
			return { type: "BEGIN_IMPLEMENTATION", slice: target.name, epic: target.epic, ts };
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
): Omit<BeginResult, "nextCommands" | "paths"> {
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
	} else if (target.type === "task") {
		const oldTask = getJson<Task>(oldState, entityPath);
		const newTask = getJson<Task>(newState, entityPath);
		previousStatus = oldTask?.status ?? "none";
		newStatus = newTask?.status ?? "unknown";
	} else if (target.type === "decision") {
		// Decision entries live in decisions.jsonl — find by id to extract status
		const oldDecisions = getJsonl<DecisionEntry>(oldState, "decisions.jsonl") ?? [];
		const newDecisions = getJsonl<DecisionEntry>(newState, "decisions.jsonl") ?? [];
		const oldDecision = oldDecisions.find((d) => d.id === target.id);
		const newDecision = newDecisions.find((d) => d.id === target.id);
		previousStatus = oldDecision?.status ?? "none";
		newStatus = newDecision?.status ?? "unknown";
	}

	return { entity, phase, previousStatus, newStatus };
}

function buildRollupResult(
	target: Extract<Target, { type: "rollup" }>,
	oldState: ProjectState,
	newState: ProjectState,
): RollupResult {
	// Count how many learnings were removed from the source scope
	const sourcePath = `${target.from}/learnings.jsonl`;
	const oldLearnings = getJsonl<LearningEntry>(oldState, sourcePath) ?? [];
	const newLearnings = getJsonl<LearningEntry>(newState, sourcePath) ?? [];
	const rolledUp = oldLearnings.length - newLearnings.length;

	return {
		phase: "rollup",
		from: target.from,
		to: target.to,
		rolledUp,
	};
}

/**
 * Collect markdown file copies needed for ROLLUP_LEARNINGS.
 * New-format entries (with `file` field) need their .md files copied
 * from <source-scope>/learnings/<slug>.md to <target-scope>/learnings/<slug>.md.
 * The target scope path is resolved from the target label ("project" or "epic").
 */
function collectRollupMarkdownCopies(
	target: Extract<Target, { type: "rollup" }>,
	oldState: ProjectState,
	newState: ProjectState,
): MarkdownCopy[] {
	// Resolve target scope path (mirrors resolveTargetPath in rollup-learnings.ts)
	let targetScopePath: string;
	if (target.to === "project") {
		targetScopePath = "";
	} else if (target.to === "epic") {
		const project = getJson<Project>(newState, "project.json");
		if (project === undefined || project.activeEpic === null) return [];
		targetScopePath = `epics/${project.activeEpic}`;
	} else {
		return [];
	}

	// Find newly added entries at target that have a `file` field
	const targetJsonlPath = targetScopePath
		? `${targetScopePath}/learnings.jsonl`
		: "learnings.jsonl";
	const oldEntries = getJsonl<LearningEntry>(oldState, targetJsonlPath) ?? [];
	const newEntries = getJsonl<LearningEntry>(newState, targetJsonlPath) ?? [];
	// Relies on JSONL being append-only — new entries are at the end after oldEntries.length
	const addedEntries = newEntries.slice(oldEntries.length);

	const copies: MarkdownCopy[] = [];
	for (const entry of addedEntries) {
		// Source: <from-scope>/<file> (e.g., "epics/e1/slices/s1/learnings/slug.md")
		const fromPath = `${target.from}/${entry.file}`;
		// Target: <target-scope>/<file> (e.g., "learnings/slug.md" at project level or "epics/e1/learnings/slug.md")
		const toPath = targetScopePath ? `${targetScopePath}/${entry.file}` : entry.file;
		copies.push({ from: fromPath, to: toPath });
	}

	return copies;
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Validate that entityPath resolves to an existing entity in the state tree.
 * Acceptable paths: epics/<name>, epics/<name>/slices/<name>, quests/<name>, tasks/<name>.
 * Validation uses getJson() against the in-memory state tree — no filesystem I/O.
 */
function validateEntityPath(state: ProjectState, entityPath: string): void {
	const segments = entityPath.split("/").filter((s) => s.length > 0);
	const first = segments[0];

	// Determine which JSON file to look up based on path structure
	let jsonPath: string | undefined;

	if (first === "epics" && segments.length === 2) {
		// epics/<name> → epic.json
		jsonPath = `${entityPath}/epic.json`;
	} else if (first === "epics" && segments.length === 4 && segments[2] === "slices") {
		// epics/<name>/slices/<name> → slice.json
		jsonPath = `${entityPath}/slice.json`;
	} else if (first === "quests" && segments.length === 2) {
		// quests/<name> → quest.json
		jsonPath = `${entityPath}/quest.json`;
	} else if (first === "tasks" && segments.length === 2) {
		// tasks/<name> → task.json
		jsonPath = `${entityPath}/task.json`;
	}

	if (jsonPath === undefined) {
		throw new GoodplanError(
			"VALIDATION_INVALID_INPUT",
			`Invalid entityPath "${entityPath}": must be epics/<name>, epics/<name>/slices/<name>, quests/<name>, or tasks/<name>`,
		);
	}

	const entry = getJson(state, jsonPath);
	if (entry === undefined) {
		throw new GoodplanError(
			"VALIDATION_INVALID_INPUT",
			`entityPath "${entityPath}" does not resolve to an existing entity`,
		);
	}
}

function requireEpicName(target: Target): string {
	if (target.type !== "epic") {
		throw new GoodplanError("VALIDATION_INVALID_INPUT", `Expected epic target, got ${target.type}`);
	}
	return target.name;
}
