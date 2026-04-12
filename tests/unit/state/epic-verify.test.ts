import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Epic, Verification } from "../../../src/schemas/entities/epic.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

const v1: Verification = {
	description: "CLI can create epics",
	status: "pending",
	addedDuring: "defining-slices",
	modifiedDuring: null,
};

const v2: Verification = {
	description: "CLI can list slices",
	status: "pending",
	addedDuring: "defining-slices",
	modifiedDuring: null,
};

function initWithEpic(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Goal", ts: TS }) as ProjectState;
	return s;
}

describe("reduce — ADD_VERIFICATION", () => {
	it("appends verification to epic", () => {
		const s = initWithEpic();
		const result = reduce(s, {
			type: "ADD_VERIFICATION",
			epic: "e1",
			ts: TS2,
			verification: v1,
		});
		expect(isStateError(result)).toBe(false);
		const epic = getJson<Epic>(result as ProjectState, "epics/e1/epic.json");
		expect(epic?.verifications).toHaveLength(1);
		expect(epic?.verifications[0]?.description).toBe("CLI can create epics");
		expect(epic?.updated).toBe(TS2);
	});

	it("appends multiple verifications", () => {
		let s = initWithEpic();
		s = reduce(s, {
			type: "ADD_VERIFICATION",
			epic: "e1",
			ts: TS,
			verification: v1,
		}) as ProjectState;
		s = reduce(s, {
			type: "ADD_VERIFICATION",
			epic: "e1",
			ts: TS,
			verification: v2,
		}) as ProjectState;
		const epic = getJson<Epic>(s, "epics/e1/epic.json");
		expect(epic?.verifications).toHaveLength(2);
	});

	it("works in various pre-activated statuses", () => {
		let s = initWithEpic();
		// created — should work
		let result = reduce(s, { type: "ADD_VERIFICATION", epic: "e1", ts: TS, verification: v1 });
		expect(isStateError(result)).toBe(false);

		// exploring — should work
		s = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		result = reduce(s, { type: "ADD_VERIFICATION", epic: "e1", ts: TS, verification: v1 });
		expect(isStateError(result)).toBe(false);
	});

	it("rejects for activated epic", () => {
		let s = initWithEpic();
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e1",
			ts: TS,
			scores: { q: 10 },
		}) as ProjectState;
		s = reduce(s, { type: "BEGIN_SLICING", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_SLICING", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_REFINE_SLICES",
			epic: "e1",
			ts: TS,
			scores: { q: 10 },
		}) as ProjectState;
		s = reduce(s, {
			type: "ADD_VERIFICATION",
			epic: "e1",
			ts: TS,
			verification: v1,
		}) as ProjectState;
		s = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS }) as ProjectState;

		const result = reduce(s, { type: "ADD_VERIFICATION", epic: "e1", ts: TS, verification: v2 });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects for completed epic", () => {
		let s = initWithEpic();
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e1",
			ts: TS,
			scores: { q: 10 },
		}) as ProjectState;
		s = reduce(s, { type: "BEGIN_SLICING", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_SLICING", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_REFINE_SLICES",
			epic: "e1",
			ts: TS,
			scores: { q: 10 },
		}) as ProjectState;
		s = reduce(s, {
			type: "ADD_VERIFICATION",
			epic: "e1",
			ts: TS,
			verification: v1,
		}) as ProjectState;
		s = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_EPIC",
			epic: "e1",
			ts: TS,
			verificationResults: [{ index: 0, passed: true, notes: "OK" }],
			learnings: [],
		}) as ProjectState;

		const result = reduce(s, { type: "ADD_VERIFICATION", epic: "e1", ts: TS, verification: v2 });
		expect(isStateError(result)).toBe(true);
	});
});

describe("reduce — UPDATE_VERIFICATION", () => {
	it("updates verification at specified index", () => {
		let s = initWithEpic();
		s = reduce(s, {
			type: "ADD_VERIFICATION",
			epic: "e1",
			ts: TS,
			verification: v1,
		}) as ProjectState;

		const updated: Verification = {
			description: "CLI can create and delete epics",
			status: "passed",
			addedDuring: "defining-slices",
			modifiedDuring: "slices-refined",
		};

		const result = reduce(s, {
			type: "UPDATE_VERIFICATION",
			epic: "e1",
			ts: TS2,
			index: 0,
			verification: updated,
		});
		expect(isStateError(result)).toBe(false);
		const epic = getJson<Epic>(result as ProjectState, "epics/e1/epic.json");
		expect(epic?.verifications[0]?.description).toBe("CLI can create and delete epics");
		expect(epic?.verifications[0]?.status).toBe("passed");
		expect(epic?.verifications[0]?.modifiedDuring).toBe("slices-refined");
		expect(epic?.updated).toBe(TS2);
	});

	it("rejects invalid index (negative)", () => {
		let s = initWithEpic();
		s = reduce(s, {
			type: "ADD_VERIFICATION",
			epic: "e1",
			ts: TS,
			verification: v1,
		}) as ProjectState;

		const result = reduce(s, {
			type: "UPDATE_VERIFICATION",
			epic: "e1",
			ts: TS,
			index: -1,
			verification: v2,
		});
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects invalid index (out of bounds)", () => {
		let s = initWithEpic();
		s = reduce(s, {
			type: "ADD_VERIFICATION",
			epic: "e1",
			ts: TS,
			verification: v1,
		}) as ProjectState;

		const result = reduce(s, {
			type: "UPDATE_VERIFICATION",
			epic: "e1",
			ts: TS,
			index: 5,
			verification: v2,
		});
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects for non-existent epic", () => {
		const s = initWithEpic();
		const result = reduce(s, {
			type: "UPDATE_VERIFICATION",
			epic: "nonexistent",
			ts: TS,
			index: 0,
			verification: v1,
		});
		expect(isStateError(result)).toBe(true);
	});
});
