import { describe, expect, it } from "vitest";
import type { ConvergenceConfig } from "../../../src/schemas/trust/convergence.js";
import type { ReviewerPayload } from "../../../src/schemas/trust/reviewer-payload.js";
import { evaluateConvergence } from "../../../src/trust/convergence/evaluator.js";
import type { Rubric, ScoredEvent } from "../../../src/trust/convergence/evaluator.js";
import type { RelevanceWeight } from "../../../src/trust/convergence/types.js";

const defaultConfig: ConvergenceConfig = {
	maxRounds: 3,
	stagnationWindow: 2,
	disagreementThreshold: 3,
	reductionThreshold: 0.1,
};

const defaultRubric: Rubric = {
	dimensions: [
		{ name: "alignment", threshold: 4 },
		{ name: "completeness", threshold: 4 },
	],
};

function makePayload(
	overrides: Partial<ReviewerPayload> & { reviewerId: string },
): ReviewerPayload {
	return {
		reviewerId: overrides.reviewerId,
		dimensions: overrides.dimensions ?? [],
		findings: overrides.findings ?? [],
		rationale: overrides.rationale ?? "test rationale",
	};
}

function makeEvent(round: number, payload: ReviewerPayload): ScoredEvent {
	return { round, payload };
}

describe("evaluateConvergence", () => {
	it("returns CONVERGED when all dimensions pass and no blocking findings", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [
						{ name: "alignment", score: 5, threshold: 4, passed: true },
						{ name: "completeness", score: 4, threshold: 4, passed: true },
					],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([["reviewer-holistic", "high"]]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONVERGED");
		expect(result.blockingFindings).toHaveLength(0);
		expect(result.dimensions).toHaveLength(2);
	});

	it("returns CONTINUE when one dimension is below threshold", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [
						{ name: "alignment", score: 5, threshold: 4, passed: true },
						{ name: "completeness", score: 2, threshold: 4, passed: false },
					],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([["reviewer-holistic", "high"]]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONTINUE");
	});

	it("returns CONTINUE when all dimensions pass but BLOCKING finding present", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [
						{ name: "alignment", score: 5, threshold: 4, passed: true },
						{ name: "completeness", score: 5, threshold: 4, passed: true },
					],
					findings: [
						{ severity: "BLOCKING", dimension: "alignment", description: "Missing goal statement" },
					],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([["reviewer-holistic", "high"]]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONTINUE");
		expect(result.blockingFindings).toHaveLength(1);
	});

	it("returns CONTINUE when CRITICAL finding present from medium-relevance reviewer", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-plan",
					dimensions: [{ name: "alignment", score: 5, threshold: 4, passed: true }],
					findings: [
						{ severity: "CRITICAL", dimension: "alignment", description: "Scope creep detected" },
					],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([["reviewer-plan", "medium"]]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONTINUE");
		expect(result.blockingFindings).toHaveLength(1);
	});

	it("returns CONVERGED when low-relevance reviewer is below threshold (advisory only)", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [
						{ name: "alignment", score: 5, threshold: 4, passed: true },
						{ name: "completeness", score: 5, threshold: 4, passed: true },
					],
				}),
			),
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-style",
					dimensions: [{ name: "alignment", score: 1, threshold: 4, passed: false }],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([
			["reviewer-holistic", "high"],
			["reviewer-style", "low"],
		]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONVERGED");
	});

	it("CRITICAL finding from low-relevance reviewer is advisory, not blocking", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [{ name: "alignment", score: 5, threshold: 4, passed: true }],
				}),
			),
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-style",
					dimensions: [{ name: "alignment", score: 5, threshold: 4, passed: true }],
					findings: [{ severity: "CRITICAL", dimension: "alignment", description: "Style issue" }],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([
			["reviewer-holistic", "high"],
			["reviewer-style", "low"],
		]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONVERGED");
		expect(result.blockingFindings).toHaveLength(0);
	});

	it("handles empty events list", () => {
		const weights = new Map<string, RelevanceWeight>();
		const result = evaluateConvergence([], defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONVERGED");
		expect(result.dimensions).toHaveLength(0);
		expect(result.blockingFindings).toHaveLength(0);
	});

	it("handles single reviewer with exactly-at-threshold scores", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [
						{ name: "alignment", score: 4, threshold: 4, passed: true },
						{ name: "completeness", score: 4, threshold: 4, passed: true },
					],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([["reviewer-holistic", "high"]]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONVERGED");
	});

	it("defaults unknown reviewer to medium relevance", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "unknown-reviewer",
					dimensions: [{ name: "alignment", score: 1, threshold: 4, passed: false }],
				}),
			),
		];
		// Empty weights map — reviewer not found, defaults to "medium"
		const weights = new Map<string, RelevanceWeight>();

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		// Medium relevance blocks on failed dimensions
		expect(result.state).toBe("CONTINUE");
	});
});
