import { z } from "zod";
import type { ConvergenceConfig } from "../../schemas/trust/convergence.js";
import { circuitBreakerReasonSchema } from "../../schemas/trust/convergence.js";
import type { ScoredEvent } from "./evaluator.js";

/**
 * CircuitBreakerResult is a discriminated union:
 * - { triggered: false } — no circuit breaker condition met
 * - { triggered: true; reason: CircuitBreakerReason } — a trigger fired
 *
 * Uses z.union (not z.discriminatedUnion) because the discriminant is boolean,
 * and Zod v4 discriminatedUnion requires string literal discriminants.
 */
export const circuitBreakerResultSchema = z.union([
	z.object({ triggered: z.literal(false) }),
	z.object({
		triggered: z.literal(true),
		reason: circuitBreakerReasonSchema,
	}),
]);
export type CircuitBreakerResult = z.infer<typeof circuitBreakerResultSchema>;

/**
 * Build a structured key for a finding: severity + dimension.
 * Used for stuck-finding detection (heuristic matching, not prose-dependent).
 */
function findingKey(severity: string, dimension: string): string {
	return `${severity}:${dimension}`;
}

/**
 * Check circuit breaker conditions against scored event history.
 *
 * Three trigger checks:
 * 1. stuck-finding — same finding persists across stagnationWindow rounds
 * 2. reviewer-disagreement — reviewers diverge by more than disagreementThreshold on same dimension
 * 3. round-budget-exceeded — round count exceeds maxRounds
 *
 * Pure function — no I/O, no side effects.
 */
export function checkCircuitBreaker(
	scoredEvents: ScoredEvent[],
	config: ConvergenceConfig,
): CircuitBreakerResult {
	if (scoredEvents.length === 0) {
		return { triggered: false };
	}

	// Determine the current round (max round number)
	const currentRound = Math.max(...scoredEvents.map((e) => e.round));

	// Check 1: round-budget-exceeded
	if (currentRound >= config.maxRounds) {
		return {
			triggered: true,
			reason: {
				type: "round-budget-exceeded",
				round: currentRound,
				maxRounds: config.maxRounds,
			},
		};
	}

	// Check 2: stuck-finding — same finding key persists across stagnationWindow consecutive rounds
	const stuckResult = checkStuckFinding(scoredEvents, config.stagnationWindow, currentRound);
	if (stuckResult !== undefined) {
		return {
			triggered: true,
			reason: stuckResult,
		};
	}

	// Check 3: reviewer-disagreement — score spread exceeds threshold on same dimension within same round
	const disagreementResult = checkReviewerDisagreement(
		scoredEvents,
		config.disagreementThreshold,
		currentRound,
	);
	if (disagreementResult !== undefined) {
		return {
			triggered: true,
			reason: disagreementResult,
		};
	}

	return { triggered: false };
}

/**
 * Check for stuck findings: a finding key that appears in every round
 * within the stagnation window ending at currentRound.
 */
function checkStuckFinding(
	scoredEvents: ScoredEvent[],
	stagnationWindow: number,
	currentRound: number,
): { type: "stuck-finding"; findingKey: string; persistedRounds: number } | undefined {
	// Need at least stagnationWindow rounds of history
	const startRound = currentRound - stagnationWindow + 1;
	if (startRound < 1) {
		return undefined;
	}

	// Build a map: round -> set of finding keys
	const findingsByRound = new Map<number, Set<string>>();
	for (const event of scoredEvents) {
		if (event.round < startRound || event.round > currentRound) {
			continue;
		}
		let roundFindings = findingsByRound.get(event.round);
		if (roundFindings === undefined) {
			roundFindings = new Set<string>();
			findingsByRound.set(event.round, roundFindings);
		}
		for (const finding of event.payload.findings) {
			roundFindings.add(findingKey(finding.severity, finding.dimension));
		}
	}

	// Check if any finding key appears in all rounds within the window
	const roundsToCheck: number[] = [];
	for (let r = startRound; r <= currentRound; r++) {
		roundsToCheck.push(r);
	}

	// Must have data for all rounds in the window
	if (roundsToCheck.some((r) => !findingsByRound.has(r))) {
		return undefined;
	}

	// Get finding keys from the first round, then check if they persist in all subsequent rounds
	const firstRoundFindings = findingsByRound.get(startRound);
	if (firstRoundFindings === undefined) {
		return undefined;
	}

	for (const key of firstRoundFindings) {
		const persistsInAll = roundsToCheck.every((r) => {
			const roundSet = findingsByRound.get(r);
			return roundSet?.has(key) ?? false;
		});
		if (persistsInAll) {
			return {
				type: "stuck-finding",
				findingKey: key,
				persistedRounds: stagnationWindow,
			};
		}
	}

	return undefined;
}

/**
 * Check for reviewer disagreement: two reviewers scoring the same dimension
 * with a spread greater than the disagreement threshold, within the current round.
 */
function checkReviewerDisagreement(
	scoredEvents: ScoredEvent[],
	disagreementThreshold: number,
	currentRound: number,
): { type: "reviewer-disagreement"; dimension: string; spread: number } | undefined {
	// Collect scores per dimension for the current round
	const dimensionScores = new Map<string, number[]>();

	for (const event of scoredEvents) {
		if (event.round !== currentRound) {
			continue;
		}
		for (const dim of event.payload.dimensions) {
			let scores = dimensionScores.get(dim.name);
			if (scores === undefined) {
				scores = [];
				dimensionScores.set(dim.name, scores);
			}
			scores.push(dim.score);
		}
	}

	// Check for disagreement (spread > threshold)
	for (const [dimension, scores] of dimensionScores) {
		if (scores.length < 2) {
			continue;
		}
		const min = Math.min(...scores);
		const max = Math.max(...scores);
		const spread = max - min;
		if (spread > disagreementThreshold) {
			return {
				type: "reviewer-disagreement",
				dimension,
				spread,
			};
		}
	}

	return undefined;
}
