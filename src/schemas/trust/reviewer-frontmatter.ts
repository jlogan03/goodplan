import { z } from "zod";

/**
 * Schema for reviewer agent YAML frontmatter.
 * Validates the structured metadata in plugin/agents/reviewer-*.md files.
 */
export const reviewerFrontmatterSchema = z.object({
	id: z.string(),
	version: z.literal(1),
	domains: z.array(z.string()).min(1),
	applies_to: z.array(z.string()).min(1),
	rubric_ref: z.string(),
	score_range: z.tuple([z.number(), z.number()]),
	passing_threshold_per_dimension: z.record(z.string(), z.number()),
});

export type ReviewerFrontmatter = z.infer<typeof reviewerFrontmatterSchema>;
