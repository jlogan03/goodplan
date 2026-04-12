import { z } from "zod";
import { ContentRefSchema } from "../envelope.js";
import { circuitBreakerReasonSchema, convergenceResultSchema } from "../trust/convergence.js";
import { dimensionResultSchema, reviewerFindingSchema } from "../trust/reviewer-payload.js";

// --- Refinement event payload schemas ---

/**
 * Payload for `refinement-round-started` events.
 * Signals the beginning of a new refinement round for an artifact.
 */
export const refinementRoundStartedPayloadSchema = z.object({
	artifactType: z.string().min(1),
	scopeRef: z.string().min(1),
	round: z.number().int().positive(),
});
export type RefinementRoundStartedPayload = z.infer<typeof refinementRoundStartedPayloadSchema>;

/**
 * Payload for `reviewer-scored` events.
 * A reviewer has scored dimensions and produced findings for the current round.
 */
export const reviewerScoredPayloadSchema = z.object({
	artifactType: z.string().min(1),
	scopeRef: z.string().min(1),
	round: z.number().int().positive(),
	reviewerId: z.string().min(1),
	dimensions: z.array(dimensionResultSchema),
	findings: z.array(reviewerFindingSchema),
});
export type ReviewerScoredPayload = z.infer<typeof reviewerScoredPayloadSchema>;

/**
 * Payload for `refinement-synthesized` events.
 * Feedback from multiple reviewers has been synthesized into a single document.
 */
export const refinementSynthesizedPayloadSchema = z.object({
	artifactType: z.string().min(1),
	scopeRef: z.string().min(1),
	round: z.number().int().positive(),
	synthesis: ContentRefSchema,
});
export type RefinementSynthesizedPayload = z.infer<typeof refinementSynthesizedPayloadSchema>;

/**
 * Payload for `artifact-revised` events.
 * The artifact has been revised in response to synthesized feedback.
 */
export const artifactRevisedPayloadSchema = z.object({
	artifactType: z.string().min(1),
	scopeRef: z.string().min(1),
	round: z.number().int().positive(),
	artifact: ContentRefSchema,
});
export type ArtifactRevisedPayload = z.infer<typeof artifactRevisedPayloadSchema>;

/**
 * Payload for `refinement-converged` events.
 * The refinement loop has converged — all dimensions pass thresholds.
 */
export const refinementConvergedPayloadSchema = z.object({
	artifactType: z.string().min(1),
	scopeRef: z.string().min(1),
	round: z.number().int().positive(),
	convergenceResult: convergenceResultSchema,
});
export type RefinementConvergedPayload = z.infer<typeof refinementConvergedPayloadSchema>;

/**
 * Payload for `refinement-circuit-breaker-tripped` events.
 * The circuit breaker detected a condition preventing further convergence.
 */
export const refinementCircuitBreakerTrippedPayloadSchema = z.object({
	artifactType: z.string().min(1),
	scopeRef: z.string().min(1),
	round: z.number().int().positive(),
	reason: circuitBreakerReasonSchema,
});
export type RefinementCircuitBreakerTrippedPayload = z.infer<
	typeof refinementCircuitBreakerTrippedPayloadSchema
>;

/**
 * Payload for `convergence-overridden` events.
 * A user has manually overridden the convergence state (e.g., accepting despite not meeting thresholds).
 */
export const convergenceOverriddenPayloadSchema = z.object({
	artifactType: z.string().min(1),
	scopeRef: z.string().min(1),
	round: z.number().int().positive(),
	reason: z.string().min(1),
});
export type ConvergenceOverriddenPayload = z.infer<typeof convergenceOverriddenPayloadSchema>;

// --- RefinementEventMap: maps event type strings to payload schemas ---

/**
 * Mapped type for all refinement event types and their payload schemas.
 * The envelope `type` field serves as the discriminant.
 */
export const RefinementEventMap = {
	"refinement-round-started": refinementRoundStartedPayloadSchema,
	"reviewer-scored": reviewerScoredPayloadSchema,
	"refinement-synthesized": refinementSynthesizedPayloadSchema,
	"artifact-revised": artifactRevisedPayloadSchema,
	"refinement-converged": refinementConvergedPayloadSchema,
	"refinement-circuit-breaker-tripped": refinementCircuitBreakerTrippedPayloadSchema,
	"convergence-overridden": convergenceOverriddenPayloadSchema,
} as const;

/** Union of all refinement event type strings. */
export type RefinementEventType = keyof typeof RefinementEventMap;

/** Inferred payload type for a given refinement event type. */
export type RefinementEventPayload<T extends RefinementEventType> = z.infer<
	(typeof RefinementEventMap)[T]
>;
