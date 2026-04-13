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
 * Convergence requires:
 * 1. All dimensions at or above threshold (from non-low-relevance reviewers)
 * 2. Zero BLOCKING/CRITICAL findings (from non-low-relevance reviewers)
 *
 * Low-relevance reviewers produce advisory warnings only and never block convergence.
 *
 * Pure function — no I/O, no event emission.
 */
export function evaluateConvergence(
	scoredEvents: ScoredEvent[],
	_rubric: ConvergenceRubric,
	relevanceWeights: Map<string, RelevanceWeight>,
	_config: ConvergenceConfig,
): ConvergenceResult {
	// Collect dimension results from all reviewers
	const allDimensions: DimensionResult[] = [];
	const blockingFindings: ReviewerFinding[] = [];
	let hasBlockingIssue = false;

	for (const event of scoredEvents) {
		const { payload } = event;
		const relevance = relevanceWeights.get(payload.reviewerId) ?? "medium";
		const isAdvisory = relevance === "low";

		// Collect dimension results
		for (const dim of payload.dimensions) {
			allDimensions.push(dim);

			// Only non-low-relevance reviewers can block on dimensions
			if (!isAdvisory && !dim.passed) {
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

	const state: ConvergenceState = hasBlockingIssue ? "CONTINUE" : "CONVERGED";

	return {
		state,
		dimensions: allDimensions,
		blockingFindings,
	};
}
