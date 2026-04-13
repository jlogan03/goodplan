import type {
	ConvergenceConfig,
	ConvergenceResult,
	ConvergenceState,
} from "../../schemas/trust/convergence.js";
import type {
	DimensionResult,
	ReviewerFinding,
	ReviewerPayload,
} from "../../schemas/trust/reviewer-payload.js";
import { checkCircuitBreaker } from "./circuit-breaker.js";
import type { RelevanceWeight } from "./types.js";

/**
 * Minimal rubric interface for convergence evaluation.
 * Only requires the fields the evaluator actually uses (name + threshold).
 * `RubricYaml` (from `src/schemas/trust/rubric.ts`) structurally satisfies
 * this interface, so callers can pass loaded YAML rubrics directly.
 */
export interface ConvergenceRubric {
	readonly dimensions: ReadonlyArray<{ readonly name: string; readonly threshold: number }>;
}

/**
 * Scored event: a reviewer payload plus the round in which it was produced.
 */
export interface ScoredEvent {
	round: number;
	payload: ReviewerPayload;
}

/**
 * Evaluate convergence across all scored events for the current round.
 *
 * Convergence requires ALL of:
 * 1. All dimensions at or above threshold (from rubric, for non-low-relevance reviewers)
 * 2. Zero BLOCKING/CRITICAL findings (from non-low-relevance reviewers)
 *
 * The evaluator compares reviewer scores against rubric thresholds mechanically —
 * reviewers do NOT know the thresholds and cannot game convergence decisions.
 *
 * Also checks circuit breaker conditions. Returns CIRCUIT-BROKEN if any trigger fires.
 *
 * Pure function — no I/O, no event emission.
 */
export function evaluateConvergence(
	scoredEvents: ScoredEvent[],
	rubric: ConvergenceRubric,
	relevanceWeights: Map<string, RelevanceWeight>,
	config: ConvergenceConfig,
): ConvergenceResult {
	// Build a threshold lookup from the rubric
	const thresholdMap = new Map<string, number>();
	for (const dim of rubric.dimensions) {
		thresholdMap.set(dim.name, dim.threshold);
	}

	// Collect dimension results from all reviewers, comparing against rubric thresholds
	const allDimensions: DimensionResult[] = [];
	const blockingFindings: ReviewerFinding[] = [];
	let hasBlockingIssue = false;

	for (const event of scoredEvents) {
		const { payload } = event;
		const relevance = relevanceWeights.get(payload.reviewerId) ?? "medium";
		const isAdvisory = relevance === "low";

		// Enrich dimension scores with rubric thresholds and pass/fail
		for (const dim of payload.dimensions) {
			const threshold = thresholdMap.get(dim.name) ?? 0;
			const passed = dim.score >= threshold;

			allDimensions.push({
				name: dim.name,
				score: dim.score,
				threshold,
				passed,
				reviewerId: payload.reviewerId,
				relevance,
			});

			// Only non-low-relevance reviewers can block on dimensions
			if (!isAdvisory && !passed) {
				hasBlockingIssue = true;
			}
		}

		// Check findings
		for (const finding of payload.findings) {
			if (finding.severity === "BLOCKING" || finding.severity === "CRITICAL") {
				if (!isAdvisory) {
					hasBlockingIssue = true;
					blockingFindings.push(finding);
				}
				// Low-relevance: advisory warning, not blocking
			}
		}
	}

	// Check circuit breaker conditions
	const circuitBreakerResult = checkCircuitBreaker(scoredEvents, config, relevanceWeights);
	if (circuitBreakerResult.triggered) {
		return {
			state: "CIRCUIT-BROKEN",
			dimensions: allDimensions,
			blockingFindings,
			reason: circuitBreakerResult.reason,
		};
	}

	const state: ConvergenceState = hasBlockingIssue ? "CONTINUE" : "CONVERGED";

	return {
		state,
		dimensions: allDimensions,
		blockingFindings,
	};
}
