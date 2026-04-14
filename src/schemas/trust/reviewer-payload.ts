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
		location: z.string().optional(),
	})
	.strict();
export type ReviewerFinding = z.infer<typeof reviewerFindingSchema>;

/**
 * A dimension score from a reviewer. The reviewer provides only the score
 * and rationale — it does NOT know the passing threshold or whether it passed.
 * The convergence evaluator compares scores against rubric thresholds independently
 * to prevent reviewers from gaming convergence decisions.
 */
export const dimensionScoreSchema = z
	.object({
		name: z.string(),
		score: z.number(),
	})
	.strict();
export type DimensionScore = z.infer<typeof dimensionScoreSchema>;

/**
 * Enriched dimension result produced by the convergence evaluator (not the reviewer).
 * Adds threshold, passed, reviewerId, and relevance from the rubric and routing context.
 */
export const dimensionResultSchema = z
	.object({
		name: z.string(),
		score: z.number(),
		threshold: z.number(),
		passed: z.boolean(),
		reviewerId: z.string(),
		relevance: z.enum(["high", "medium", "low"]),
	})
	.strict();
export type DimensionResult = z.infer<typeof dimensionResultSchema>;

/**
 * Canonical payload produced by a reviewer.
 * The reviewer provides scores and findings — convergence decisions are made
 * by the evaluator, not the reviewer. Reviewers must NOT know their thresholds.
 */
export const reviewerPayloadSchema = z
	.object({
		reviewerId: z.string(),
		dimensions: z.array(dimensionScoreSchema),
		findings: z.array(reviewerFindingSchema),
		rationale: z.string(),
	})
	.strict();
export type ReviewerPayload = z.infer<typeof reviewerPayloadSchema>;
