/**
 * Trust Substrate Integration Test
 *
 * Verifies the convergence evaluator works mechanically with real rubric YAML files.
 * Tests all convergence states (CONVERGED, CONTINUE, CIRCUIT-BROKEN),
 * relevance weighting, DimensionResult enrichment, and circuit breaker triggers.
 */
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateConvergence } from "../../src/trust/convergence/evaluator.js";
import type { ScoredEvent } from "../../src/trust/convergence/evaluator.js";
import type { ConvergenceConfig } from "../../src/schemas/trust/convergence.js";
import type { ReviewerPayload } from "../../src/schemas/trust/reviewer-payload.js";
import { loadRubric } from "../../src/trust/reviewers/rubric-loader.js";

const ROOT = path.resolve(import.meta.dirname, "../..");
const RUBRICS_DIR = path.join(ROOT, "plugin/rubrics");

// Load the holistic rubric (threshold: 9 for all dimensions)
const holisticResult = loadRubric(path.join(RUBRICS_DIR, "holistic.yaml"));
if (!holisticResult.success) throw new Error(`Failed to load holistic rubric: ${holisticResult.errors.join(", ")}`);
const HOLISTIC_RUBRIC = holisticResult.rubric;

const DEFAULT_CONFIG: ConvergenceConfig = {
	maxRounds: 8,
	stagnationWindow: 2,
	disagreementThreshold: 3,
	reductionThreshold: 1,
};

function makePayload(
	reviewerId: string,
	dimensions: Array<{ name: string; score: number }>,
	findings: ReviewerPayload["findings"] = [],
): ReviewerPayload {
	return { reviewerId, dimensions, findings, rationale: "test" };
}

function makeScoredEvent(round: number, payload: ReviewerPayload): ScoredEvent {
	return { round, payload };
}

// ─── Convergence States ────────────────────────────────────

describe("Convergence evaluator with real holistic rubric", () => {
	it("rubric loaded successfully with expected dimensions", () => {
		expect(HOLISTIC_RUBRIC.id).toBe("holistic");
		expect(HOLISTIC_RUBRIC.dimensions.length).toBe(3);
		for (const dim of HOLISTIC_RUBRIC.dimensions) {
			expect(dim.threshold).toBe(9);
		}
	});

	it("CONVERGED when all dimensions at threshold, zero blocking findings", () => {
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload("reviewer-holistic", [
				{ name: "alignment", score: 9 },
				{ name: "completeness", score: 10 },
				{ name: "coherence", score: 9 },
			])),
		];

		const weights = new Map([["reviewer-holistic", "high" as const]]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, DEFAULT_CONFIG);

		expect(result.state).toBe("CONVERGED");
		expect(result.blockingFindings).toEqual([]);
		expect(result.dimensions.length).toBe(3);
	});

	it("CONTINUE when dimensions below threshold", () => {
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload("reviewer-holistic", [
				{ name: "alignment", score: 7 },
				{ name: "completeness", score: 9 },
				{ name: "coherence", score: 9 },
			])),
		];

		const weights = new Map([["reviewer-holistic", "high" as const]]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, DEFAULT_CONFIG);

		expect(result.state).toBe("CONTINUE");
	});

	it("CONTINUE when BLOCKING finding from high-relevance reviewer", () => {
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload(
				"reviewer-holistic",
				[
					{ name: "alignment", score: 10 },
					{ name: "completeness", score: 10 },
					{ name: "coherence", score: 10 },
				],
				[{ severity: "BLOCKING", dimension: "alignment", description: "Blocks convergence" }],
			)),
		];

		const weights = new Map([["reviewer-holistic", "high" as const]]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, DEFAULT_CONFIG);

		expect(result.state).toBe("CONTINUE");
		expect(result.blockingFindings.length).toBe(1);
	});

	it("CONTINUE when CRITICAL finding from medium-relevance reviewer", () => {
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload(
				"reviewer-plan",
				[
					{ name: "alignment", score: 10 },
					{ name: "completeness", score: 10 },
					{ name: "coherence", score: 10 },
				],
				[{ severity: "CRITICAL", dimension: "completeness", description: "Critical issue" }],
			)),
		];

		const weights = new Map([["reviewer-plan", "medium" as const]]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, DEFAULT_CONFIG);

		expect(result.state).toBe("CONTINUE");
		expect(result.blockingFindings.length).toBe(1);
	});
});

// ─── Low-Relevance Reviewers ───────────────────────────────

