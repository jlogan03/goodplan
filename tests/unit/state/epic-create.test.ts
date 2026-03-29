import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl, getDir } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Epic } from "../../../src/schemas/entities/epic.js";
import type { EpicOverview } from "../../../src/schemas/entities/overview.js";

const TS = "2026-01-01T00:00:00.000Z";

function initProject(): ProjectState {
	const result = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS });
	if (isStateError(result)) throw new Error(`INIT_PROJECT failed: ${(result as StateError).message}`);
	return result as ProjectState;
}

describe("reduce — CREATE_EPIC", () => {
	it("creates epic.json with correct fields", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_EPIC",
			name: "my-epic",
			goal: "Build something great",
			ts: "2026-01-02T00:00:00.000Z",
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		const epic = getJson<Epic>(newState, "epics/my-epic/epic.json");
		expect(epic).toBeDefined();
		expect(epic!.name).toBe("my-epic");
		expect(epic!.status).toBe("created");
		expect(epic!.goal).toBe("Build something great");
		expect(epic!.verifications).toEqual([]);
		expect(epic!.refinement).toBeNull();
		expect(epic!.created).toBe("2026-01-02T00:00:00.000Z");
		expect(epic!.activated).toBeNull();
		expect(epic!.updated).toBe("2026-01-02T00:00:00.000Z");
	});

	it("creates all subdirectories", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_EPIC",
			name: "my-epic",
			goal: "Test",
			ts: TS,
		}) as ProjectState;

		expect(getDir(result, "epics/my-epic/architecture")).toBeDefined();
		expect(getDir(result, "epics/my-epic/research")).toBeDefined();
		expect(getDir(result, "epics/my-epic/brainstorm")).toBeDefined();
		expect(getDir(result, "epics/my-epic/prototypes")).toBeDefined();
	});

	it("updates epics/overview.json", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_EPIC",
			name: "my-epic",
			goal: "Test",
			ts: "2026-01-02T00:00:00.000Z",
		}) as ProjectState;

		const overview = getJson<EpicOverview>(result, "epics/overview.json");
		expect(overview).toBeDefined();
		expect(overview!.items).toHaveLength(1);
		expect(overview!.items[0]!.name).toBe("my-epic");
		expect(overview!.items[0]!.status).toBe("created");
		expect(overview!.items[0]!.slices).toEqual([]);
	});

	it("appends activity log entry", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_EPIC",
			name: "my-epic",
			goal: "Test",
			ts: TS,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		expect(log).toBeDefined();
		// 1 from init + 1 from create
		expect(log!.length).toBe(2);
		const entry = log![1]!;
		expect(entry.phase).toBe("create-epic");
		expect(entry.scope).toBe("epics/my-epic");
	});

	it("rejects duplicate epic name", () => {
		const state = initProject();
		const first = reduce(state, {
			type: "CREATE_EPIC",
			name: "dup",
			goal: "First",
			ts: TS,
		}) as ProjectState;

		const result = reduce(first, {
			type: "CREATE_EPIC",
			name: "dup",
			goal: "Second",
			ts: TS,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});
