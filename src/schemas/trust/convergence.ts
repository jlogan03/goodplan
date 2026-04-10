import { z } from "zod";
import { dimensionResultSchema, reviewerFindingSchema } from "./reviewer-payload.js";

/**
 * Convergence state: whether the refinement loop should continue, has converged, or was circuit-broken.
 */
export const convergenceStateSchema = z.enum(["CONVERGED", "CONTINUE", "CIRCUIT-BROKEN"]);
export type ConvergenceState = z.infer<typeof convergenceStateSchema>;

/**
 * Circuit breaker reason — discriminated union on `type` field.
 * Provides diagnostic context for each trigger type.
 */
export const circuitBreakerReasonSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("stuck-finding"),
		findingKey: z.string(),
		persistedRounds: z.number(),
	}),
	z.object({
		type: z.literal("reviewer-disagreement"),
		dimension: z.string(),
		spread: z.number(),
	}),
	z.object({
		type: z.literal("round-budget-exceeded"),
		round: z.number(),
		maxRounds: z.number(),
	}),
]);
export type CircuitBreakerReason = z.infer<typeof circuitBreakerReasonSchema>;

/**
 * Result of convergence evaluation.
 * Includes the convergence state, optional circuit breaker reason,
 * dimension breakdown, and any blocking findings.
 */
export const convergenceResultSchema = z.object({
	state: convergenceStateSchema,
	reason: circuitBreakerReasonSchema.optional(),
	dimensions: z.array(dimensionResultSchema),
	blockingFindings: z.array(reviewerFindingSchema),
});
export type ConvergenceResult = z.infer<typeof convergenceResultSchema>;

/**
 * Configuration for convergence evaluation.
 */
export const convergenceConfigSchema = z.object({
	maxRounds: z.number(),
	stagnationWindow: z.number(),
	reductionThreshold: z.number(),
});
export type ConvergenceConfig = z.infer<typeof convergenceConfigSchema>;