describe("Low-relevance reviewers do not block convergence", () => {
	it("low-relevance dimension below threshold does not block", () => {
		const events: ScoredEvent[] = [
			// High-relevance reviewer passes everything
			makeScoredEvent(1, makePayload("reviewer-holistic", [
				{ name: "alignment", score: 10 },
				{ name: "completeness", score: 10 },
				{ name: "coherence", score: 10 },
			])),
			// Low-relevance reviewer fails a dimension
			makeScoredEvent(1, makePayload("reviewer-typescript", [
				{ name: "alignment", score: 3 },
			])),
		];

		const weights = new Map<string, "high" | "medium" | "low">([
			["reviewer-holistic", "high"],
			["reviewer-typescript", "low"],
		]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, DEFAULT_CONFIG);

		expect(result.state).toBe("CONVERGED");
	});

	it("low-relevance BLOCKING finding does not block", () => {
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload("reviewer-holistic", [
				{ name: "alignment", score: 10 },
				{ name: "completeness", score: 10 },
				{ name: "coherence", score: 10 },
			])),
			makeScoredEvent(1, makePayload(
				"reviewer-typescript",
				[{ name: "alignment", score: 10 }],
				[{ severity: "BLOCKING", dimension: "alignment", description: "Would block if not low" }],
			)),
		];

		const weights = new Map<string, "high" | "medium" | "low">([
			["reviewer-holistic", "high"],
			["reviewer-typescript", "low"],
		]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, DEFAULT_CONFIG);

		expect(result.state).toBe("CONVERGED");
		// Low-relevance blocking findings are not added to blockingFindings
		expect(result.blockingFindings.length).toBe(0);
	});

	it("low-relevance CRITICAL finding does not block", () => {
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload("reviewer-holistic", [
				{ name: "alignment", score: 10 },
				{ name: "completeness", score: 10 },
				{ name: "coherence", score: 10 },
			])),
			makeScoredEvent(1, makePayload(
				"reviewer-data-layer",
				[{ name: "alignment", score: 10 }],
				[{ severity: "CRITICAL", dimension: "alignment", description: "Would block if not low" }],
			)),
		];

		const weights = new Map<string, "high" | "medium" | "low">([
			["reviewer-holistic", "high"],
			["reviewer-data-layer", "low"],
		]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, DEFAULT_CONFIG);

		expect(result.state).toBe("CONVERGED");
	});
});

// ─── DimensionResult Enrichment ────────────────────────────

describe("DimensionResult includes correct fields", () => {
	it("DimensionResult has reviewerId, relevance, threshold, passed", () => {
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload("reviewer-holistic", [
				{ name: "alignment", score: 8 },
				{ name: "completeness", score: 10 },
			])),
		];

		const weights = new Map([["reviewer-holistic", "high" as const]]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, DEFAULT_CONFIG);

		const alignmentDim = result.dimensions.find((d) => d.name === "alignment");
		expect(alignmentDim).toBeDefined();
		expect(alignmentDim!.reviewerId).toBe("reviewer-holistic");
		expect(alignmentDim!.relevance).toBe("high");
		expect(alignmentDim!.threshold).toBe(9);
		expect(alignmentDim!.passed).toBe(false);
		expect(alignmentDim!.score).toBe(8);

		const completenessDim = result.dimensions.find((d) => d.name === "completeness");
		expect(completenessDim).toBeDefined();
		expect(completenessDim!.passed).toBe(true);
		expect(completenessDim!.threshold).toBe(9);
	});

	it("DimensionResult uses rubric threshold, not reviewer-provided value", () => {
		// Reviewer provides only {name, score} — threshold comes from the rubric
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload("reviewer-holistic", [
				{ name: "coherence", score: 9 },
			])),
		];

		const weights = new Map([["reviewer-holistic", "medium" as const]]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, DEFAULT_CONFIG);

		const dim = result.dimensions.find((d) => d.name === "coherence");
		expect(dim).toBeDefined();
		expect(dim!.threshold).toBe(9); // From holistic.yaml, not from the reviewer
		expect(dim!.relevance).toBe("medium");
	});
});

// ─── Circuit Breaker Triggers ──────────────────────────────

