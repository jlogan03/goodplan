import { describe, expect, it } from "vitest";
import type { ConvergenceConfig } from "../../../src/schemas/trust/convergence.js";
import type { ReviewerPayload } from "../../../src/schemas/trust/reviewer-payload.js";
import { checkCircuitBreaker } from "../../../src/trust/convergence/circuit-breaker.js";
import type { ScoredEvent } from "../../../src/trust/convergence/evaluator.js";

const defaultConfig: ConvergenceConfig = {
	maxRounds: 3,
	stagnationWindow: 2,
	disagreementThreshold: 3,
	reductionThreshold: 0.1,
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

describe("checkCircuitBreaker", () => {
	it("returns not triggered when all conditions are clear", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [{ name: "alignment", score: 4, threshold: 4, passed: true }],
				}),
			),
		];

		const result = checkCircuitBreaker(events, defaultConfig);

		expect(result.triggered).toBe(false);
	});

	it("returns not triggered for empty events", () => {
		const result = checkCircuitBreaker([], defaultConfig);
		expect(result.triggered).toBe(false);
	});

	it("triggers round-budget-exceeded when round reaches maxRounds", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				3,
				makePayload({
					reviewerId: "reviewer-holistic",
					dimensions: [{ name: "alignment", score: 2, threshold: 4, passed: false }],
				}),
			),
		];

		const result = checkCircuitBreaker(events, defaultConfig);

		expect(result.triggered).toBe(true);
		if (result.triggered) {
			expect(result.reason.type).toBe("round-budget-exceeded");
			if (result.reason.type === "round-budget-exceeded") {
				expect(result.reason.round).toBe(3);
				expect(result.reason.maxRounds).toBe(3);
			}
		}
	});

	it("triggers stuck-finding when same finding persists across stagnation window", () => {
		const stuckFinding = {
			severity: "BLOCKING" as const,
			dimension: "alignment",
			description: "Missing goal",
		};

		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [stuckFinding],
				}),
			),
			makeEvent(
				2,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [
						// Different description but same severity+dimension = same key
						{ severity: "BLOCKING", dimension: "alignment", description: "Goal is still missing" },
					],
				}),
			),
		];

		const result = checkCircuitBreaker(events, defaultConfig);

		expect(result.triggered).toBe(true);
		if (result.triggered) {
			expect(result.reason.type).toBe("stuck-finding");
			if (result.reason.type === "stuck-finding") {
				expect(result.reason.findingKey).toBe("BLOCKING:alignment");
				expect(result.reason.persistedRounds).toBe(2);
			}
		}
	});

	it("stuck-finding matches on severity+dimension, not prose description", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [
						{ severity: "CRITICAL", dimension: "completeness", description: "Missing section A" },
					],
				}),
			),
			makeEvent(
				2,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [
						// Completely different prose, same structured key
						{
							severity: "CRITICAL",
							dimension: "completeness",
							description: "Section A is absent from the document",
						},
					],
				}),
			),
		];

		const result = checkCircuitBreaker(events, defaultConfig);

		expect(result.triggered).toBe(true);
		if (result.triggered) {
			expect(result.reason.type).toBe("stuck-finding");
			if (result.reason.type === "stuck-finding") {
				expect(result.reason.findingKey).toBe("CRITICAL:completeness");
			}
		}
	});

	it("does not trigger stuck-finding when finding appears in only one round", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [{ severity: "BLOCKING", dimension: "alignment", description: "Missing goal" }],
				}),
			),
			makeEvent(
				2,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [
						// Different key — different severity
						{ severity: "MINOR", dimension: "alignment", description: "Missing goal" },
					],
				}),
			),
		];

		const result = checkCircuitBreaker(events, defaultConfig);

		expect(result.triggered).toBe(false);
	});

	it("triggers reviewer-disagreement when score spread exceeds threshold", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-a",
					dimensions: [{ name: "alignment", score: 5, threshold: 4, passed: true }],
				}),
			),
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-b",
					dimensions: [{ name: "alignment", score: 1, threshold: 4, passed: false }],
				}),
			),
		];

		const result = checkCircuitBreaker(events, defaultConfig);

		expect(result.triggered).toBe(true);
		if (result.triggered) {
			expect(result.reason.type).toBe("reviewer-disagreement");
			if (result.reason.type === "reviewer-disagreement") {
				expect(result.reason.dimension).toBe("alignment");
				expect(result.reason.spread).toBe(4);
			}
		}
	});

	it("does not trigger reviewer-disagreement when spread is within threshold", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-a",
					dimensions: [{ name: "alignment", score: 5, threshold: 4, passed: true }],
				}),
			),
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-b",
					dimensions: [{ name: "alignment", score: 3, threshold: 4, passed: false }],
				}),
			),
		];

		// Spread is 2, threshold is 3 — within threshold
		const result = checkCircuitBreaker(events, defaultConfig);

		expect(result.triggered).toBe(false);
	});

	it("does not trigger reviewer-disagreement when spread equals threshold exactly", () => {
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-a",
					dimensions: [{ name: "alignment", score: 5, threshold: 4, passed: true }],
				}),
			),
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-b",
					dimensions: [{ name: "alignment", score: 2, threshold: 4, passed: false }],
				}),
			),
		];

		// Spread is exactly 3, threshold is 3 — NOT triggered (must exceed, not equal)
		const result = checkCircuitBreaker(events, defaultConfig);

		expect(result.triggered).toBe(false);
	});

	it("prioritizes round-budget-exceeded over other triggers", () => {
		const events: ScoredEvent[] = [
			// Round 2 has stuck finding
			makeEvent(
				2,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [{ severity: "BLOCKING", dimension: "alignment", description: "Missing goal" }],
				}),
			),
			// Round 3 also has stuck finding AND exceeds budget
			makeEvent(
				3,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [{ severity: "BLOCKING", dimension: "alignment", description: "Missing goal" }],
				}),
			),
		];

		const result = checkCircuitBreaker(events, defaultConfig);

		expect(result.triggered).toBe(true);
		if (result.triggered) {
			// Round budget checked first
			expect(result.reason.type).toBe("round-budget-exceeded");
		}
	});

	it("stuck-finding with larger stagnation window requires more rounds", () => {
		const config: ConvergenceConfig = {
			...defaultConfig,
			stagnationWindow: 3,
		};

		// Only 2 rounds with same finding — not enough for window of 3
		const events: ScoredEvent[] = [
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [{ severity: "BLOCKING", dimension: "alignment", description: "Missing goal" }],
				}),
			),
			makeEvent(
				2,
				makePayload({
					reviewerId: "reviewer-holistic",
					findings: [{ severity: "BLOCKING", dimension: "alignment", description: "Missing goal" }],
				}),
			),
		];

		const result = checkCircuitBreaker(events, config);

		expect(result.triggered).toBe(false);
	});

	it("reviewer-disagreement only checks current round", () => {
		const events: ScoredEvent[] = [
			// Round 1: disagreement
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-a",
					dimensions: [{ name: "alignment", score: 5, threshold: 4, passed: true }],
				}),
			),
			makeEvent(
				1,
				makePayload({
					reviewerId: "reviewer-b",
					dimensions: [{ name: "alignment", score: 1, threshold: 4, passed: false }],
				}),
			),
			// Round 2: no disagreement (only one reviewer)
			makeEvent(
				2,
				makePayload({
					reviewerId: "reviewer-a",
					dimensions: [{ name: "alignment", score: 5, threshold: 4, passed: true }],
				}),
			),
		];

		const result = checkCircuitBreaker(events, defaultConfig);

		// Current round is 2, where only reviewer-a exists — no disagreement
		expect(result.triggered).toBe(false);
	});
});
