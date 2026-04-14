/**
 * Unit tests for Phase 3 derived state reducers: epic goal, exploration, and architecture.
 *
 * Replays event sequences and verifies phase transitions P0 -> P1 -> P2 -> P3,
 * ContentRef field population, and invariant enforcement.
 */

import { describe, expect, it } from "vitest";
import { computeDerivedState } from "../../../src/engine/derived-state/compute.js";
import type { AnyEventEnvelope, ContentRef } from "../../../src/schemas/envelope.js";

function makeEvent(
	overrides: Partial<AnyEventEnvelope> & { domain: string; type: string },
): AnyEventEnvelope {
	return {
		id: crypto.randomUUID(),
		schemaVersion: 1,
		ts: new Date().toISOString(),
		scope: "epic",
		scopeRef: "test-epic",
		actor: { kind: "cli", id: "test" },
		branch: "main",
		commitHint: null,
		domain: overrides.domain as AnyEventEnvelope["domain"],
		type: overrides.type,
		payload: overrides.payload ?? {},
		prevId: null,
		...overrides,
	} as AnyEventEnvelope;
}

function makeContentRef(path: string): ContentRef {
	return {
		sha: "a".repeat(40),
		size: 100,
		path,
		mediaType: "text/markdown",
	};
}

describe("epic phase transitions (P0 -> P3)", () => {
	it("starts at P0 after epic-created", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic).toBeDefined();
		expect(epic?.phase).toBe("P0");
	});

	it("transitions to P1 on epic-goal-committed", () => {
		const goalRef = makeContentRef("epics/test-epic/goal.md");
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-drafted",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				payload: { goal: goalRef },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.phase).toBe("P1");
		expect(epic?.goal).toEqual(goalRef);
	});

	it("transitions to P2 on exploration-concluded", () => {
		const goalRef = makeContentRef("epics/test-epic/goal.md");
		const summaryRef = makeContentRef("epics/test-epic/exploration-summary.md");
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-drafted",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "exploration",
				type: "exploration-cycle-started",
				payload: { cycleNumber: 1 },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "exploration-concluded",
				payload: { summary: summaryRef },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.phase).toBe("P2");
	});

	it("transitions to P3 on architecture-target-committed", () => {
		const goalRef = makeContentRef("epics/test-epic/goal.md");
		const summaryRef = makeContentRef("epics/test-epic/exploration-summary.md");
		const archRef = makeContentRef("epics/test-epic/architecture-target.md");
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-drafted",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "exploration",
				type: "exploration-cycle-started",
				payload: { cycleNumber: 1 },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "exploration-concluded",
				payload: { summary: summaryRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-target-drafted",
				payload: { architectureTarget: archRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-target-committed",
				payload: { architectureTarget: archRef },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.phase).toBe("P3");
		expect(epic?.architectureTarget).toEqual(archRef);
	});
});

describe("exploration sub-phase state", () => {
	it("tracks exploration cycles", () => {
		const goalRef = makeContentRef("epics/test-epic/goal.md");
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-drafted",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "exploration",
				type: "exploration-cycle-started",
				payload: { cycleNumber: 1 },
			}),
			makeEvent({
				domain: "exploration",
				type: "exploration-cycle-started",
				payload: { cycleNumber: 2 },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.explorationCycles).toBe(2);
	});

	it("tracks research refs", () => {
		const goalRef = makeContentRef("epics/test-epic/goal.md");
		const researchRef = makeContentRef("epics/test-epic/research/some-topic.md");
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-drafted",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "exploration",
				type: "research-captured",
				payload: { contentRef: researchRef, title: "Some Topic" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.researchRefs).toHaveLength(1);
		expect(epic?.researchRefs[0]).toEqual(researchRef);
	});

	it("tracks brainstorm refs", () => {
		const goalRef = makeContentRef("epics/test-epic/goal.md");
		const brainstormRef = makeContentRef("epics/test-epic/brainstorm/ideas.md");
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-drafted",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				payload: { goal: goalRef },
			}),
			makeEvent({
				domain: "exploration",
				type: "brainstorm-captured",
				payload: { contentRef: brainstormRef, title: "Ideas" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.brainstormRefs).toHaveLength(1);
		expect(epic?.brainstormRefs[0]).toEqual(brainstormRef);
	});
});

describe("architecture shape approval", () => {
	it("sets architectureShapeApproved on architecture-shape-approved", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-shape-approved",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.architectureShapeApproved).toBe(true);
	});

	it("sets architectureShapeApproved on architecture-shape-checkpoint-auto-shaped", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-shape-checkpoint-auto-shaped",
				payload: { preference: "best-guess-and-flag" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.architectureShapeApproved).toBe(true);
	});

	it("defaults architectureShapeApproved to false", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.architectureShapeApproved).toBe(false);
	});
});

describe("goal draft sets ContentRef correctly", () => {
	it("populates goal on epic-goal-drafted", () => {
		const goalRef = makeContentRef("epics/test-epic/goal.md");
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-drafted",
				payload: { goal: goalRef },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.goal).toEqual(goalRef);
		// Phase should still be P0 (draft doesn't advance phase)
		expect(epic?.phase).toBe("P0");
	});
});
