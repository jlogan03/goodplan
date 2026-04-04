import type { EpicStatus } from "../../../schemas/entities/epic.js";
/**
 * ACTIVATE_EPIC, COMPLETE_EPIC, ABANDON_EPIC handlers.
 * Pure functions, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	appendActivityLog,
	getEpic,
	getProject,
	guardEpicStatus,
	isEpicTerminal,
	processLearnings,
	setEpicJson,
	updateOverviewStatus,
} from "./helpers.js";

type ActivateEpicEvent = Extract<StateEvent, { type: "ACTIVATE_EPIC" }>;
type CompleteEpicEvent = Extract<StateEvent, { type: "COMPLETE_EPIC" }>;
type AbandonEpicEvent = Extract<StateEvent, { type: "ABANDON_EPIC" }>;

export function handleActivateEpic(
	state: ProjectState,
	event: ActivateEpicEvent,
): ProjectState | StateError {
	const epic = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		"slices-refined",
		"ACTIVATE_EPIC",
	);
	if (isStateError(epic)) return epic;

	const project = getProject(state);
	if (project === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: "project.json not found",
		};
	}

	// Guard: no other epic is active
	if (project.activeEpic !== null) {
		return {
			code: "STATE_EPIC_ALREADY_ACTIVE",
			message: `Cannot activate epic "${event.epic}" — epic "${project.activeEpic}" is already active`,
			detail: { epic: event.epic, activeEpic: project.activeEpic },
		};
	}

	// Guard: verifications must exist
	if (epic.verifications.length === 0) {
		return {
			code: "STATE_MISSING_VERIFICATIONS",
			message: `Cannot activate epic "${event.epic}" — no verification criteria defined`,
			detail: { epic: event.epic },
		};
	}

	const now = event.ts;

	// Set epic status to activated
	let tree = setEpicJson(state, event.epic, {
		...epic,
		status: "activated",
		activated: now,
		updated: now,
	});

	// Set project.activeEpic
	tree = setEntry(tree, "project.json", {
		type: "json",
		content: { ...project, activeEpic: event.epic },
	});

	tree = updateOverviewStatus(tree, event.epic, "activated");
	tree = appendActivityLog(
		tree,
		now,
		"activate-epic",
		`epics/${event.epic}`,
		`Epic "${event.epic}" activated`,
	);
	return tree;
}

export function handleCompleteEpic(
	state: ProjectState,
	event: CompleteEpicEvent,
): ProjectState | StateError {
	const epic = guardEpicStatus(
		getEpic(state, event.epic),
		event.epic,
		"activated",
		"COMPLETE_EPIC",
	);
	if (isStateError(epic)) return epic;

	// Guard: all verification results must pass
	const anyFailed = event.verificationResults.some((r) => !r.passed);
	if (anyFailed) {
		return {
			code: "STATE_VERIFICATION_FAILED",
			message: `Cannot complete epic "${event.epic}" — one or more verifications failed`,
			detail: {
				epic: event.epic,
				failedIndices: event.verificationResults.filter((r) => !r.passed).map((r) => r.index),
			},
		};
	}

	const project = getProject(state);
	if (project === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: "project.json not found",
		};
	}

	let tree = state;

	// 1. Learnings: LearningEventEntry[] with `file` already set by RPC layer.
	//    Epics are project-scoped — only roll up to "project" (skip "epic" since there's no parent epic).
	const source = `epics/${event.epic}`;
	tree = processLearnings(tree, event.learnings, source, new Set(["project"]));

	// 2. Set epic status to completed
	tree = setEpicJson(tree, event.epic, {
		...epic,
		status: "completed",
		updated: event.ts,
	});

	// 3. Clear project.activeEpic
	tree = setEntry(tree, "project.json", {
		type: "json",
		content: { ...project, activeEpic: null },
	});

	tree = updateOverviewStatus(tree, event.epic, "completed");
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-epic",
		`epics/${event.epic}`,
		`Epic "${event.epic}" completed`,
	);
	return tree;
}

export function handleAbandonEpic(
	state: ProjectState,
	event: AbandonEpicEvent,
): ProjectState | StateError {
	const epic = getEpic(state, event.epic);
	if (epic === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Epic "${event.epic}" not found`,
			detail: { epic: event.epic },
		};
	}

	// Guard: cannot abandon terminal status
	if (isEpicTerminal(epic.status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot abandon epic "${event.epic}" — already in terminal status "${epic.status}"`,
			detail: { epic: event.epic, currentStatus: epic.status },
		};
	}

	let tree = setEpicJson(state, event.epic, {
		...epic,
		status: "abandoned",
		updated: event.ts,
	});

	// Clear activeEpic if this was the active epic
	const project = getProject(state);
	if (project !== undefined && project.activeEpic === event.epic) {
		tree = setEntry(tree, "project.json", {
			type: "json",
			content: { ...project, activeEpic: null },
		});
	}

	tree = updateOverviewStatus(tree, event.epic, "abandoned");
	tree = appendActivityLog(
		tree,
		event.ts,
		"abandon-epic",
		`epics/${event.epic}`,
		`Epic "${event.epic}" abandoned: ${event.reason}`,
	);
	return tree;
}

/** Transition table rows for epic lifecycle handlers */
export const epicLifecycleTransitions: ReadonlyArray<{
	from: EpicStatus | "*(non-terminal)";
	event: StateEvent["type"];
	to: EpicStatus | "(error)";
}> = [
	{ from: "slices-refined", event: "ACTIVATE_EPIC", to: "activated" },
	{ from: "slices-refined", event: "ACTIVATE_EPIC", to: "(error)" },
	{ from: "activated", event: "COMPLETE_EPIC", to: "completed" },
	{ from: "activated", event: "COMPLETE_EPIC", to: "(error)" },
	{ from: "*(non-terminal)", event: "ABANDON_EPIC", to: "abandoned" },
] as const;
