import type { Epic, EpicStatus } from "../../../schemas/entities/epic.js";
import type { Overview } from "../../../schemas/entities/overview.js";
import type { Project } from "../../../schemas/entities/project.js";
import type { Slice, SliceStatus } from "../../../schemas/entities/slice.js";
import type { Refinement } from "../../../schemas/shared.js";
/**
 * Shared helpers for transition handlers.
 * Pure functions — no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { getJson, getJsonl, setEntry } from "../../tree.js";
import type { StateError } from "../types.js";

// ── Constants ────────────────────────────────────────────────

/** Default maximum refinement rounds. Shared by all BEGIN_REFINE handlers. */
export const MAX_REFINEMENT_ROUNDS = 10;

/** Activity log phase for deferred items skipped due to missing target slice. */
export const ACTIVITY_PHASE_DEFERRED_SKIP = "deferred-skip";

// ── Epic helpers ────────────────────────────────────────────

export function getEpic(state: ProjectState, name: string): Epic | undefined {
	return getJson<Epic>(state, `epics/${name}/epic.json`);
}

export function getProject(state: ProjectState): Project | undefined {
	return getJson<Project>(state, "project.json");
}

/**
 * Guard that the named epic exists and is in one of the expected statuses.
 * Returns the Epic on success, or a StateError on failure.
 * Callers use `isStateError()` to narrow the return type.
 */
export function guardEpicStatus(
	epic: Epic | undefined,
	epicName: string,
	expected: EpicStatus | EpicStatus[],
	eventType: string,
): Epic | StateError {
	if (epic === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Epic "${epicName}" not found`,
			detail: { epic: epicName, event: eventType },
		};
	}
	const allowed: EpicStatus[] = Array.isArray(expected) ? expected : [expected];
	if (!allowed.includes(epic.status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot ${eventType} on epic "${epicName}" in status "${epic.status}" (expected ${allowed.join(" or ")})`,
			detail: { epic: epicName, event: eventType, currentStatus: epic.status },
		};
	}
	return epic;
}

export function setEpicStatus(
	state: ProjectState,
	name: string,
	epic: Epic,
	newStatus: EpicStatus,
	ts: string,
): ProjectState {
	return setEntry(state, `epics/${name}/epic.json`, {
		type: "json",
		content: { ...epic, status: newStatus, updated: ts },
	});
}

export function setEpicJson(state: ProjectState, name: string, content: Epic): ProjectState {
	return setEntry(state, `epics/${name}/epic.json`, {
		type: "json",
		content,
	});
}

// ── Overview sync ────────────────────────────────────────────

/**
 * Update the epic's status in epics/overview.json.
 * Called on every epic status change to keep overview in sync.
 */
export function updateOverviewStatus(
	state: ProjectState,
	epicName: string,
	newStatus: string,
): ProjectState {
	const overview = getJson<Overview>(state, "epics/overview.json");
	if (overview === undefined) return state;
	return setEntry(state, "epics/overview.json", {
		type: "json",
		content: {
			...overview,
			items: overview.items.map((item) =>
				item.name === epicName ? { ...item, status: newStatus } : item,
			),
		},
	});
}

// ── Slice helpers ────────────────────────────────────────────

export function getSlice(state: ProjectState, name: string): Slice | undefined {
	return getJson<Slice>(state, `slices/${name}/slice.json`);
}

/**
 * Guard that the named slice exists and is in one of the expected statuses.
 * Returns the Slice on success, or a StateError on failure.
 * Callers use `isStateError()` to narrow the return type.
 */
export function guardSliceStatus(
	slice: Slice | undefined,
	sliceName: string,
	expected: SliceStatus | SliceStatus[],
	eventType: string,
): Slice | StateError {
	if (slice === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Slice "${sliceName}" not found`,
			detail: { slice: sliceName, event: eventType },
		};
	}
	const allowed: SliceStatus[] = Array.isArray(expected) ? expected : [expected];
	if (!allowed.includes(slice.status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot ${eventType} on slice "${sliceName}" in status "${slice.status}" (expected ${allowed.join(" or ")})`,
			detail: { slice: sliceName, event: eventType, currentStatus: slice.status },
		};
	}
	return slice;
}

export function setSliceJson(state: ProjectState, name: string, content: Slice): ProjectState {
	return setEntry(state, `slices/${name}/slice.json`, {
		type: "json",
		content,
	});
}

