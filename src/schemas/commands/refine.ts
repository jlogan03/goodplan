import { z } from "zod";
import { ContentRefSchema } from "../envelope.js";
import { dimensionScoreSchema, reviewerFindingSchema } from "../trust/reviewer-payload.js";

/**
 * Input schema for `gp refine:score` (stdin JSON).
 * Dimensions and findings come from a reviewer's evaluation.
 */
export const refineScoreInputSchema = z.object({
	dimensions: z.array(dimensionScoreSchema),
	findings: z.array(reviewerFindingSchema),
});
export type RefineScoreInput = z.infer<typeof refineScoreInputSchema>;

/**
 * Input schema for `gp refine:synthesize` (stdin JSON).
 * Content reference to the synthesis document.
 */
export const refineSynthesizeInputSchema = z.object({
	synthesis: ContentRefSchema,
});
export type RefineSynthesizeInput = z.infer<typeof refineSynthesizeInputSchema>;

/**
 * Input schema for `gp refine:revise` (stdin JSON).
 * Content reference to the revised artifact.
 */
export const refineReviseInputSchema = z.object({
	artifact: ContentRefSchema,
});
export type RefineReviseInput = z.infer<typeof refineReviseInputSchema>;
