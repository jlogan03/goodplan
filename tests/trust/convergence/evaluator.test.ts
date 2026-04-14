import { describe, expect, it } from "vitest";
import type { ConvergenceConfig } from "../../../src/schemas/trust/convergence.js";
import type { ReviewerPayload } from "../../../src/schemas/trust/reviewer-payload.js";
import { evaluateConvergence } from "../../../src/trust/convergence/evaluator.js";
import type { ConvergenceRubric, ScoredEvent } from "../../../src/trust/convergence/evaluator.js";
import type { RelevanceWeight } from "../../../src/trust/convergence/types.js";

const defaultConfig: ConvergenceConfig = {
	maxRounds: 10,
	stagnationWindow: 2,
	disagreementThreshold: 3,
	reductionThreshold: 0.1,
};

const defaultRubric: ConvergenceRubric = {
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
	it("returns CONVERGED when all dimensions meet rubric thresholds and no blocking findings", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [
						{ name: "alignment", score: 5 },
						{ name: "completeness", score: 4 },
					],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([["reviewer-holistic", "high"]]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONVERGED");
		expect(result.blockingFindings).toHaveLength(0);
		expect(result.dimensions).toHaveLength(2);
		// Evaluator enriches with threshold, passed, reviewerId, relevance
		expect(result.dimensions[0]?.passed).toBe(true);
		expect(result.dimensions[0]?.threshold).toBe(4);
		expect(result.dimensions[0]?.reviewerId).toBe("reviewer-holistic");
		expect(result.dimensions[0]?.relevance).toBe("high");
	});

	it("returns CONTINUE when dimension score is below rubric threshold", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [
						{ name: "alignment", score: 5 },
						{ name: "completeness", score: 2 },
					],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([["reviewer-holistic", "high"]]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		expect(result.state).toBe("CONTINUE");
		expect(result.dimensions[1]?.passed).toBe(false);
	});

	it("returns CONTINUE when all dimensions pass but BLOCKING finding present", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [
						{ name: "alignment", score: 5 },
						{ name: "completeness", score: 5 },
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
					dimensions: [{ name: "alignment", score: 5 }],
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
						{ name: "alignment", score: 5 },
						{ name: "completeness", score: 5 },
					],
				}),
			),
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-style",
					dimensions: [{ name: "alignment", score: 1 }],
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
					dimensions: [{ name: "alignment", score: 5 }],
				}),
			),
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-style",
					dimensions: [{ name: "alignment", score: 5 }],
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
						{ name: "alignment", score: 4 },
						{ name: "completeness", score: 4 },
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
					dimensions: [{ name: "alignment", score: 1 }],
				}),
			),
		];
		// Empty weights map — reviewer not found, defaults to "medium"
		const weights = new Map<string, RelevanceWeight>();

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		// Medium relevance blocks on failed dimensions
		expect(result.state).toBe("CONTINUE");
	});

	it("returns CIRCUIT-BROKEN when round budget exceeded", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				10,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [{ name: "alignment", score: 5 }],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([["reviewer-holistic", "high"]]);
		const config: ConvergenceConfig = { ...defaultConfig, maxRounds: 10 };

		const result = evaluateConvergence(events, defaultRubric, weights, config);

		expect(result.state).toBe("CIRCUIT-BROKEN");
		expect(result.reason).toBeDefined();
		expect(result.reason?.type).toBe("round-budget-exceeded");
	});

	it("uses rubric threshold of 0 for dimensions not in rubric", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [{ name: "unknown-dimension", score: 1 }],
				}),
			),
		];
		const weights = new Map<string, RelevanceWeight>([["reviewer-holistic", "high"]]);

		const result = evaluateConvergence(events, defaultRubric, weights, defaultConfig);

		// Unknown dimension defaults to threshold 0, so score 1 passes
		expect(result.state).toBe("CONVERGED");
		expect(result.dimensions[0]?.threshold).toBe(0);
		expect(result.dimensions[0]?.passed).toBe(true);
	});
});
