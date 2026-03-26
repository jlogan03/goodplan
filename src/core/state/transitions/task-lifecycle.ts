/**
 * DROP_TASK and CONVERT_TASK transition handlers.
 * DROP_TASK: marks task as dropped with a reason.
 * CONVERT_TASK: atomically converts task to quest or epic, inlining entity creation.
 * Pure functions, no I/O.
 */
import type { Overview } from "../../../schemas/entities/overview.js";
import type { ProjectState } from "../../tree.js";
import { getJson, hasChild, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import {
	addEpicToOverview,
	addQuestToOverview,
	appendActivityLog,
	buildInitialEpicJson,
	buildInitialQuestJson,
	createEpicSubdirectories,
	getTask,
	isTaskTerminal,
	updateTaskOverviewStatus,
} from "./helpers.js";

type DropTaskEvent = Extract<StateEvent, { type: "DROP_TASK" }>;
type ConvertTaskEvent = Extract<StateEvent, { type: "CONVERT_TASK" }>;

export function handleDropTask(
	state: ProjectState,
	event: DropTaskEvent,
): ProjectState | StateError {
	const task = getTask(state, event.name);
	if (task === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Task "${event.name}" not found`,
			detail: { task: event.name, event: "DROP_TASK" },
		};
	}

	if (isTaskTerminal(task.status)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot drop task "${event.name}" in terminal status "${task.status}"`,
			detail: { task: event.name, event: "DROP_TASK", currentStatus: task.status },
		};
	}

	let tree = state;

	// Update task status
	tree = setEntry(tree, `tasks/${event.name}/task.json`, {
		type: "json",
		content: {
			...task,
			status: "dropped",
			droppedReason: event.reason,
		},
	});

	// Sync overview
	tree = updateTaskOverviewStatus(tree, event.name, "dropped", event.ts);

	// Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"drop-task",
		`tasks/${event.name}`,
		`Task "${event.name}" dropped: ${event.reason}`,
	);

	return tree;
}

export function handleConvertTask(
	state: ProjectState,
	event: ConvertTaskEvent,
): ProjectState | StateError {
	// 1. Guard task exists and status is "open"
	const task = getTask(state, event.name);
	if (task === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Task "${event.name}" not found`,
			detail: { task: event.name, event: "CONVERT_TASK" },
		};
	}

	if (task.status !== "open") {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Cannot convert task "${event.name}" in status "${task.status}" (expected open)`,
			detail: { task: event.name, event: "CONVERT_TASK", currentStatus: task.status },
		};
	}

	// 2. Guard no duplicate name in the target namespace
	const targetNamespace = event.to === "quest" ? "quests" : "epics";
	if (hasChild(state, targetNamespace, event.convertedName)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `${event.to === "quest" ? "Quest" : "Epic"} "${event.convertedName}" already exists`,
			detail: { task: event.name, target: event.convertedName, targetType: event.to },
		};
	}

	// Guard: target overview must exist
	const targetOverview = getJson<Overview>(state, `${targetNamespace}/overview.json`);
	if (targetOverview === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `${targetNamespace}/overview.json not found — is the project initialized?`,
		};
	}

	let tree = state;
	const now = event.ts;

	// Derive goal from task title + description
	const goal =
		event.convertedGoal ?? task.title + (task.description ? `\n\n${task.description}` : "");

	// 3. Update task status to "converted", set convertedTo
	tree = setEntry(tree, `tasks/${event.name}/task.json`, {
		type: "json",
		content: {
			...task,
			status: "converted",
			convertedTo: { type: event.to, name: event.convertedName },
		},
	});

	// 4. Update tasks overview entry status
	tree = updateTaskOverviewStatus(tree, event.name, "converted", now);

	// 5. Create quest/epic JSON via shared builders (avoid shape duplication — IMP-2)
	if (event.to === "quest") {
		tree = setEntry(tree, `quests/${event.convertedName}/quest.json`, {
			type: "json",
			content: buildInitialQuestJson(event.convertedName, goal, now),
		});
	} else {
		// epic
		tree = setEntry(tree, `epics/${event.convertedName}/epic.json`, {
			type: "json",
			content: buildInitialEpicJson(event.convertedName, goal, now),
		});

		// 6. Create 4 subdirectories for epic
		tree = createEpicSubdirectories(tree, event.convertedName);
	}

	// 7. Add new entity to overview
	if (event.to === "quest") {
		tree = addQuestToOverview(tree, event.convertedName, "created", now);
	} else {
		tree = addEpicToOverview(tree, event.convertedName, "created", now);
	}

	// 8. Append two activity log entries
	tree = appendActivityLog(
		tree,
		now,
		"convert-task",
		`tasks/${event.name}`,
		`Task "${event.name}" converted to ${event.to} "${event.convertedName}"`,
	);
	tree = appendActivityLog(
		tree,
		now,
		`create-${event.to}`,
		`${targetNamespace}/${event.convertedName}`,
		`${event.to === "quest" ? "Quest" : "Epic"} "${event.convertedName}" created from task "${event.name}"`,
	);

	return tree;
}
