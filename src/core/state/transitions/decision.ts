/**
 * CREATE_DECISION and UPDATE_DECISION transition handlers.
 * Pure functions, no I/O.
 */
import type { DecisionEntry } from "../../../schemas/records/decision.js";
import type { ProjectState } from "../../tree.js";
import { getJsonl, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { appendActivityLog } from "./helpers.js";

type CreateDecisionEvent = Extract<StateEvent, { type: "CREATE_DECISION" }>;
type UpdateDecisionEvent = Extract<StateEvent, { type: "UPDATE_DECISION" }>;

export function handleCreateDecision(
	state: ProjectState,
	event: CreateDecisionEvent,
): ProjectState | StateError {
	const decisions = getJsonl<DecisionEntry>(state, "decisions.jsonl") ?? [];

	// Guard: duplicate id
	if (decisions.some((d) => d.id === event.id)) {
		return {
			code: "STATE_DUPLICATE_DECISION",
			message: `Decision "${event.id}" already exists`,
			detail: { id: event.id },
		};
	}

	const newEntry: DecisionEntry = {
		id: event.id,
		status: "active",
		domain: event.domain,
		title: event.title,
		summary: event.summary,
		date: event.ts.slice(0, 10), // ISO 8601 date portion
		supersededBy: null,
		...(event.entityPath !== undefined ? { entityPath: event.entityPath } : {}),
		...(event.reconsiderWhen !== undefined ? { reconsiderWhen: event.reconsiderWhen } : {}),
	};

	let tree = setEntry(state, "decisions.jsonl", {
		type: "jsonl",
		content: [...decisions, newEntry],
	});

	tree = appendActivityLog(
		tree,
		event.ts,
		"create-decision",
		`decisions/${event.id}`,
		`Decision "${event.id}" created: ${event.title}`,
	);

	return tree;
}

/** Decision status values that are terminal (cannot be updated). */
const DECISION_TERMINAL_STATUSES = new Set(["superseded"]);

/** Valid status transitions per transition-tables.md. */
const VALID_DECISION_TRANSITIONS: Record<
	DecisionEntry["status"],
	ReadonlySet<DecisionEntry["status"]>
> = {
	active: new Set(["active", "revisiting", "superseded"]),
	revisiting: new Set(["active", "superseded"]),
	superseded: new Set([]),
};

/** Declarative transition array derived from VALID_DECISION_TRANSITIONS record. */
export const decisionTransitions = [
	{ from: "active", event: "UPDATE_DECISION", to: "active" },
	{ from: "active", event: "UPDATE_DECISION", to: "revisiting" },
	{ from: "active", event: "UPDATE_DECISION", to: "superseded" },
	{ from: "revisiting", event: "UPDATE_DECISION", to: "active" },
	{ from: "revisiting", event: "UPDATE_DECISION", to: "superseded" },
	{ from: "(none)", event: "CREATE_DECISION", to: "active" },
] as const satisfies ReadonlyArray<{
	from: DecisionEntry["status"] | "(none)";
	event: StateEvent["type"];
	to: DecisionEntry["status"];
}>;

export function handleUpdateDecision(
	state: ProjectState,
	event: UpdateDecisionEvent,
): ProjectState | StateError {
	const decisions = getJsonl<DecisionEntry>(state, "decisions.jsonl") ?? [];
	const index = decisions.findIndex((d) => d.id === event.id);

	if (index === -1) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Decision "${event.id}" not found`,
			detail: { id: event.id },
		};
	}

	const existing = decisions[index]!;

	// Guard: terminal state
	if (DECISION_TERMINAL_STATUSES.has(existing.status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot update decision "${event.id}" in terminal status "${existing.status}"`,
			detail: { id: event.id, currentStatus: existing.status },
		};
	}

	const newStatus = event.changes.status ?? existing.status;

	// Guard: supersededBy may only be set when status is changing to superseded
	if (event.changes.supersededBy !== undefined && newStatus !== "superseded") {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot set supersededBy on decision "${event.id}" without changing status to superseded`,
			detail: { id: event.id, currentStatus: existing.status, newStatus },
		};
	}

	// Validate status transitions per transition-tables.md
	const allowed = VALID_DECISION_TRANSITIONS[existing.status];
	if (!allowed.has(newStatus)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot transition decision "${event.id}" from "${existing.status}" to "${newStatus}"`,
			detail: { id: event.id, currentStatus: existing.status, newStatus },
		};
	}

	const updated: DecisionEntry = {
		...existing,
		...event.changes,
		// Preserve immutable fields
		id: existing.id,
		date: existing.date,
	};

	const newDecisions = [...decisions];
	newDecisions[index] = updated;

	let tree = setEntry(state, "decisions.jsonl", {
		type: "jsonl",
		content: newDecisions,
	});

	tree = appendActivityLog(
		tree,
		event.ts,
		"update-decision",
		`decisions/${event.id}`,
		`Decision "${event.id}" updated: ${existing.status} -> ${updated.status}`,
	);

	return tree;
}
