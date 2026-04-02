/**
 * Unit tests for task CLI commands.
 * Uses reduce() directly — unit tests, not integration.
 * Covers: create → list → show → drop cycle, create → convert → verify quest exists,
 * status includes task counts, duplicate name rejection, drop/convert on non-existent task.
 */

import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../../src/core/data/tree.js";
import type { ProjectState } from "../../../../src/core/data/tree.js";
import { getJson } from "../../../../src/core/data/tree.js";
import { reduce } from "../../../../src/core/state/reduce.js";
import { isStateError } from "../../../../src/core/state/types.js";
import type { StateError } from "../../../../src/core/state/types.js";
import type { UnifiedOverview } from "../../../../src/schemas/entities/overview.js";
import type { Quest } from "../../../../src/schemas/entities/quest.js";
import type { Task } from "../../../../src/schemas/entities/task.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";
const TS3 = "2026-01-03T00:00:00.000Z";

function initProject(): ProjectState {
	return reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
}

function createTask(state: ProjectState, name = "t1", title = "Test task"): ProjectState {
	return reduce(state, {
		type: "CREATE_TASK",
		name,
		title,
		ts: TS,
	}) as ProjectState;
}

describe("task command cycle: create → list → show → drop", () => {
	it("creates a task, lists it, shows it, then drops it", () => {
		let state = initProject();

		// Create
		state = reduce(state, {
			type: "CREATE_TASK",
			name: "fix-bug",
			title: "Fix the bug",
			description: "The bug in auth module",
			context: { gitBranch: "feat/auth", activeSlice: "auth-slice" },
			ts: TS,
		}) as ProjectState;

		const task = getJson<Task>(state, "tasks/fix-bug/task.json");
		expect(task).toBeDefined();
		expect(task?.status).toBe("open");
		expect(task?.title).toBe("Fix the bug");

		// List — should show the task in overview
		const overview = getJson<UnifiedOverview>(state, "overview.json");
		expect(overview?.tasks).toHaveLength(1);
		expect(overview?.tasks[0]?.name).toBe("fix-bug");
		expect(overview?.tasks[0]?.status).toBe("open");
		expect(overview?.tasks[0]?.title).toBe("Fix the bug");

		// Show — task has all fields
		expect(task?.description).toBe("The bug in auth module");
		expect(task?.context.gitBranch).toBe("feat/auth");
		expect(task?.context.activeSlice).toBe("auth-slice");

		// Drop
		state = reduce(state, {
			type: "DROP_TASK",
			name: "fix-bug",
			reason: "duplicate of another task",
			ts: TS2,
		}) as ProjectState;

		const droppedTask = getJson<Task>(state, "tasks/fix-bug/task.json");
		expect(droppedTask?.status).toBe("dropped");
		expect(droppedTask?.droppedReason).toBe("duplicate of another task");

		// Overview should reflect dropped status
		const updatedOverview = getJson<UnifiedOverview>(state, "overview.json");
		expect(updatedOverview?.tasks[0]?.status).toBe("dropped");
	});
});

describe("task command cycle: create → convert → verify quest", () => {
	it("creates a task, converts to quest, verifies quest exists", () => {
		let state = initProject();

		// Create task
		state = reduce(state, {
			type: "CREATE_TASK",
			name: "improve-logging",
			title: "Improve logging",
			description: "Add structured logging throughout",
			ts: TS,
		}) as ProjectState;

		// Convert to quest
		state = reduce(state, {
			type: "CONVERT_TASK",
			name: "improve-logging",
			to: "quest",
			convertedName: "structured-logging",
			ts: TS2,
		}) as ProjectState;

		// Task should be converted
		const task = getJson<Task>(state, "tasks/improve-logging/task.json");
		expect(task?.status).toBe("converted");
		expect(task?.convertedTo).toEqual({ type: "quest", name: "structured-logging" });

		// Quest should exist
		const quest = getJson<Quest>(state, "quests/structured-logging/quest.json");
		expect(quest).toBeDefined();
		expect(quest?.name).toBe("structured-logging");
		expect(quest?.status).toBe("created");
		expect(quest?.goal).toBe("Improve logging\n\nAdd structured logging throughout");
	});
});

describe("status includes task counts", () => {
	it("counts open and total tasks", () => {
		let state = initProject();

		// Create 3 tasks
		state = createTask(state, "t1", "Task 1");
		state = createTask(state, "t2", "Task 2");
		state = createTask(state, "t3", "Task 3");

		// Drop one
		state = reduce(state, {
			type: "DROP_TASK",
			name: "t2",
			reason: "not needed",
			ts: TS2,
		}) as ProjectState;

		// Count from overview
		const overview = getJson<UnifiedOverview>(state, "overview.json");
		expect(overview?.tasks).toHaveLength(3);
		const openCount = overview?.tasks.filter((i) => i.status === "open").length;
		expect(openCount).toBe(2);
	});
});

describe("task error cases", () => {
	it("rejects duplicate task name", () => {
		let state = initProject();
		state = createTask(state, "t1");

		const result = reduce(state, {
			type: "CREATE_TASK",
			name: "t1",
			title: "Duplicate",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
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

	it("rejects convert on non-existent task", () => {
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

	it("rejects drop on already-dropped task", () => {
		let state = initProject();
		state = createTask(state);
		state = reduce(state, {
			type: "DROP_TASK",
			name: "t1",
			reason: "first",
			ts: TS2,
		}) as ProjectState;

		const result = reduce(state, {
			type: "DROP_TASK",
			name: "t1",
			reason: "second",
			ts: TS3,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects convert on already-converted task", () => {
		let state = initProject();
		state = createTask(state);
		state = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "q1",
			ts: TS2,
		}) as ProjectState;

		const result = reduce(state, {
			type: "CONVERT_TASK",
			name: "t1",
			to: "quest",
			convertedName: "q2",
			ts: TS3,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});