/**
 * Sugar over setSliceJson: sets status, updated timestamp, and syncs overview.
 * Prevents partial updates by bundling all status-change side effects.
 */
export function setSliceStatus(
	state: ProjectState,
	name: string,
	slice: Slice,
	newStatus: SliceStatus,
	ts: string,
): ProjectState {
	let tree = setSliceJson(state, name, { ...slice, status: newStatus, updated: ts });
	tree = updateSliceOverviewStatus(tree, name, newStatus);
	return tree;
}

/**
 * Update the slice's status in slices/overview.json.
 * Called on every slice status change to keep overview in sync.
 */
export function updateSliceOverviewStatus(
	state: ProjectState,
	sliceName: string,
	newStatus: string,
): ProjectState {
	const overview = getJson<Overview>(state, "slices/overview.json");
	if (overview === undefined) return state;
	return setEntry(state, "slices/overview.json", {
		type: "json",
		content: {
			...overview,
			items: overview.items.map((item) =>
				item.name === sliceName ? { ...item, status: newStatus } : item,
			),
		},
	});
}

// ── Terminal status check (slice) ───────────────────────────

const SLICE_TERMINAL_STATUSES: ReadonlySet<SliceStatus> = new Set(["completed", "abandoned"]);

export function isSliceTerminal(status: SliceStatus): boolean {
	return SLICE_TERMINAL_STATUSES.has(status);
}

// ── Activity log ────────────────────────────────────────────

/**
 * Append an activity log entry with an explicit timestamp from the event.
 * All events now carry `ts`, so this is the sole activity log helper.
 */
export function appendActivityLog(
	state: ProjectState,
	ts: string,
	phase: string,
	scope: string,
	summary: string,
): ProjectState {
	const log = getJsonl<Record<string, unknown>>(state, "activity-log.jsonl") ?? [];
	return setEntry(state, "activity-log.jsonl", {
		type: "jsonl",
		content: [...log, { ts, phase, scope, status: "complete", summary }],
	});
}

// ── Refinement circuit breaker ──────────────────────────────

const SCORE_THRESHOLD = 9;

export interface RefinementInput {
	scores: Record<string, number>;
	override?: boolean | undefined;
}

export type RefinementOutcome =
	| { action: "advance" }
	| { action: "stay"; newRefinement: Refinement }
	| { action: "error"; error: StateError };

/**
 * Shared circuit breaker logic for all refinement events.
 * Returns the appropriate action based on scores, override flag, and round count.
 *
 * Skip-path behavior: when `refinement === null` (entering from a non-refining status
 * like architecture-defined or slices-defined, where no BEGIN_REFINE was issued), scores
 * are ignored and the outcome is "advance". This is correct because no refinement state
 * was initialized — there are no rounds to track and no circuit breaker to enforce.
 * The caller's guardEpicStatus already validated the skip path is a legal transition.
 */
export function evaluateRefinement(
	refinement: Refinement | null,
	input: RefinementInput,
): RefinementOutcome {
	const allAbove = Object.values(input.scores).every((s) => s >= SCORE_THRESHOLD);

	// Scores pass threshold OR override — advance
	if (allAbove || input.override === true) {
		return { action: "advance" };
	}

	// No refinement state yet (skip path — see docstring above)
	if (refinement === null) {
		return { action: "advance" };
	}

	// Check circuit breaker
	if (refinement.round >= refinement.maxRounds) {
		return {
			action: "error",
			error: {
				code: "STATE_MAX_ROUNDS_REACHED",
				message: `Maximum refinement rounds (${refinement.maxRounds}) reached. Use override to force advancement.`,
				detail: { round: refinement.round, maxRounds: refinement.maxRounds },
			},
		};
	}

	// Stay in refining — increment round, record scores
	return {
		action: "stay",
		newRefinement: {
			round: refinement.round + 1,
			maxRounds: refinement.maxRounds,
			scoreHistory: [...refinement.scoreHistory, { round: refinement.round, scores: input.scores }],
		},
	};
}

// ── Terminal status check ───────────────────────────────────

const EPIC_TERMINAL_STATUSES: ReadonlySet<EpicStatus> = new Set(["completed", "abandoned"]);

export function isEpicTerminal(status: EpicStatus): boolean {
	return EPIC_TERMINAL_STATUSES.has(status);
}
