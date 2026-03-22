import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Epic } from "../../../src/schemas/entities/epic.js";
import type { Overview } from "../../../src/schemas/entities/overview.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function initWithEpic(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Goal", ts: TS }) as ProjectState;
	return s;
}

function epicStatus(state: ProjectState, name: string): string | undefined {
	return getJson<Epic>(state, `epics/${name}/epic.json`)?.status;
}

function epicUpdated(state: ProjectState, name: string): string | undefined {
	return getJson<Epic>(state, `epics/${name}/epic.json`)?.updated;
}

function overviewStatus(state: ProjectState, name: string): string | undefined {
	const overview = getJson<Overview>(state, "epics/overview.json");
	return overview?.items.find((i) => i.name === name)?.status;
}

describe("reduce — BEGIN_EXPLORE", () => {
	it("transitions created → exploring", () => {
		const s = initWithEpic();
		const result = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS2 });
		expect(isStateError(result)).toBe(false);
		expect(epicStatus(result as ProjectState, "e1")).toBe("exploring");
	});

	it("sets epic.updated from event.ts", () => {
		const s = initWithEpic();
		const result = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS2 }) as ProjectState;
		expect(epicUpdated(result, "e1")).toBe(TS2);
	});

	it("updates overview status", () => {
		const s = initWithEpic();
		const result = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS2 }) as ProjectState;
		expect(overviewStatus(result, "e1")).toBe("exploring");
	});

	it("rejects non-created status", () => {
		let s = initWithEpic();
		s = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		const result = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS });
		expect(isStateError(result)).toBe(true);
	});
});

describe("reduce — COMPLETE_EXPLORE", () => {
	it("transitions created → explored (skip path)", () => {
		const s = initWithEpic();
		const result = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS2 });
		expect(isStateError(result)).toBe(false);
		expect(epicStatus(result as ProjectState, "e1")).toBe("explored");
	});

	it("transitions exploring → explored (normal path)", () => {
		let s = initWithEpic();
		s = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		const result = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS2 });
		expect(isStateError(result)).toBe(false);
		expect(epicStatus(result as ProjectState, "e1")).toBe("explored");
	});

	it("rejects wrong status", () => {
		let s = initWithEpic();
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState; // now explored
		const result = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS });
		expect(isStateError(result)).toBe(true);
	});
});

describe("reduce — BEGIN/COMPLETE_ARCHITECTURE", () => {
	it("explored → defining-architecture → architecture-defined", () => {
		let s = initWithEpic();
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "BEGIN_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("defining-architecture");
		s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("architecture-defined");
	});

	it("explored → architecture-defined (skip path)", () => {
		let s = initWithEpic();
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		const result = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS });
		expect(isStateError(result)).toBe(false);
		expect(epicStatus(result as ProjectState, "e1")).toBe("architecture-defined");
	});
});

describe("reduce — full phase chain via skip paths", () => {
	it("created → explored → arch-defined → arch-refined → slices-defined → slices-refined", () => {
		let s = initWithEpic();
		// Skip explore
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("explored");
		// Skip architecture
		s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("architecture-defined");
		// Skip architecture refinement
		s = reduce(s, { type: "COMPLETE_REFINE_ARCHITECTURE", epic: "e1", ts: TS, scores: { q: 10 } }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("architecture-refined");
		// Begin slicing
		s = reduce(s, { type: "BEGIN_SLICING", epic: "e1", ts: TS }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("defining-slices");
		// Complete slicing
		s = reduce(s, { type: "COMPLETE_SLICING", epic: "e1", ts: TS }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("slices-defined");
		// Skip slice refinement
		s = reduce(s, { type: "COMPLETE_REFINE_SLICES", epic: "e1", ts: TS, scores: { q: 10 } }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("slices-refined");
	});

	it("overview tracks status through the full chain", () => {
		let s = initWithEpic();
		expect(overviewStatus(s, "e1")).toBe("created");
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		expect(overviewStatus(s, "e1")).toBe("explored");
		s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		expect(overviewStatus(s, "e1")).toBe("architecture-defined");
		s = reduce(s, { type: "COMPLETE_REFINE_ARCHITECTURE", epic: "e1", ts: TS, scores: { q: 10 } }) as ProjectState;
		expect(overviewStatus(s, "e1")).toBe("architecture-refined");
	});
});

describe("reduce — BEGIN/COMPLETE via normal path with refinement", () => {
	it("full normal path including refinement rounds", () => {
		let s = initWithEpic();
		// Explore
		s = reduce(s, { type: "BEGIN_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_EXPLORE", epic: "e1", ts: TS }) as ProjectState;
		// Architecture
		s = reduce(s, { type: "BEGIN_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		// Refine architecture
		s = reduce(s, { type: "BEGIN_REFINE_ARCHITECTURE", epic: "e1", ts: TS }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("refining-architecture");
		// Low scores — stay
		s = reduce(s, { type: "COMPLETE_REFINE_ARCHITECTURE", epic: "e1", ts: TS, scores: { q: 5 } }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("refining-architecture");
		// High scores — advance
		s = reduce(s, { type: "COMPLETE_REFINE_ARCHITECTURE", epic: "e1", ts: TS, scores: { q: 9 } }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("architecture-refined");
		// Slicing
		s = reduce(s, { type: "BEGIN_SLICING", epic: "e1", ts: TS }) as ProjectState;
		s = reduce(s, { type: "COMPLETE_SLICING", epic: "e1", ts: TS }) as ProjectState;
		// Refine slices
		s = reduce(s, { type: "BEGIN_REFINE_SLICES", epic: "e1", ts: TS }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("refining-slices");
		s = reduce(s, { type: "COMPLETE_REFINE_SLICES", epic: "e1", ts: TS, scores: { q: 9 } }) as ProjectState;
		expect(epicStatus(s, "e1")).toBe("slices-refined");
	});
});

describe("reduce — invalid epic name", () => {
	it("returns error for non-existent epic", () => {
		const s = initWithEpic();
		const result = reduce(s, { type: "BEGIN_EXPLORE", epic: "nonexistent", ts: TS });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});
