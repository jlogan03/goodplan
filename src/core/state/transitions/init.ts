/**
 * INIT_PROJECT transition handler.
 * Guard: project.json must not already exist.
 * Apply: produce initial project tree from zero state.
 */
import type { ProjectState } from "../../tree.js";
import { hasChild, setEntry } from "../../tree.js";
import type { StateEvent, StateError } from "../types.js";

type InitProjectEvent = Extract<StateEvent, { type: "INIT_PROJECT" }>;

export function handleInitProject(
	state: ProjectState,
	event: InitProjectEvent,
): ProjectState | StateError {
	// Guard: project must not already be initialized
	if (hasChild(state, "", "project.json")) {
		return {
			code: "STATE_ALREADY_INITIALIZED",
			message: "Project is already initialized (project.json exists)",
		};
	}

	const now = event.ts;

	// Build the initial tree immutably using setEntry
	let tree = state;

	// project.json
	tree = setEntry(tree, "project.json", {
		type: "json",
		content: {
			version: "1.0.0",
			name: event.name,
			activeEpic: null,
			activeSlice: null,
			activeQuest: null,
			created: now,
			updated: now,
		},
	});

	// Collection directories with overview.json files
	tree = setEntry(tree, "epics/overview.json", {
		type: "json",
		content: { items: [] },
	});
	tree = setEntry(tree, "slices/overview.json", {
		type: "json",
		content: { items: [] },
	});
	tree = setEntry(tree, "quests/overview.json", {
		type: "json",
		content: { items: [] },
	});

	// Activity log with init entry
	tree = setEntry(tree, "activity-log.jsonl", {
		type: "jsonl",
		content: [
			{
				ts: now,
				phase: "init",
				scope: "project",
				status: "complete",
				summary: `Project "${event.name}" initialized`,
			},
		],
	});

	// Empty JSONL files
	tree = setEntry(tree, "decisions.jsonl", {
		type: "jsonl",
		content: [],
	});
	tree = setEntry(tree, "learnings.jsonl", {
		type: "jsonl",
		content: [],
	});

	return tree;
}
