/**
 * CREATE_TASK transition handler.
 * Guard: task name must not already exist in tree.
 * Apply: create task.json, update overview.json, append activity log.
 * Pure function, no I/O.
 */
import type { UnifiedOverview } from "../../../schemas/entities/overview.js";
import type { TaskStatus } from "../../../schemas/entities/task.js";
import type { ProjectState } from "../../tree.js";
import { getJson, hasChild, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { appendActivityLog } from "./helpers.js";

type CreateTaskEvent = Extract<StateEvent, { type: "CREATE_TASK" }>;

export function handleCreateTask(
	state: ProjectState,
	event: CreateTaskEvent,
): ProjectState | StateError {
	// Guard: task must not already exist
	if (hasChild(state, "tasks", event.name)) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Task "${event.name}" already exists`,
			detail: { task: event.name },
		};
	}

	const now = event.ts;
	let tree = state;

	// Lazy overview creation for existing projects without overview.json
	let overview = getJson<UnifiedOverview>(tree, "overview.json");
	if (overview === undefined) {
		tree = setEntry(tree, "overview.json", {
			type: "json",
			content: { epics: [], quests: [], tasks: [] },
		});
		overview = { epics: [], quests: [], tasks: [] };
	}

	// Create task.json — omit optional fields entirely (exactOptionalPropertyTypes)
	tree = setEntry(tree, `tasks/${event.name}/task.json`, {
		type: "json",
		content: {
			name: event.name,
			title: event.title,
			status: "open",
			created: now,
			context: event.context ?? {},
			...(event.description ? { description: event.description } : {}),
		},
	});

	// Update overview.json — include title for display
	tree = setEntry(tree, "overview.json", {
		type: "json",
		content: {
			...overview,
			tasks: [
				...overview.tasks,
				{
					name: event.name,
					status: "open",
					title: event.title,
					created: now,
					completed: null,
				},
			],
		},
	});

	// Append activity log
	tree = appendActivityLog(
		tree,
		now,
		"create-task",
		`tasks/${event.name}`,
		`Task "${event.name}" created: ${event.title}`,
	);

	return tree;
}

/** Transition table rows for CREATE_TASK */
export const createTaskTransitions: ReadonlyArray<{
	from: "(none)";
	event: StateEvent["type"];
	to: TaskStatus;
}> = [{ from: "(none)", event: "CREATE_TASK", to: "open" }] as const;
