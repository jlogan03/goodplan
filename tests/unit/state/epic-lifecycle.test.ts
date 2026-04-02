import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Epic } from "../../../src/schemas/entities/epic.js";
import type { Project } from "../../../src/schemas/entities/project.js";
import type { Verification } from "../../../src/schemas/entities/epic.js";
import type { UnifiedOverview } from "../../../src/schemas/entities/overview.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-02-01T00:00:00.000Z";
const TS3 = "2026-03-01T00:00:00.000Z";

const verification: Verification = {
	description: "CLI works",
	status: "pending",
	addedDuring: "defining-slices",
	modifiedDuring: null,
};

function stateAtSlicesRefined(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Goal", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_REFINE_ARCHITECTURE", epic: "e1", ts: TS, scores: { q: 10 } }) as ProjectState;
	s = reduce(s, { type: "BEGIN_SLICING", epic: "e1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_SLICING", epic: "e1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_REFINE_SLICES", epic: "e1", ts: TS, scores: { q: 10 } }) as ProjectState;
	return s;
}

function stateReadyToActivate(): ProjectState {
	let s = stateAtSlicesRefined();
	s = reduce(s, { type: "ADD_VERIFICATION", epic: "e1", ts: TS, verification }) as ProjectState;
	return s;
}

function overviewStatus(state: ProjectState, name: string): string | undefined {
	const overview = getJson<UnifiedOverview>(state, "overview.json");
	return overview?.epics.find((i) => i.name === name)?.status;
}

describe("reduce — ACTIVATE_EPIC", () => {
	it("transitions slices-refined → activated when guards pass", () => {
		const s = stateReadyToActivate();
		const result = reduce(s, {
			type: "ACTIVATE_EPIC",
			epic: "e1",
			ts: TS2,
		});
		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		const epic = getJson<Epic>(newState, "epics/e1/epic.json");
		expect(epic!.status).toBe("activated");
		expect(epic!.activated).toBe(TS2);
		expect(epic!.updated).toBe(TS2);

		const project = getJson<Project>(newState, "project.json");
		expect(project!.activeEpic).toBe("e1");
	});

	it("updates overview to activated", () => {
		const s = stateReadyToActivate();
		const result = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS2 }) as ProjectState;
		expect(overviewStatus(result, "e1")).toBe("activated");
	});

	it("rejects when another epic is already active", () => {
		let s = stateReadyToActivate();
		s = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS }) as ProjectState;

		// Create another epic and get it to slices-refined
		s = reduce(s, { type: "CREATE_EPIC", name: "e2", goal: "Goal2", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e2", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e2", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_REFINE_ARCHITECTURE", epic: "e2", ts: TS, scores: { q: 10 } }) as ProjectState;
		s = reduce(s, { type: "BEGIN_SLICING", epic: "e2", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_SLICING", epic: "e2", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_REFINE_SLICES", epic: "e2", ts: TS, scores: { q: 10 } }) as ProjectState;
		s = reduce(s, { type: "ADD_VERIFICATION", epic: "e2", ts: TS, verification }) as ProjectState;

		const result = reduce(s, { type: "ACTIVATE_EPIC", epic: "e2", ts: TS });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_EPIC_ALREADY_ACTIVE");
	});

	it("rejects when no verifications exist", () => {
		const s = stateAtSlicesRefined(); // no verifications added
		const result = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_MISSING_VERIFICATIONS");
	});

	it("rejects wrong status", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Goal", ts: TS }) as ProjectState;
		const result = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});

describe("reduce — COMPLETE_EPIC", () => {
	it("completes when all verifications passed", () => {
		let s = stateReadyToActivate();
		s = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS }) as ProjectState;

		const result = reduce(s, {
			type: "COMPLETE_EPIC",
			epic: "e1",
			ts: TS2,
			verificationResults: [{ index: 0, passed: true, notes: "Looks good" }],
		});
		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		expect(getJson<Epic>(newState, "epics/e1/epic.json")!.status).toBe("completed");
		expect(getJson<Epic>(newState, "epics/e1/epic.json")!.updated).toBe(TS2);
		expect(getJson<Project>(newState, "project.json")!.activeEpic).toBeNull();
		expect(overviewStatus(newState, "e1")).toBe("completed");
	});

	it("rejects when any verification failed", () => {
		let s = stateReadyToActivate();
		s = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS }) as ProjectState;

		const result = reduce(s, {
			type: "COMPLETE_EPIC",
			epic: "e1",
			ts: TS2,
			verificationResults: [{ index: 0, passed: false, notes: "Failed" }],
		});
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_VERIFICATION_FAILED");
	});
});

describe("reduce — ABANDON_EPIC", () => {
	it("abandons from created status", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Goal", ts: TS }) as ProjectState;

		const result = reduce(s, { type: "ABANDON_EPIC", epic: "e1", ts: TS2, reason: "No longer needed" });
		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		expect(getJson<Epic>(newState, "epics/e1/epic.json")!.status).toBe("abandoned");
		expect(getJson<Epic>(newState, "epics/e1/epic.json")!.updated).toBe(TS2);
		expect(overviewStatus(newState, "e1")).toBe("abandoned");
	});

	it("abandons from activated and clears activeEpic", () => {
		let s = stateReadyToActivate();
		s = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS }) as ProjectState;
		expect(getJson<Project>(s, "project.json")!.activeEpic).toBe("e1");

		const result = reduce(s, { type: "ABANDON_EPIC", epic: "e1", ts: TS2, reason: "Pivoting" });
		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		expect(getJson<Epic>(newState, "epics/e1/epic.json")!.status).toBe("abandoned");
		expect(getJson<Project>(newState, "project.json")!.activeEpic).toBeNull();
	});

	it("rejects from terminal status (completed)", () => {
		let s = stateReadyToActivate();
		s = reduce(s, { type: "ACTIVATE_EPIC", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_EPIC",
			epic: "e1",
			ts: TS2,
			verificationResults: [{ index: 0, passed: true, notes: "OK" }],
		}) as ProjectState;

		const result = reduce(s, { type: "ABANDON_EPIC", epic: "e1", ts: TS3, reason: "Too late" });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects from terminal status (abandoned)", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Goal", ts: TS }) as ProjectState;
		s = reduce(s, { type: "ABANDON_EPIC", epic: "e1", ts: TS, reason: "First abandon" }) as ProjectState;

		const result = reduce(s, { type: "ABANDON_EPIC", epic: "e1", ts: TS, reason: "Double abandon" });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("abandons from exploring status", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Goal", ts: TS }) as ProjectState;
		s = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS }) as ProjectState;

		const result = reduce(s, { type: "ABANDON_EPIC", epic: "e1", ts: TS2, reason: "Changed mind" });
		expect(isStateError(result)).toBe(false);
		expect(getJson<Epic>(result as ProjectState, "epics/e1/epic.json")!.status).toBe("abandoned");
	});
});
