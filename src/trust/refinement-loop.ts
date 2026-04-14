import type { ReviewerPayload } from "../schemas/trust/reviewer-payload.js";
import { checkCircuitBreaker } from "./convergence/circuit-breaker.js";
import type { CircuitBreakerResult } from "./convergence/circuit-breaker.js";
import { evaluateConvergence } from "./convergence/evaluator.js";
import type { ScoredEvent } from "./convergence/evaluator.js";
import { synthesizeFeedback } from "./feedback-synthesizer.js";
import type { ReviewerError } from "./interfaces/reviewer-dispatcher.js";
import type { RefinementLoopOptions, RefinementLoopResult } from "./refinement-loop-types.js";

/**
 * Type guard to distinguish ReviewerPayload from ReviewerError.
 * ReviewerPayload has `dimensions`; ReviewerError has `error`.
 */
function isReviewerPayload(result: ReviewerPayload | ReviewerError): result is ReviewerPayload {
	return "dimensions" in result;
}

/**
 * Run the refinement loop: dispatch reviewers, evaluate convergence,
 * check circuit breaker, synthesize feedback, edit artifact, and repeat.
 *
 * The loop is artifact-agnostic — callers provide dispatcher and editor implementations.
 * Returns immediately on CONVERGED or CIRCUIT-BROKEN.
 */
export async function runRefinementLoop(
	options: RefinementLoopOptions,
): Promise<RefinementLoopResult> {
	const {
		artifactContent: initialContent,
		reviewerIds,
		convergenceConfig,
		rubric,
		relevanceWeights,
		dispatcher,
		editor,
		onRoundComplete,
	} = options;

	let currentContent = initialContent;
	const allScoredEvents: ScoredEvent[] = [];
	let round = 0;

	// Default results for edge case where loop never executes
	let lastConvergenceResult = evaluateConvergence([], rubric, relevanceWeights, convergenceConfig);
	let lastCircuitBreakerResult: CircuitBreakerResult = { triggered: false };

	while (round < convergenceConfig.maxRounds) {
		round += 1;

		// 1. Dispatch reviewers
		const results = await dispatcher.dispatch(currentContent, reviewerIds);

		// 2. Separate successes from failures
		const payloads: ReviewerPayload[] = [];
		let errorCount = 0;

		for (const result of results) {
			if (isReviewerPayload(result)) {
				payloads.push(result);
			} else {
				errorCount += 1;
				// Log warning for failed reviewer (in real usage, callers can hook into onRoundComplete)
			}
		}

		// 3. Create scored events for this round
		for (const payload of payloads) {
			allScoredEvents.push({ round, payload });
		}

		// 4. Evaluate convergence
		const currentRoundEvents = allScoredEvents.filter((e) => e.round === round);
		lastConvergenceResult = evaluateConvergence(
			currentRoundEvents,
			rubric,
			relevanceWeights,
			convergenceConfig,
		);

		// 5. Check circuit breaker (uses full history)
		lastCircuitBreakerResult = checkCircuitBreaker(allScoredEvents, convergenceConfig);

		// 6. Fire onRoundComplete callback
		if (onRoundComplete !== undefined) {
			onRoundComplete({
				round,
				convergenceResult: lastConvergenceResult,
				circuitBreakerResult: lastCircuitBreakerResult,
				payloadCount: payloads.length,
				errorCount,
			});
		}

		// 7. Check termination conditions
		if (lastConvergenceResult.state === "CONVERGED") {
			return {
				finalContent: currentContent,
				converged: true,
				rounds: round,
				convergenceResult: lastConvergenceResult,
				circuitBreakerResult: lastCircuitBreakerResult,
				history: allScoredEvents,
			};
		}

		if (lastCircuitBreakerResult.triggered) {
			return {
				finalContent: currentContent,
				converged: false,
				rounds: round,
				convergenceResult: {
					...lastConvergenceResult,
					state: "CIRCUIT-BROKEN",
				},
				circuitBreakerResult: lastCircuitBreakerResult,
				history: allScoredEvents,
			};
		}

		// 8. Synthesize feedback and edit artifact for next round
		const feedback = synthesizeFeedback(payloads);
		currentContent = await editor.edit(currentContent, feedback);
	}

	// Should not normally reach here (circuit breaker catches maxRounds),
	// but handle gracefully
	return {
		finalContent: currentContent,
		converged: false,
		rounds: round,
		convergenceResult: lastConvergenceResult,
		circuitBreakerResult: lastCircuitBreakerResult,
		history: allScoredEvents,
	};
}
