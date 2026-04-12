import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl, setEntry } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Project } from "../../../src/schemas/entities/project.js";
import type { Slice } from "../../../src/schemas/entities/slice.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";
const TS3 = "2026-01-03T00:00:00.000Z";

function initWithSlices(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Build stuff", ts: TS }) as ProjectState;
	s = reduce(s, {
		type: "CREATE_SLICE",
		name: "s1",
		epic: "e1",
		goal: "First slice",
		ts: TS,
	}) as ProjectState;
	s = reduce(s, {
		type: "CREATE_SLICE",
		name: "s2",
		epic: "e1",
		goal: "Second slice",
		ts: TS,
	}) as ProjectState;
	return s;
}

describe("reduce — BEGIN_PLAN", () => {
	it("first slice succeeds — no sequential enforcement needed", () => {
		const state = initWithSlices();
		const result = reduce(state, { type: "BEGIN_PLAN", epic: "e1", slice: "s1", ts: TS2 });

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		const slice = getJson<Slice>(newState, "epics/e1/slices/s1/slice.json");
		expect(slice?.status).toBe("planning");
		expect(slice?.updated).toBe(TS2);
	});

	it("sets project.json activeSlice", () => {
		const state = initWithSlices();
		const result = reduce(state, {
			type: "BEGIN_PLAN",
			epic: "e1",
			slice: "s1",
			ts: TS2,
		}) as ProjectState;

		const project = getJson<Project>(result, "project.json");
		expect(project?.activeSlice).toBe("s1");
	});

	it("appends activity log entry", () => {
		const state = initWithSlices();
		const result = reduce(state, {
			type: "BEGIN_PLAN",
			epic: "e1",
			slice: "s1",
			ts: TS2,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		const entry = log?.[log?.length - 1]!;
		expect(entry.phase).toBe("begin-plan");
		expect(entry.scope).toBe("epics/e1/slices/s1");
	});

	it("second slice blocked by incomplete first", () => {
		const state = initWithSlices();
		const result = reduce(state, { type: "BEGIN_PLAN", epic: "e1", slice: "s2", ts: TS2 });

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_SLICE_NOT_READY");
		expect((result as StateError).detail?.blockingSlice).toBe("s1");
	});

	it("second slice succeeds after first completed", () => {
		let s = initWithSlices();
		// Run first slice through to completed
		s = reduce(s, { type: "BEGIN_PLAN", epic: "e1", slice: "s1", ts: TS }) as ProjectState;
		// Move through plan/refine/implement lifecycle
		s = setEntry(s, "epics/e1/slices/s1/plan.md", { type: "markdown", content: "# Plan" });
		s = reduce(s, { type: "COMPLETE_PLAN", epic: "e1", slice: "s1", ts: TS }) as ProjectState;
		s = setEntry(s, "epics/e1/slices/s1/plan-refined.md", {
			type: "markdown",
			content: "# Refined",
		});
		s = reduce(s, {
			type: "COMPLETE_REFINEMENT_ROUND",
			epic: "e1",
			slice: "s1",
			ts: TS,
			scores: { q: 10 },
		}) as ProjectState;
		s = reduce(s, {
			type: "BEGIN_IMPLEMENTATION",
			epic: "e1",
			slice: "s1",
			ts: TS,
		}) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_IMPLEMENTATION",
			epic: "e1",
			slice: "s1",
			ts: TS,
		}) as ProjectState;
		s = reduce(s, {
			type: "COMPLETE_SLICE",
			epic: "e1",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [],
			learnings: [],
			architectureDelta: [],
		}) as ProjectState;

		// Now s2 should be allowed
		const result = reduce(s, { type: "BEGIN_PLAN", epic: "e1", slice: "s2", ts: TS3 });
		expect(isStateError(result)).toBe(false);
		expect(getJson<Slice>(result as ProjectState, "epics/e1/slices/s2/slice.json")?.status).toBe(
			"planning",
		);
	});

	it("second slice succeeds after first abandoned", () => {
		let s = initWithSlices();
		s = reduce(s, {
			type: "ABANDON_SLICE",
			epic: "e1",
			slice: "s1",
			ts: TS2,
			reason: "Not needed",
		}) as ProjectState;

		const result = reduce(s, { type: "BEGIN_PLAN", epic: "e1", slice: "s2", ts: TS3 });
		expect(isStateError(result)).toBe(false);
		expect(getJson<Slice>(result as ProjectState, "epics/e1/slices/s2/slice.json")?.status).toBe(
			"planning",
		);
	});

	it("rejects wrong status (not created)", () => {
		let s = initWithSlices();
		s = reduce(s, { type: "BEGIN_PLAN", epic: "e1", slice: "s1", ts: TS }) as ProjectState;
		// Now s1 is in "planning" — trying BEGIN_PLAN again should fail
		const result = reduce(s, { type: "BEGIN_PLAN", epic: "e1", slice: "s1", ts: TS2 });
		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});
});
