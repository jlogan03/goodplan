import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Epic } from "../../../src/schemas/entities/epic.js";
import type { Overview } from "../../../src/schemas/entities/overview.js";
import type { Quest } from "../../../src/schemas/entities/quest.js";
import type { Task } from "../../../src/schemas/entities/task.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";
const TS3 = "2026-01-03T00:00:00.000Z";

/** Remove an entry from the state tree by path. Test-only helper. */
function deleteEntry(state: ProjectState, path: string): ProjectState {
	const segments = path.split("/").filter((s) => s.length > 0);
	if (segments.length === 0) return state;
	return deleteRecursive(state, segments, 0);
}

function deleteRecursive(dir: ProjectState, segments: string[], index: number): ProjectState {
	const segment = segments[index];
	if (segment === undefined) return dir;
	const isLast = index === segments.length - 1;

	if (isLast) {
		const { [segment]: _, ...rest } = dir.contents;
		return { type: "directory", contents: rest };
	}

	const child = dir.contents[segment];
	if (child === undefined || child.type !== "directory") return dir;

	const updatedChild = deleteRecursive(child as ProjectState, segments, index + 1);
	return {
		type: "directory",
		contents: { ...dir.contents, [segment]: updatedChild },
	};
}

function initProject(): ProjectState {
	return reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
}

