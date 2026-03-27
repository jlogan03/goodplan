import type { Epic, EpicStatus, Verification } from "../../../schemas/entities/epic.js";
import type { EpicOverview, Overview, SliceOverviewItem } from "../../../schemas/entities/overview.js";
import type { Project } from "../../../schemas/entities/project.js";
import type { Quest, QuestStatus } from "../../../schemas/entities/quest.js";
import type { Slice, SliceStatus } from "../../../schemas/entities/slice.js";
import type { Task, TaskStatus } from "../../../schemas/entities/task.js";
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
	newStatus: EpicStatus,
): ProjectState {
	const overview = getJson<EpicOverview>(state, "epics/overview.json");
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

/** @deprecated Use `getSlice(state, epic, name)` — legacy flat path lookup. */
export function getSlice(state: ProjectState, name: string): Slice | undefined;
/** Get a slice by epic and name (nested path). */
export function getSlice(state: ProjectState, epic: string, name: string): Slice | undefined;
export function getSlice(state: ProjectState, epicOrName: string, name?: string): Slice | undefined {
	if (name !== undefined) {
		return getJson<Slice>(state, `epics/${epicOrName}/slices/${name}/slice.json`);
	}
	return getJson<Slice>(state, `slices/${epicOrName}/slice.json`);
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
	epicName?: string,
): Slice | StateError {
	const context = epicName ? `Slice "${sliceName}" not found in epic "${epicName}"` : `Slice "${sliceName}" not found`;
	if (slice === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: context,
			detail: { slice: sliceName, ...(epicName ? { epic: epicName } : {}), event: eventType },
		};
	}
	const allowed: SliceStatus[] = Array.isArray(expected) ? expected : [expected];
	if (!allowed.includes(slice.status)) {
		const epicCtx = epicName ? ` in epic "${epicName}"` : "";
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot ${eventType} on slice "${sliceName}"${epicCtx} in status "${slice.status}" (expected ${allowed.join(" or ")})`,
			detail: { slice: sliceName, ...(epicName ? { epic: epicName } : {}), event: eventType, currentStatus: slice.status },
		};
	}
	return slice;
}

/** @deprecated Use `setSliceJson(state, epic, name, content)` — legacy flat path. */
export function setSliceJson(state: ProjectState, name: string, content: Slice): ProjectState;
/** Set slice JSON by epic and name (nested path). */
export function setSliceJson(state: ProjectState, epic: string, name: string, content: Slice): ProjectState;
export function setSliceJson(state: ProjectState, epicOrName: string, nameOrContent: string | Slice, content?: Slice): ProjectState {
	if (content !== undefined) {
		// New signature: (state, epic, name, content)
		return setEntry(state, `epics/${epicOrName}/slices/${nameOrContent as string}/slice.json`, {
			type: "json",
			content,
		});
	}
	// Legacy signature: (state, name, content)
	return setEntry(state, `slices/${epicOrName}/slice.json`, {
		type: "json",
		content: nameOrContent as Slice,
	});
}

/**
 * Sugar over setSliceJson: sets status, updated timestamp, and syncs overview.
 * Prevents partial updates by bundling all status-change side effects.
 */
/** @deprecated Use `setSliceStatus(state, epic, name, slice, newStatus, ts)` — legacy flat path. */
export function setSliceStatus(state: ProjectState, name: string, slice: Slice, newStatus: SliceStatus, ts: string): ProjectState;
/** Set slice status by epic and name (nested path). */
export function setSliceStatus(state: ProjectState, epic: string, name: string, slice: Slice, newStatus: SliceStatus, ts: string): ProjectState;
export function setSliceStatus(
	state: ProjectState,
	epicOrName: string,
	nameOrSlice: string | Slice,
	sliceOrNewStatus: Slice | SliceStatus,
	newStatusOrTs?: SliceStatus | string,
	ts?: string,
): ProjectState {
	if (ts !== undefined) {
		// New signature: (state, epic, name, slice, newStatus, ts)
		const epic = epicOrName;
		const name = nameOrSlice as string;
		const slice = sliceOrNewStatus as Slice;
		const newStatus = newStatusOrTs as SliceStatus;
		let tree = setSliceJson(state, epic, name, { ...slice, status: newStatus, updated: ts });
		tree = updateSliceOverviewStatus(tree, epic, name, newStatus);
		return tree;
	}
	// Legacy signature: (state, name, slice, newStatus, ts)
	const name = epicOrName;
	const slice = nameOrSlice as Slice;
	const newStatus = sliceOrNewStatus as SliceStatus;
	const legacyTs = newStatusOrTs as string;
	let tree = setSliceJson(state, name, { ...slice, status: newStatus, updated: legacyTs });
	tree = updateSliceOverviewStatus(tree, name, newStatus);
	return tree;
}

/**
 * Update the slice's status in the overview.
 * Legacy: updates slices/overview.json. New: updates embedded slice in epics/overview.json.
 */
/** @deprecated Use `updateSliceOverviewStatus(state, epicName, sliceName, newStatus)` — legacy flat overview. */
export function updateSliceOverviewStatus(state: ProjectState, sliceName: string, newStatus: SliceStatus): ProjectState;
/** Update slice status in epic's embedded slices array in epics/overview.json. */
export function updateSliceOverviewStatus(state: ProjectState, epicName: string, sliceName: string, newStatus: SliceStatus): ProjectState;
export function updateSliceOverviewStatus(
	state: ProjectState,
	epicOrSliceName: string,
	sliceNameOrNewStatus: string | SliceStatus,
	newStatus?: SliceStatus,
): ProjectState {
	if (newStatus !== undefined) {
		// New signature: (state, epicName, sliceName, newStatus)
		const epicName = epicOrSliceName;
		const sliceName = sliceNameOrNewStatus as string;
		const overview = getJson<EpicOverview>(state, "epics/overview.json");
		if (overview === undefined) return state;
		const completed = isSliceTerminal(newStatus) ? new Date().toISOString() : null;
		return setEntry(state, "epics/overview.json", {
			type: "json",
			content: {
				...overview,
				items: overview.items.map((item) =>
					item.name === epicName
						? {
								...item,
								slices: item.slices.map((s) =>
									s.name === sliceName ? { ...s, status: newStatus, ...(completed ? { completed } : {}) } : s,
								),
							}
						: item,
				),
			},
		});
	}
	// Legacy signature: (state, sliceName, newStatus)
	const sliceName = epicOrSliceName;
	const legacyNewStatus = sliceNameOrNewStatus as SliceStatus;
	const overview = getJson<Overview>(state, "slices/overview.json");
	if (overview === undefined) return state;
	return setEntry(state, "slices/overview.json", {
		type: "json",
		content: {
			...overview,
			items: overview.items.map((item) =>
				item.name === sliceName ? { ...item, status: legacyNewStatus } : item,
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

// ── Quest helpers ────────────────────────────────────────────

export function getQuest(state: ProjectState, name: string): Quest | undefined {
	return getJson<Quest>(state, `quests/${name}/quest.json`);
}

/**
 * Guard that the named quest exists and is in one of the expected statuses.
 * Returns the Quest on success, or a StateError on failure.
 * Callers use `isStateError()` to narrow the return type.
 */
export function guardQuestStatus(
	quest: Quest | undefined,
	questName: string,
	expected: QuestStatus | QuestStatus[],
	eventType: string,
): Quest | StateError {
	if (quest === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Quest "${questName}" not found`,
			detail: { quest: questName, event: eventType },
		};
	}
	const allowed: QuestStatus[] = Array.isArray(expected) ? expected : [expected];
	if (!allowed.includes(quest.status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot ${eventType} on quest "${questName}" in status "${quest.status}" (expected ${allowed.join(" or ")})`,
			detail: { quest: questName, event: eventType, currentStatus: quest.status },
		};
	}
	return quest;
}

export function setQuestJson(state: ProjectState, name: string, content: Quest): ProjectState {
	return setEntry(state, `quests/${name}/quest.json`, {
		type: "json",
		content,
	});
}

/**
 * Sugar over setQuestJson: sets status, updated timestamp, and syncs overview.
 * Prevents partial updates by bundling all status-change side effects.
 */
export function setQuestStatus(
	state: ProjectState,
	name: string,
	quest: Quest,
	newStatus: QuestStatus,
	ts: string,
): ProjectState {
	let tree = setQuestJson(state, name, { ...quest, status: newStatus, updated: ts });
	tree = updateQuestOverviewStatus(tree, name, newStatus);
	return tree;
}

/**
 * Update the quest's status in quests/overview.json.
 * Called on every quest status change to keep overview in sync.
 */
export function updateQuestOverviewStatus(
	state: ProjectState,
	questName: string,
	newStatus: QuestStatus,
): ProjectState {
	const overview = getJson<Overview>(state, "quests/overview.json");
	if (overview === undefined) return state;
	return setEntry(state, "quests/overview.json", {
		type: "json",
		content: {
			...overview,
			items: overview.items.map((item) =>
				item.name === questName ? { ...item, status: newStatus } : item,
			),
		},
	});
}

/**
 * Add a new quest entry to quests/overview.json.
 * Centralises the overview item shape for quest creation.
 */
export function addQuestToOverview(
	state: ProjectState,
	questName: string,
	status: QuestStatus,
	ts: string,
): ProjectState {
	const overview = getJson<Overview>(state, "quests/overview.json");
	if (overview === undefined) {
		throw new Error("quests/overview.json not found — is the project initialized?");
	}
	return setEntry(state, "quests/overview.json", {
		type: "json",
		content: {
			...overview,
			items: [...overview.items, { name: questName, status, created: ts, completed: null }],
		},
	});
}

// ── Terminal status check (quest) ───────────────────────────

const QUEST_TERMINAL_STATUSES: ReadonlySet<QuestStatus> = new Set(["completed", "abandoned"]);

export function isQuestTerminal(status: QuestStatus): boolean {
	return QUEST_TERMINAL_STATUSES.has(status);
}

// ── Epic overview helper ────────────────────────────────────

/**
 * Add a new epic entry to epics/overview.json.
 * Centralises the overview item shape for epic creation.
 * Parallels addQuestToOverview for quests.
 */
export function addEpicToOverview(
	state: ProjectState,
	epicName: string,
	status: EpicStatus,
	ts: string,
): ProjectState {
	const overview = getJson<EpicOverview>(state, "epics/overview.json");
	if (overview === undefined) {
		throw new Error("epics/overview.json not found — is the project initialized?");
	}
	return setEntry(state, "epics/overview.json", {
		type: "json",
		content: {
			...overview,
			items: [...overview.items, { name: epicName, status, created: ts, completed: null, slices: [] }],
		},
	});
}

/**
 * Add a new slice entry to its epic's embedded slices array in epics/overview.json.
 * The epic must already exist in the overview.
 */
export function addSliceToOverview(
	state: ProjectState,
	epicName: string,
	sliceItem: SliceOverviewItem,
): ProjectState {
	const overview = getJson<EpicOverview>(state, "epics/overview.json");
	if (overview === undefined) {
		throw new Error("epics/overview.json not found — is the project initialized?");
	}
	return setEntry(state, "epics/overview.json", {
		type: "json",
		content: {
			...overview,
			items: overview.items.map((item) =>
				item.name === epicName
					? { ...item, slices: [...item.slices, sliceItem] }
					: item,
			),
		},
	});
}

// ── Entity builders ─────────────────────────────────────────

/**
 * Build initial quest.json content.
 * Shared by handleCreateQuest and handleConvertTask to avoid shape duplication.
 */
export function buildInitialQuestJson(name: string, goal: string, ts: string) {
	return {
		name,
		goal,
		status: "created" as const,
		refinement: null,
		created: ts,
		updated: ts,
	};
}

/**
 * Build initial epic.json content.
 * Shared by handleCreateEpic and handleConvertTask to avoid shape duplication.
 */
export function buildInitialEpicJson(name: string, goal: string, ts: string) {
	return {
		name,
		goal,
		status: "created" as const,
		verifications: [] as Verification[],
		refinement: null,
		created: ts,
		activated: null,
		updated: ts,
	};
}

/**
 * Create the 4 standard epic subdirectories via setEntry.
 * Shared by handleCreateEpic and handleConvertTask.
 */
export function createEpicSubdirectories(state: ProjectState, epicName: string): ProjectState {
	let tree = state;
	for (const dir of ["architecture", "research", "brainstorm", "prototypes"]) {
		tree = setEntry(tree, `epics/${epicName}/${dir}`, {
			type: "directory",
			contents: {},
		});
	}
	return tree;
}

// ── Task helpers ────────────────────────────────────────────

export function getTask(state: ProjectState, name: string): Task | undefined {
	return getJson<Task>(state, `tasks/${name}/task.json`);
}

const TASK_TERMINAL_STATUSES: ReadonlySet<TaskStatus> = new Set(["converted", "dropped"]);

export function isTaskTerminal(status: TaskStatus): boolean {
	return TASK_TERMINAL_STATUSES.has(status);
}

/**
 * Update the task's status in tasks/overview.json.
 * Sets `completed` timestamp on terminal transitions (dropped/converted).
 */
export function updateTaskOverviewStatus(
	state: ProjectState,
	taskName: string,
	newStatus: TaskStatus,
	ts?: string,
): ProjectState {
	const overview = getJson<Overview>(state, "tasks/overview.json");
	if (overview === undefined) return state;
	const completed = isTaskTerminal(newStatus) && ts ? ts : null;
	return setEntry(state, "tasks/overview.json", {
		type: "json",
		content: {
			...overview,
			items: overview.items.map((item) =>
				item.name === taskName
					? { ...item, status: newStatus, ...(completed ? { completed } : {}) }
					: item,
			),
		},
	});
}
