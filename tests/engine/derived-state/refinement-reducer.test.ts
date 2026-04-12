/**
 * Unit tests for the refinement domain reducer.
 * Verifies that all 7 refinement event types are handled correctly,
 * updating convergenceSnapshots and latestDimensionScores.
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

function baseEvents(): AnyEventEnvelope[] {
	return [
		makeEvent({
			domain: "entity-lifecycle",
			type: "epic-created",
			payload: { directory: "test-epic" },
		}),
	];
}

describe("reduceRefinement", () => {
	it("handles refinement-round-started: initializes convergence snapshot", () => {
		const events = [
			...baseEvents(),
			makeEvent({
				domain: "refinement",
				type: "refinement-round-started",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1 },
			}),
		];
		const state = computeDerivedState(events);
		const snapshot = state.convergenceSnapshots.get("test-epic:plan");
		expect(snapshot).toBeDefined();
		expect(snapshot?.state).toBe("CONTINUE");
		expect(snapshot?.round).toBe(1);
		expect(snapshot?.artifactType).toBe("plan");
		expect(snapshot?.scopeRef).toBe("test-epic");
	});

	it("handles reviewer-scored: updates latestDimensionScores", () => {
		const dimensions = [{ name: "completeness", score: 7, threshold: 6, passed: true }];
		const findings = [
			{
				severity: "MINOR" as const,
				dimension: "completeness",
				description: "Could be more detailed",
			},
		];
		const events = [
			...baseEvents(),
			makeEvent({
				domain: "refinement",
				type: "refinement-round-started",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1 },
			}),
			makeEvent({
				domain: "refinement",
				type: "reviewer-scored",
				payload: {
					artifactType: "plan",
					scopeRef: "test-epic",
					round: 1,
					reviewerId: "arch-reviewer",
					dimensions,
					findings,
				},
			}),
		];
		const state = computeDerivedState(events);
		const scores = state.latestDimensionScores.get("test-epic:plan:arch-reviewer");
		expect(scores).toBeDefined();
		expect(scores).toHaveLength(1);
		expect(scores?.[0]?.name).toBe("completeness");
		expect(scores?.[0]?.score).toBe(7);
	});

	it("handles refinement-synthesized: records synthesis ref on snapshot", () => {
		const synthesisRef = makeContentRef("epics/test-epic/synthesis-r1.md");
		const events = [
			...baseEvents(),
			makeEvent({
				domain: "refinement",
				type: "refinement-round-started",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1 },
			}),
			makeEvent({
				domain: "refinement",
				type: "refinement-synthesized",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1, synthesis: synthesisRef },
			}),
		];
		const state = computeDerivedState(events);
		const snapshot = state.convergenceSnapshots.get("test-epic:plan");
		expect(snapshot?.synthesisRef).toEqual(synthesisRef);
	});

	it("handles artifact-revised: records revised artifact ref on snapshot", () => {
		const artifactRef = makeContentRef("epics/test-epic/plan-r1.md");
		const events = [
			...baseEvents(),
			makeEvent({
				domain: "refinement",
				type: "refinement-round-started",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1 },
			}),
			makeEvent({
				domain: "refinement",
				type: "artifact-revised",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1, artifact: artifactRef },
			}),
		];
		const state = computeDerivedState(events);
		const snapshot = state.convergenceSnapshots.get("test-epic:plan");
		expect(snapshot?.revisedArtifactRef).toEqual(artifactRef);
	});

	it("handles refinement-converged: sets state to CONVERGED", () => {
		const convergenceResult = {
			state: "CONVERGED" as const,
			dimensions: [{ name: "completeness", score: 8, threshold: 6, passed: true }],
			blockingFindings: [],
		};
		const events = [
			...baseEvents(),
			makeEvent({
				domain: "refinement",
				type: "refinement-round-started",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1 },
			}),
			makeEvent({
				domain: "refinement",
				type: "refinement-converged",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1, convergenceResult },
			}),
		];
		const state = computeDerivedState(events);
		const snapshot = state.convergenceSnapshots.get("test-epic:plan");
		expect(snapshot?.state).toBe("CONVERGED");
		expect(snapshot?.overridden).toBeUndefined();
	});

	it("handles refinement-circuit-breaker-tripped: sets state to CIRCUIT-BROKEN", () => {
		const reason = { type: "round-budget-exceeded" as const, round: 3, maxRounds: 3 };
		const events = [
			...baseEvents(),
			makeEvent({
				domain: "refinement",
				type: "refinement-round-started",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1 },
			}),
			makeEvent({
				domain: "refinement",
				type: "refinement-circuit-breaker-tripped",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 3, reason },
			}),
		];
		const state = computeDerivedState(events);
		const snapshot = state.convergenceSnapshots.get("test-epic:plan");
		expect(snapshot?.state).toBe("CIRCUIT-BROKEN");
	});

	it("handles convergence-overridden: sets state to CONVERGED with overridden flag", () => {
		const events = [
			...baseEvents(),
			makeEvent({
				domain: "refinement",
				type: "refinement-round-started",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1 },
			}),
			makeEvent({
				domain: "refinement",
				type: "convergence-overridden",
				payload: {
					artifactType: "plan",
					scopeRef: "test-epic",
					round: 1,
					reason: "User accepted as-is",
				},
			}),
		];
		const state = computeDerivedState(events);
		const snapshot = state.convergenceSnapshots.get("test-epic:plan");
		expect(snapshot?.state).toBe("CONVERGED");
		expect(snapshot?.overridden).toBe(true);
	});

	it("round-started resets the snapshot for a new round", () => {
		const events = [
			...baseEvents(),
			makeEvent({
				domain: "refinement",
				type: "refinement-round-started",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 1 },
			}),
			makeEvent({
				domain: "refinement",
				type: "refinement-round-started",
				payload: { artifactType: "plan", scopeRef: "test-epic", round: 2 },
			}),
		];
		const state = computeDerivedState(events);
		const snapshot = state.convergenceSnapshots.get("test-epic:plan");
		expect(snapshot?.round).toBe(2);
		expect(snapshot?.state).toBe("CONTINUE");
		expect(snapshot?.synthesisRef).toBeUndefined();
		expect(snapshot?.revisedArtifactRef).toBeUndefined();
	});
});