describe("Circuit breaker triggers", () => {
	it("CIRCUIT-BROKEN on round-budget-exceeded", () => {
		const config: ConvergenceConfig = { ...DEFAULT_CONFIG, maxRounds: 3 };

		// Create events in round 3 (at the budget limit)
		const events: ScoredEvent[] = [
			makeScoredEvent(3, makePayload("reviewer-holistic", [
				{ name: "alignment", score: 7 },
				{ name: "completeness", score: 7 },
				{ name: "coherence", score: 7 },
			])),
		];

		const weights = new Map([["reviewer-holistic", "high" as const]]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, config);

		expect(result.state).toBe("CIRCUIT-BROKEN");
		expect(result.reason).toBeDefined();
		expect(result.reason!.type).toBe("round-budget-exceeded");
	});

	it("CIRCUIT-BROKEN on stuck-finding", () => {
		const config: ConvergenceConfig = { ...DEFAULT_CONFIG, stagnationWindow: 2 };

		// Same finding appears in rounds 1 and 2
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload(
				"reviewer-holistic",
				[{ name: "alignment", score: 10 }, { name: "completeness", score: 10 }, { name: "coherence", score: 10 }],
				[{ severity: "CRITICAL", dimension: "alignment", description: "Stuck issue" }],
			)),
			makeScoredEvent(2, makePayload(
				"reviewer-holistic",
				[{ name: "alignment", score: 10 }, { name: "completeness", score: 10 }, { name: "coherence", score: 10 }],
				[{ severity: "CRITICAL", dimension: "alignment", description: "Stuck issue" }],
			)),
		];

		const weights = new Map([["reviewer-holistic", "high" as const]]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, config);

		expect(result.state).toBe("CIRCUIT-BROKEN");
		expect(result.reason).toBeDefined();
		expect(result.reason!.type).toBe("stuck-finding");
	});

	it("CIRCUIT-BROKEN on reviewer-disagreement", () => {
		const config: ConvergenceConfig = { ...DEFAULT_CONFIG, disagreementThreshold: 3 };

		// Two reviewers score the same dimension with a spread > 3
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload("reviewer-holistic", [
				{ name: "alignment", score: 10 },
				{ name: "completeness", score: 10 },
				{ name: "coherence", score: 10 },
			])),
			makeScoredEvent(1, makePayload("reviewer-plan", [
				{ name: "alignment", score: 5 },
			])),
		];

		const weights = new Map<string, "high" | "medium" | "low">([
			["reviewer-holistic", "high"],
			["reviewer-plan", "high"],
		]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, config);

		expect(result.state).toBe("CIRCUIT-BROKEN");
		expect(result.reason).toBeDefined();
		expect(result.reason!.type).toBe("reviewer-disagreement");
	});

	it("low-relevance reviewers excluded from disagreement checks", () => {
		const config: ConvergenceConfig = { ...DEFAULT_CONFIG, disagreementThreshold: 3 };

		// High reviewer scores 10, low reviewer scores 2 — spread is 8 but low is excluded
		const events: ScoredEvent[] = [
			makeScoredEvent(1, makePayload("reviewer-holistic", [
				{ name: "alignment", score: 10 },
				{ name: "completeness", score: 10 },
				{ name: "coherence", score: 10 },
			])),
			makeScoredEvent(1, makePayload("reviewer-typescript", [
				{ name: "alignment", score: 2 },
			])),
		];

		const weights = new Map<string, "high" | "medium" | "low">([
			["reviewer-holistic", "high"],
			["reviewer-typescript", "low"],
		]);
		const result = evaluateConvergence(events, HOLISTIC_RUBRIC, weights, config);

		// Should NOT be circuit-broken because the low-relevance reviewer is excluded
		expect(result.state).toBe("CONVERGED");
	});
});

// ─── All Rubric Files Load Successfully ────────────────────

describe("All rubric YAML files load and validate", () => {
	const rubricFiles = [
		"holistic.yaml",
		"process-holistic.yaml",
		"code-quality.yaml",
		"architecture-design.yaml",
		"data-integrity.yaml",
		"implementation-plan.yaml",
	] as const;

	for (const file of rubricFiles) {
		it(`${file} loads and validates`, () => {
			const result = loadRubric(path.join(RUBRICS_DIR, file));
			expect(result.success, `Failed to load ${file}: ${!result.success ? result.errors.join(", ") : ""}`).toBe(true);
			if (result.success) {
				expect(result.rubric.dimensions.length).toBeGreaterThan(0);
				for (const dim of result.rubric.dimensions) {
					expect(dim.threshold).toBeGreaterThan(0);
				}
			}
		});
	}
});