describe("reduce — CREATE_TASK", () => {
	it("creates task.json with correct fields", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_TASK",
			name: "fix-error-handling",
			title: "Fix error handling",
			description: "migrate.ts has wrong error codes",
			context: { gitBranch: "feat/migrate", activeSlice: "migrate" },
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		const task = getJson<Task>(newState, "tasks/fix-error-handling/task.json");
		expect(task).toBeDefined();
		expect(task?.name).toBe("fix-error-handling");
		expect(task?.title).toBe("Fix error handling");
		expect(task?.status).toBe("open");
		expect(task?.description).toBe("migrate.ts has wrong error codes");
		expect(task?.context.gitBranch).toBe("feat/migrate");
		expect(task?.context.activeSlice).toBe("migrate");
		expect(task?.created).toBe(TS2);
	});

	it("creates task without optional fields", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_TASK",
			name: "quick-note",
			title: "Quick note",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const task = getJson<Task>(result as ProjectState, "tasks/quick-note/task.json");
		expect(task).toBeDefined();
		expect(task?.description).toBeUndefined();
		expect(task?.context).toEqual({});
	});

	it("updates tasks/overview.json with title", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_TASK",
			name: "t1",
			title: "Test task",
			ts: TS2,
		}) as ProjectState;

		const overview = getJson<Overview>(result, "tasks/overview.json");
		expect(overview).toBeDefined();
		expect(overview?.items).toHaveLength(1);
		expect(overview?.items[0]?.name).toBe("t1");
		expect(overview?.items[0]?.status).toBe("open");
		expect(overview?.items[0]?.title).toBe("Test task");
		expect(overview?.items[0]?.created).toBe(TS2);
		expect(overview?.items[0]?.completed).toBeNull();
	});

	it("appends activity log entry", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_TASK",
			name: "t1",
			title: "Test task",
			ts: TS2,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl") ?? [];
		expect(log.length).toBeGreaterThan(0);
		const entry = log[log.length - 1];
		expect(entry?.phase).toBe("create-task");
		expect(entry?.scope).toBe("tasks/t1");
	});

	it("rejects duplicate task name", () => {
		const state = initProject();
		const first = reduce(state, {
			type: "CREATE_TASK",
			name: "t1",
			title: "First",
			ts: TS,
		}) as ProjectState;

		const result = reduce(first, {
			type: "CREATE_TASK",
			name: "t1",
			title: "Second",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("lazily creates tasks/overview.json for existing projects without it", () => {
		// Build a state that has project.json but no tasks/overview.json,
		// simulating a project initialized before the task feature existed.
		const fullState = initProject();
		const stateWithoutTaskOverview = deleteEntry(fullState, "tasks/overview.json");

		// Verify tasks/overview.json is indeed absent
		expect(getJson<Overview>(stateWithoutTaskOverview, "tasks/overview.json")).toBeUndefined();

		// CREATE_TASK should lazily create tasks/overview.json and succeed
		const result = reduce(stateWithoutTaskOverview, {
			type: "CREATE_TASK",
			name: "t1",
			title: "Test",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		const overview = getJson<Overview>(newState, "tasks/overview.json");
		expect(overview).toBeDefined();
		expect(overview?.items).toHaveLength(1);
		expect(overview?.items[0]?.name).toBe("t1");
	});
});

describe("reduce — DROP_TASK", () => {
	function createTask(state: ProjectState): ProjectState {
		return reduce(state, {
			type: "CREATE_TASK",
			name: "t1",
			title: "Test task",
			ts: TS,
		}) as ProjectState;
	}

	it("marks task as dropped with reason", () => {
		const state = createTask(initProject());
		const result = reduce(state, {
			type: "DROP_TASK",
			name: "t1",
			reason: "not worth doing",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const task = getJson<Task>(result as ProjectState, "tasks/t1/task.json");
		expect(task?.status).toBe("dropped");
		expect(task?.droppedReason).toBe("not worth doing");
	});

	it("updates overview status to dropped", () => {
		const state = createTask(initProject());
		const result = reduce(state, {
			type: "DROP_TASK",
			name: "t1",
			reason: "not needed",
			ts: TS2,
		}) as ProjectState;

		const overview = getJson<Overview>(result, "tasks/overview.json");
		expect(overview?.items[0]?.status).toBe("dropped");
		expect(overview?.items[0]?.completed).toBe(TS2);
	});

	it("rejects drop on non-existent task", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "DROP_TASK",
			name: "nonexistent",
			reason: "test",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects drop on already-dropped task", () => {
		let state = createTask(initProject());
		state = reduce(state, {
			type: "DROP_TASK",
			name: "t1",
			reason: "first drop",
			ts: TS2,
		}) as ProjectState;

		const result = reduce(state, {
			type: "DROP_TASK",
			name: "t1",
			reason: "second drop",
			ts: TS3,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects drop on converted task", () => {
		let state = createTask(initProject());
		state = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "q1",
			ts: TS2,
		}) as ProjectState;

		const result = reduce(state, {
			type: "DROP_TASK",
			name: "t1",
			reason: "too late",
			ts: TS3,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});

describe("reduce — CONVERT_TASK to quest", () => {
	function createTask(state: ProjectState): ProjectState {
		return reduce(state, {
			type: "CREATE_TASK",
			name: "t1",
			title: "Fix error handling",
			description: "migrate.ts has wrong codes",
			ts: TS,
		}) as ProjectState;
	}

	it("converts task to quest and creates quest entity", () => {
		const state = createTask(initProject());
		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "fix-error-handling",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		// Task should be converted
		const task = getJson<Task>(newState, "tasks/t1/task.json");
		expect(task?.status).toBe("converted");
		expect(task?.convertedTo).toEqual({ type: "quest", name: "fix-error-handling" });

		// Quest should exist
		const quest = getJson<Quest>(newState, "quests/fix-error-handling/quest.json");
		expect(quest).toBeDefined();
		expect(quest?.name).toBe("fix-error-handling");
		expect(quest?.status).toBe("created");
		expect(quest?.goal).toBe("Fix error handling\n\nmigrate.ts has wrong codes");
		expect(quest?.refinement).toBeNull();
		expect(quest?.created).toBe(TS2);
		expect(quest?.updated).toBe(TS2);
	});

	it("adds quest to quests/overview.json", () => {
		const state = createTask(initProject());
		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "q1",
			ts: TS2,
		}) as ProjectState;

		const overview = getJson<Overview>(result, "quests/overview.json");
		expect(overview?.items).toHaveLength(1);
		expect(overview?.items[0]?.name).toBe("q1");
		expect(overview?.items[0]?.status).toBe("created");
	});

	it("updates tasks/overview.json status to converted", () => {
		const state = createTask(initProject());
		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "q1",
			ts: TS2,
		}) as ProjectState;

		const overview = getJson<Overview>(result, "tasks/overview.json");
		expect(overview?.items[0]?.status).toBe("converted");
		expect(overview?.items[0]?.completed).toBe(TS2);
	});

	it("appends two activity log entries", () => {
		const state = createTask(initProject());
		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "q1",
			ts: TS2,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl") ?? [];
		expect(log.length).toBeGreaterThanOrEqual(2);
		const convertEntry = log[log.length - 2];
		const createEntry = log[log.length - 1];
		expect(convertEntry?.phase).toBe("convert-task");
		expect(createEntry?.phase).toBe("create-quest");
	});

	it("uses convertedGoal when provided", () => {
		const state = createTask(initProject());
		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "q1",
			convertedGoal: "Custom goal override",
			ts: TS2,
		}) as ProjectState;

		const quest = getJson<Quest>(result, "quests/q1/quest.json");
		expect(quest?.goal).toBe("Custom goal override");
	});

	it("rejects conversion when quest name already exists", () => {
		let state = createTask(initProject());
		// Create an existing quest
		state = reduce(state, {
			type: "CREATE_QUEST",
			name: "q1",
			goal: "Existing quest",
			ts: TS,
		}) as ProjectState;

		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "q1",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects conversion on non-open task", () => {
		let state = createTask(initProject());
		state = reduce(state, {
			type: "DROP_TASK",
			name: "t1",
			reason: "dropped",
			ts: TS2,
		}) as ProjectState;

		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "q1",
			ts: TS3,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects conversion on non-existent task", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "nonexistent",
			to: "quest",
			convertedName: "q1",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
	});
});

describe("reduce — CONVERT_TASK to epic", () => {
	function createTask(state: ProjectState): ProjectState {
		return reduce(state, {
			type: "CREATE_TASK",
			name: "t1",
			title: "Build auth system",
			ts: TS,
		}) as ProjectState;
	}

	it("converts task to epic and creates epic entity with subdirectories", () => {
		const state = createTask(initProject());
		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "epic",
			convertedName: "auth-system",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		// Task should be converted
		const task = getJson<Task>(newState, "tasks/t1/task.json");
		expect(task?.status).toBe("converted");
		expect(task?.convertedTo).toEqual({ type: "epic", name: "auth-system" });

		// Epic should exist with all required fields
		const epic = getJson<Epic>(newState, "epics/auth-system/epic.json");
		expect(epic).toBeDefined();
		expect(epic?.name).toBe("auth-system");
		expect(epic?.status).toBe("created");
		expect(epic?.goal).toBe("Build auth system");
		expect(epic?.verifications).toEqual([]);
		expect(epic?.refinement).toBeNull();
		expect(epic?.sliceSequence).toEqual([]);
		expect(epic?.created).toBe(TS2);
		expect(epic?.activated).toBeNull();
		expect(epic?.updated).toBe(TS2);
	});

	it("adds epic to epics/overview.json", () => {
		const state = createTask(initProject());
		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "epic",
			convertedName: "e1",
			ts: TS2,
		}) as ProjectState;

		const overview = getJson<Overview>(result, "epics/overview.json");
		expect(overview?.items).toHaveLength(1);
		expect(overview?.items[0]?.name).toBe("e1");
		expect(overview?.items[0]?.status).toBe("created");
	});

	it("rejects conversion when epic name already exists", () => {
		let state = createTask(initProject());
		state = reduce(state, {
			type: "CREATE_EPIC",
			name: "e1",
			goal: "Existing epic",
			ts: TS,
		}) as ProjectState;

		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "epic",
			convertedName: "e1",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});
