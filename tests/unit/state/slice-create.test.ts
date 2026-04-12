import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Epic } from "../../../src/schemas/entities/epic.js";
import type { UnifiedOverview } from "../../../src/schemas/entities/overview.js";
import type { Slice } from "../../../src/schemas/entities/slice.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function initWithEpic(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Build stuff", ts: TS }) as ProjectState;
	return s;
}

describe("reduce — CREATE_SLICE", () => {
	it("creates slice.json with correct fields", () => {
		const state = initWithEpic();
		const result = reduce(state, {
			type: "CREATE_SLICE",
			name: "s1",
			epic: "e1",
			goal: "Implement data layer",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		const slice = getJson<Slice>(newState, "epics/e1/slices/s1/slice.json");
		expect(slice).toBeDefined();
		expect(slice?.name).toBe("s1");
		expect(slice?.epic).toBe("e1");
		expect(slice?.status).toBe("created");
		expect(slice?.goal).toBe("Implement data layer");
		expect(slice?.deferred).toEqual([]);
		expect(slice?.refinement).toBeNull();
		expect(slice?.created).toBe(TS2);
		expect(slice?.updated).toBe(TS2);
	});

	it("adds slice to epic's embedded slices array in overview.json", () => {
		const state = initWithEpic();
		const result = reduce(state, {
			type: "CREATE_SLICE",
			name: "s1",
			epic: "e1",
			goal: "Test",
			ts: TS2,
		}) as ProjectState;

		const overview = getJson<UnifiedOverview>(result, "overview.json");
		expect(overview).toBeDefined();
		const epicItem = overview?.epics.find((i) => i.name === "e1");
		expect(epicItem).toBeDefined();
		expect(epicItem?.slices).toHaveLength(1);
		expect(epicItem?.slices[0]?.name).toBe("s1");
		expect(epicItem?.slices[0]?.status).toBe("created");
	});

	it("updates epic's updated timestamp", () => {
		const state = initWithEpic();
		const result = reduce(state, {
			type: "CREATE_SLICE",
			name: "s1",
			epic: "e1",
			goal: "Test",
			ts: TS2,
		}) as ProjectState;

		const epic = getJson<Epic>(result, "epics/e1/epic.json");
		expect(epic?.updated).toBe(TS2);
	});

	it("appends activity log entry", () => {
		const state = initWithEpic();
		const result = reduce(state, {
			type: "CREATE_SLICE",
			name: "s1",
			epic: "e1",
			goal: "Test",
			ts: TS2,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		expect(log).toBeDefined();
		const entry = log?.[log?.length - 1]!;
		expect(entry.phase).toBe("create-slice");
		expect(entry.scope).toBe("epics/e1/slices/s1");
	});

	it("rejects duplicate slice name", () => {
		const state = initWithEpic();
		const first = reduce(state, {
			type: "CREATE_SLICE",
			name: "s1",
			epic: "e1",
			goal: "First",
			ts: TS,
		}) as ProjectState;

		const result = reduce(first, {
			type: "CREATE_SLICE",
			name: "s1",
			epic: "e1",
			goal: "Second",
			ts: TS,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects when epic does not exist", () => {
		const s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		const result = reduce(s, {
			type: "CREATE_SLICE",
			name: "s1",
			epic: "nonexistent",
			goal: "Test",
			ts: TS,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("creates multiple slices in sequence", () => {
		let s = initWithEpic();
		s = reduce(s, {
			type: "CREATE_SLICE",
			name: "s1",
			epic: "e1",
			goal: "First",
			ts: TS,
		}) as ProjectState;
		s = reduce(s, {
			type: "CREATE_SLICE",
			name: "s2",
			epic: "e1",
			goal: "Second",
			ts: TS2,
		}) as ProjectState;

		const overview = getJson<UnifiedOverview>(s, "overview.json");
		const epicItem = overview?.epics.find((i) => i.name === "e1");
		expect(epicItem?.slices).toHaveLength(2);
	});
});
