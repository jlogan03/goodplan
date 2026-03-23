import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl, setEntry } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Slice } from "../../../src/schemas/entities/slice.js";
import type { Project } from "../../../src/schemas/entities/project.js";
import type { Overview } from "../../../src/schemas/entities/overview.js";
import type { LearningEntry } from "../../../src/schemas/records/learning.js";
import type { ArchitectureDelta } from "../../../src/schemas/records/architecture-delta.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";
const TS3 = "2026-01-03T00:00:00.000Z";

function stateWithSliceInImplementationComplete(): ProjectState {
	let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Build stuff", ts: TS }) as ProjectState;
	s = reduce(s, { type: "CREATE_SLICE", name: "s1", epic: "e1", goal: "First slice", ts: TS }) as ProjectState;
	s = reduce(s, { type: "BEGIN_PLAN", slice: "s1", ts: TS }) as ProjectState;
	s = setEntry(s, "slices/s1/plan.md", { type: "markdown", content: "# Plan" });
	s = reduce(s, { type: "COMPLETE_PLAN", slice: "s1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_REFINEMENT_ROUND", slice: "s1", ts: TS, scores: { q: 10 } }) as ProjectState;
	s = setEntry(s, "slices/s1/plan-refined.md", { type: "markdown", content: "# Refined" });
	s = reduce(s, { type: "BEGIN_IMPLEMENTATION", slice: "s1", ts: TS }) as ProjectState;
	s = reduce(s, { type: "COMPLETE_IMPLEMENTATION", slice: "s1", ts: TS }) as ProjectState;
	return s;
}

