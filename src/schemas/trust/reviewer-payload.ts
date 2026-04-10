import { z } from "zod";

/**
 * Finding severity levels, ordered from most to least severe.
 */
export const findingSeveritySchema = z.enum(["BLOCKING", "CRITICAL", "IMPORTANT", "MINOR"]);
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;

/**
 * A single finding from a reviewer.
 * Structured key fields (severity + dimension) enable similarity matching
 * without relying on prose consistency.
 */
export const reviewerFindingSchema = z
	.object({
		severity: findingSeveritySchema,
		dimension: z.string(),
		description: z.string(),
	})
	.strict();
export type ReviewerFinding = z.infer<typeof reviewerFindingSchema>;

/**
 * A dimension result from a reviewer: a scored dimension against a threshold.
 */
export const dimensionResultSchema = z
	.object({
		name: z.string(),
		score: z.number(),
		threshold: z.number(),
		passed: z.boolean(),
	})
	.strict();
export type DimensionResult = z.infer<typeof dimensionResultSchema>;

/**
 * Canonical payload produced by a reviewer.
 * The reviewerId field tracks which reviewer produced which payload
 * so convergence evaluator can attribute scores.
 */
export const reviewerPayloadSchema = z
	.object({
		reviewerId: z.string(),
		dimensions: z.array(dimensionResultSchema),
		findings: z.array(reviewerFindingSchema),
		rationale: z.string(),
	})
	.strict();
export type ReviewerPayload = z.infer<typeof reviewerPayloadSchema>;
