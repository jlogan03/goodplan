import { describe, expect, it } from "vitest";
import {
	computeDerivedState,
	createEmptyState,
} from "../../../src/engine/derived-state/compute.js";
import type { AnyEventEnvelope } from "../../../src/schemas/envelope.js";

function makeEvent(
	overrides: Partial<AnyEventEnvelope> & { domain: string; type: string },
): AnyEventEnvelope {
	return {
		id: crypto.randomUUID(),
		schemaVersion: 1,
		ts: new Date().toISOString(),
		scope: "project",
		scopeRef: null,
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

describe("computeDerivedState", () => {
	it("returns empty/default state for empty event array", () => {
		const state = computeDerivedState([]);
		expect(state.project.initialized).toBe(false);
		expect(state.project.name).toBe("");
		expect(state.epics.size).toBe(0);
		expect(state.sideQuests.size).toBe(0);
	});

	it("handles project-initialized event", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "my-project", version: "2.0.0" },
			}),
		];
		const state = computeDerivedState(events);
		expect(state.project.initialized).toBe(true);
		expect(state.project.name).toBe("my-project");
		expect(state.project.version).toBe("2.0.0");
	});

	it("handles epic creation", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "my-epic",
				payload: { dir: "my-epic" },
			}),
		];
		const state = computeDerivedState(events);
		expect(state.epics.size).toBe(1);
		const epic = state.epics.get("my-epic");
		expect(epic).toBeDefined();
		expect(epic?.phase).toBe("P0");
		expect(epic?.active).toBe(false);
	});

	it("handles epic lifecycle through P12", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				scope: "epic",
				scopeRef: "e1",
				payload: { goal: null },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "exploration-concluded",
				scope: "epic",
				scopeRef: "e1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-target-committed",
				scope: "epic",
				scopeRef: "e1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-committed",
				scope: "epic",
				scopeRef: "e1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-set-committed",
				scope: "epic",
				scopeRef: "e1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-activated",
				scope: "epic",
				scopeRef: "e1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "s1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-plan-drafted",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "plan-shape-approved",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-plan-committed",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-implementation-started",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-code-refinement-started",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-landed",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1" },
			}),
		];

		const state = computeDerivedState(events);
		const epic = state.epics.get("e1");
		expect(epic).toBeDefined();
		expect(epic?.phase).toBe("P6");
		expect(epic?.active).toBe(true);

		const slice = epic?.slices.get("s1");
		expect(slice).toBeDefined();
		expect(slice?.phase).toBe("P12");
	});

	it("handles side-quest lifecycle", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "side-quest-created",
				scope: "side-quest",
				scopeRef: "sq1",
				payload: { dir: "sq1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "side-quest-goal-committed",
				scope: "side-quest",
				scopeRef: "sq1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "side-quest-plan-committed",
				scope: "side-quest",
				scopeRef: "sq1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "side-quest-implementation-started",
				scope: "side-quest",
				scopeRef: "sq1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "side-quest-landed",
				scope: "side-quest",
				scopeRef: "sq1",
				payload: {},
			}),
		];

		const state = computeDerivedState(events);
		const sq = state.sideQuests.get("sq1");
		expect(sq).toBeDefined();
		expect(sq?.phase).toBe("S3");
		expect(sq?.landed).toBe(true);
		expect(sq?.active).toBe(false);
	});

	it("silently skips unknown event types", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
			makeEvent({ domain: "entity-lifecycle", type: "totally-unknown-event", payload: {} }),
		];
		// Should not throw
		const state = computeDerivedState(events);
		expect(state.project.initialized).toBe(true);
	});

	it("silently skips unknown domains", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
			makeEvent({
				domain: "future-domain" as AnyEventEnvelope["domain"],
				type: "something",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		expect(state.project.initialized).toBe(true);
	});

	it("handles epic pause and resume", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-activated",
				scope: "epic",
				scopeRef: "e1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-paused",
				scope: "epic",
				scopeRef: "e1",
				payload: {},
			}),
		];
		let state = computeDerivedState(events);
		expect(state.epics.get("e1")?.paused).toBe(true);

		events.push(
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-resumed",
				scope: "epic",
				scopeRef: "e1",
				payload: {},
			}),
		);
		state = computeDerivedState(events);
		expect(state.epics.get("e1")?.paused).toBe(false);
	});

	it("handles multi-epic state", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e2",
				payload: { dir: "e2" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				scope: "epic",
				scopeRef: "e1",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-abandoned",
				scope: "epic",
				scopeRef: "e2",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		expect(state.epics.size).toBe(2);
		expect(state.epics.get("e1")?.phase).toBe("P1");
		expect(state.epics.get("e2")?.abandoned).toBe(true);
	});

	it("handles chunk lifecycle", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "s1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-implementation-chunk-started",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1", chunkId: "c1", description: "test chunk" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "chunk-red-test-written",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1", chunkId: "c1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "chunk-red-test-failed",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1", chunkId: "c1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "chunk-green-achieved",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1", chunkId: "c1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "chunk-verified",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1", chunkId: "c1" },
			}),
		];
		const state = computeDerivedState(events);
		const chunk = state.epics.get("e1")?.slices.get("s1")?.chunks.get("c1");
		expect(chunk).toBeDefined();
		expect(chunk?.status).toBe("verified");
		expect(chunk?.description).toBe("test chunk");
	});

	it("createEmptyState returns proper defaults", () => {
		const state = createEmptyState();
		expect(state.project.initialized).toBe(false);
		expect(state.project.steeringPreference).toBe("best-guess-and-flag");
		expect(state.epics).toBeInstanceOf(Map);
		expect(state.sideQuests).toBeInstanceOf(Map);
		expect(state.convergenceSnapshots).toBeInstanceOf(Map);
		expect(state.latestDimensionScores).toBeInstanceOf(Map);
	});

	it("handles steering preference set", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
			makeEvent({
				domain: "pause-steering",
				type: "steering-preference-set",
				payload: { preference: "always-consult" },
			}),
		];
		const state = computeDerivedState(events);
		expect(state.project.steeringPreference).toBe("always-consult");
	});
});