describe("reduce — COMPLETE_SLICE", () => {
	it("happy path: completes slice with deferred, learnings, architecture deltas", () => {
		let s = stateWithSliceInImplementationComplete();
		// Create a target slice for deferred routing
		s = reduce(s, { type: "CREATE_SLICE", name: "s2", epic: "e1", goal: "Second slice", ts: TS }) as ProjectState;

		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [{ description: "Handle edge case", targetSlice: "s2" }],
			learnings: [
				{
					category: "domain",
					summary: "Data layer needs caching",
					detail: "Disk I/O is too slow without caching",
					tags: ["perf"],
					rollupTo: ["epic", "project"],
				},
			],
			architectureDelta: [
				{
					subsystem: "data-layer",
					type: "modify",
					description: "Added caching layer",
				},
			],
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		// Slice completed
		const slice = getJson<Slice>(newState, "slices/s1/slice.json");
		expect(slice!.status).toBe("completed");
		expect(slice!.updated).toBe(TS2);

		// Overview synced
		const overview = getJson<Overview>(newState, "slices/overview.json");
		const s1Item = overview!.items.find((i) => i.name === "s1");
		expect(s1Item!.status).toBe("completed");

		// Deferred routed to s2
		const s2 = getJson<Slice>(newState, "slices/s2/slice.json");
		expect(s2!.deferred).toHaveLength(1);
		expect(s2!.deferred[0]!.description).toBe("Handle edge case");

		// Per-slice learnings
		const sliceLearnings = getJsonl<LearningEntry>(newState, "slices/s1/learnings.jsonl");
		expect(sliceLearnings).toHaveLength(1);
		expect(sliceLearnings![0]!.source).toBe("slices/s1");
		expect(sliceLearnings![0]!.rollup).toBe(true);

		// Epic learnings rollup
		const epicLearnings = getJsonl<LearningEntry>(newState, "epics/e1/learnings.jsonl");
		expect(epicLearnings).toHaveLength(1);

		// Project learnings rollup
		const projectLearnings = getJsonl<LearningEntry>(newState, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(1);

		// Architecture deltas
		const deltas = getJsonl<ArchitectureDelta>(newState, "slices/s1/architecture-deltas.jsonl");
		expect(deltas).toHaveLength(1);
		expect(deltas![0]!.subsystem).toBe("data-layer");
		expect(deltas![0]!.ts).toBe(TS2);

		// activeSlice cleared
		const project = getJson<Project>(newState, "project.json");
		expect(project!.activeSlice).toBeNull();
	});

	it("verificationPassed: false returns error", () => {
		const s = stateWithSliceInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: false,
			deferred: [],
			learnings: [],
			architectureDelta: [],
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_VERIFICATION_FAILED");
	});

	it("deferred to nonexistent target skips with warning log", () => {
		const s = stateWithSliceInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [{ description: "Something", targetSlice: "nonexistent" }],
			learnings: [],
			architectureDelta: [],
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		// Slice still completes
		const slice = getJson<Slice>(newState, "slices/s1/slice.json");
		expect(slice!.status).toBe("completed");

		// Activity log should have a deferred-skip entry
		const log = getJsonl<Record<string, unknown>>(newState, "activity-log.jsonl");
		const skipEntry = log!.find((e) => e.phase === "deferred-skip");
		expect(skipEntry).toBeDefined();
	});

	it("learnings only to epic (not project)", () => {
		const s = stateWithSliceInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [],
			learnings: [{
				category: "worked",
				summary: "Test",
				detail: "Detail",
				tags: [],
				rollupTo: ["epic"],
			}],
			architectureDelta: [],
		}) as ProjectState;

		// Epic should have it
		const epicLearnings = getJsonl<LearningEntry>(result, "epics/e1/learnings.jsonl");
		expect(epicLearnings).toHaveLength(1);

		// Project should NOT have it (original project learnings.jsonl may not exist)
		const projectLearnings = getJsonl<LearningEntry>(result, "learnings.jsonl");
		// Should be empty or not contain this learning
		expect(projectLearnings ?? []).toHaveLength(0);
	});

	it("learnings with no rollupTo stays slice-only", () => {
		const s = stateWithSliceInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [],
			learnings: [{
				category: "domain",
				summary: "Local only",
				detail: "Detail",
				tags: [],
				rollupTo: [],
			}],
			architectureDelta: [],
		}) as ProjectState;

		const sliceLearnings = getJsonl<LearningEntry>(result, "slices/s1/learnings.jsonl");
		expect(sliceLearnings).toHaveLength(1);
		expect(sliceLearnings![0]!.rollup).toBe(false);

		// No rollup to epic or project
		const epicLearnings = getJsonl<LearningEntry>(result, "epics/e1/learnings.jsonl");
		expect(epicLearnings ?? []).toHaveLength(0);
	});

	it("empty deferred/learnings/architectureDelta works", () => {
		const s = stateWithSliceInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [],
			learnings: [],
			architectureDelta: [],
		});

		expect(isStateError(result)).toBe(false);
		const slice = getJson<Slice>(result as ProjectState, "slices/s1/slice.json");
		expect(slice!.status).toBe("completed");
	});

	it("rejects wrong status", () => {
		let s = reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "Build stuff", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_SLICE", name: "s1", epic: "e1", goal: "Test", ts: TS }) as ProjectState;

		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS,
			verificationPassed: true,
			deferred: [],
			learnings: [],
			architectureDelta: [],
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("epicComplete: all siblings completed (detected via overview)", () => {
		let s = stateWithSliceInImplementationComplete();
		// The single slice is about to be completed — after completion, all epic slices done.
		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [],
			learnings: [],
			architectureDelta: [],
		}) as ProjectState;

		// Verify the state: all slices in epic are completed
		const overview = getJson<Overview>(result, "slices/overview.json");
		const epicSlices = overview!.items.filter((i) => i.epic === "e1");
		const allDone = epicSlices.every((i) => i.status === "completed" || i.status === "abandoned");
		expect(allDone).toBe(true);
		// Note: epicComplete flag is derived by RPC layer, not state machine.
		// We just verify the state is correct for the RPC layer to detect it.
	});

	it("O(n^2) fix: multiple learnings with rollupTo project produce correct learnings.jsonl", () => {
		const s = stateWithSliceInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [],
			learnings: [
				{ category: "domain", summary: "L1", detail: "D1", tags: [], rollupTo: ["project"] },
				{ category: "worked", summary: "L2", detail: "D2", tags: [], rollupTo: ["project"] },
				{ category: "didnt-work", summary: "L3", detail: "D3", tags: [], rollupTo: ["project"] },
			],
			architectureDelta: [],
		}) as ProjectState;

		// All 3 should appear in project learnings
		const projectLearnings = getJsonl<LearningEntry>(result, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(3);
		expect(projectLearnings!.map((l) => l.summary)).toEqual(["L1", "L2", "L3"]);

		// All 3 should also be in per-slice learnings
		const sliceLearnings = getJsonl<LearningEntry>(result, "slices/s1/learnings.jsonl");
		expect(sliceLearnings).toHaveLength(3);
	});

	it("O(n^2) fix: multiple learnings with rollupTo epic produce correct epic learnings", () => {
		const s = stateWithSliceInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [],
			learnings: [
				{ category: "domain", summary: "E1", detail: "D1", tags: [], rollupTo: ["epic"] },
				{ category: "worked", summary: "E2", detail: "D2", tags: [], rollupTo: ["epic"] },
			],
			architectureDelta: [],
		}) as ProjectState;

		const epicLearnings = getJsonl<LearningEntry>(result, "epics/e1/learnings.jsonl");
		expect(epicLearnings).toHaveLength(2);
		expect(epicLearnings!.map((l) => l.summary)).toEqual(["E1", "E2"]);
	});

	it("O(n^2) fix: mixed rollupTo targets batch correctly", () => {
		const s = stateWithSliceInImplementationComplete();
		const result = reduce(s, {
			type: "COMPLETE_SLICE",
			slice: "s1",
			ts: TS2,
			verificationPassed: true,
			deferred: [],
			learnings: [
				{ category: "domain", summary: "Both", detail: "D", tags: [], rollupTo: ["epic", "project"] },
				{ category: "worked", summary: "EpicOnly", detail: "D", tags: [], rollupTo: ["epic"] },
				{ category: "didnt-work", summary: "ProjectOnly", detail: "D", tags: [], rollupTo: ["project"] },
				{ category: "do-differently", summary: "LocalOnly", detail: "D", tags: [], rollupTo: [] },
			],
			architectureDelta: [],
		}) as ProjectState;

		const epicLearnings = getJsonl<LearningEntry>(result, "epics/e1/learnings.jsonl");
		expect(epicLearnings).toHaveLength(2); // Both + EpicOnly

		const projectLearnings = getJsonl<LearningEntry>(result, "learnings.jsonl");
		expect(projectLearnings).toHaveLength(2); // Both + ProjectOnly

		const sliceLearnings = getJsonl<LearningEntry>(result, "slices/s1/learnings.jsonl");
		expect(sliceLearnings).toHaveLength(4); // all 4
	});
});
