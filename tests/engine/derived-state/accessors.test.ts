import { describe, expect, it } from "vitest";
import {
	activeEntities,
	blockers,
	currentPhase,
	suggestedNextSteps,
	validTransitions,
} from "../../../src/engine/derived-state/accessors.js";
import { computeDerivedState } from "../../../src/engine/derived-state/compute.js";
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

describe("currentPhase", () => {
	it("returns undefined for unknown scope", () => {
		const state = computeDerivedState([]);
		expect(currentPhase(state, "nonexistent")).toBeUndefined();
	});

	it("returns epic phase", () => {
		const state = computeDerivedState([
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
				payload: {},
			}),
		]);
		expect(currentPhase(state, "e1")).toBe("P1");
	});

	it("returns slice phase via epicDir/sliceDir format", () => {
		const state = computeDerivedState([
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
				type: "slice-plan-drafted",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1" },
			}),
		]);
		expect(currentPhase(state, "e1/s1")).toBe("P7");
	});

	it("returns side-quest phase", () => {
		const state = computeDerivedState([
			makeEvent({
				domain: "entity-lifecycle",
				type: "side-quest-created",
				scope: "side-quest",
				scopeRef: "sq1",
				payload: { dir: "sq1" },
			}),
		]);
		expect(currentPhase(state, "sq1")).toBe("S0");
	});
});

describe("activeEntities", () => {
	it("returns empty array for empty state", () => {
		const state = computeDerivedState([]);
		expect(activeEntities(state)).toEqual([]);
	});

	it("includes active epics and excludes completed/abandoned", () => {
		const state = computeDerivedState([
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
				type: "epic-created",
				scope: "epic",
				scopeRef: "e2",
				payload: { dir: "e2" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-abandoned",
				scope: "epic",
				scopeRef: "e2",
				payload: {},
			}),
		]);
		const active = activeEntities(state);
		expect(active.some((e) => e.ref === "e1")).toBe(true);
		expect(active.some((e) => e.ref === "e2")).toBe(false);
	});
});

describe("blockers", () => {
	it("returns project-not-initialized blocker for epic", () => {
		const state = computeDerivedState([
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
		]);
		const b = blockers(state, "e1");
		expect(b.length).toBeGreaterThan(0);
		expect(b[0]?.description).toContain("Project not initialized");
	});
});

describe("validTransitions", () => {
	it("returns empty for unknown scope", () => {
		const state = computeDerivedState([]);
		expect(validTransitions(state, "nonexistent")).toEqual([]);
	});

	it("suggests goal-draft for P0 epic", () => {
		const state = computeDerivedState([
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
		]);
		const t = validTransitions(state, "e1");
		expect(t.some((tr) => tr.command.includes("goal-draft"))).toBe(true);
	});
});

describe("suggestedNextSteps", () => {
	it("suggests init when project not initialized", () => {
		const state = computeDerivedState([]);
		const steps = suggestedNextSteps(state);
		expect(steps.length).toBe(1);
		expect(steps[0]?.command).toBe("gp init");
	});

	it("suggests epic transitions for active epics", () => {
		const state = computeDerivedState([
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
		]);
		const steps = suggestedNextSteps(state);
		expect(steps.length).toBeGreaterThan(0);
		expect(steps.some((s) => s.command.includes("goal-draft"))).toBe(true);
	});
});
