/**
 * ADD_VERIFICATION and UPDATE_VERIFICATION handlers.
 * Pure functions, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import type { StateEvent, StateError } from "../types.js";
import type { EpicStatus } from "../../../schemas/entities/epic.js";
import {
	appendActivityLog,
	getEpic,
	setEpicJson,
} from "./helpers.js";

type AddVerificationEvent = Extract<StateEvent, { type: "ADD_VERIFICATION" }>;
type UpdateVerificationEvent = Extract<StateEvent, { type: "UPDATE_VERIFICATION" }>;

/** Pre-activated statuses — verifications can only be modified before activation */
const PRE_ACTIVATED_STATUSES: ReadonlySet<EpicStatus> = new Set([
	"created",
	"exploring",
	"explored",
	"defining-architecture",
	"architecture-defined",
	"refining-architecture",
	"architecture-refined",
	"defining-slices",
	"slices-defined",
	"refining-slices",
	"slices-refined",
]);

function guardPreActivated(
	status: EpicStatus,
	epicName: string,
	eventType: string,
): StateError | null {
	if (!PRE_ACTIVATED_STATUSES.has(status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot ${eventType} on epic "${epicName}" in status "${status}" (must be pre-activated)`,
			detail: { epic: epicName, currentStatus: status },
		};
	}
	return null;
}

export function handleAddVerification(
	state: ProjectState,
	event: AddVerificationEvent,
): ProjectState | StateError {
	const epic = getEpic(state, event.epic);
	if (epic === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Epic "${event.epic}" not found`,
			detail: { epic: event.epic },
		};
	}

	const err = guardPreActivated(epic.status, event.epic, "ADD_VERIFICATION");
	if (err !== null) return err;

	let tree = setEpicJson(state, event.epic, {
		...epic,
		verifications: [...epic.verifications, event.verification],
		updated: event.ts,
	});

	tree = appendActivityLog(
		tree,
		event.ts,
		"add-verification",
		`epics/${event.epic}`,
		`Verification added to epic "${event.epic}": ${event.verification.description}`,
	);
	return tree;
}

export function handleUpdateVerification(
	state: ProjectState,
	event: UpdateVerificationEvent,
): ProjectState | StateError {
	const epic = getEpic(state, event.epic);
	if (epic === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Epic "${event.epic}" not found`,
			detail: { epic: event.epic },
		};
	}

	const err = guardPreActivated(epic.status, event.epic, "UPDATE_VERIFICATION");
	if (err !== null) return err;

	// Guard: index must exist
	if (event.index < 0 || event.index >= epic.verifications.length) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Verification index ${event.index} out of bounds (${epic.verifications.length} verifications exist)`,
			detail: { epic: event.epic, index: event.index, count: epic.verifications.length },
		};
	}

	const newVerifications = [...epic.verifications];
	newVerifications[event.index] = event.verification;

	let tree = setEpicJson(state, event.epic, {
		...epic,
		verifications: newVerifications,
		updated: event.ts,
	});

	tree = appendActivityLog(
		tree,
		event.ts,
		"update-verification",
		`epics/${event.epic}`,
		`Verification ${event.index} updated on epic "${event.epic}"`,
	);
	return tree;
}

/** Transition table rows for epic verification handlers */
export const epicVerifyTransitions: ReadonlyArray<{
	from: "*(pre-activated)";
	event: StateEvent["type"];
	to: "(same)";
}> = [
	{ from: "*(pre-activated)", event: "ADD_VERIFICATION", to: "(same)" },
	{ from: "*(pre-activated)", event: "UPDATE_VERIFICATION", to: "(same)" },
] as const;
