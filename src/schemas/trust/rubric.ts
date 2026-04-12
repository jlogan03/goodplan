import { z } from "zod";

/**
 * Schema for a single rubric dimension within a rubric YAML file.
 */
export const rubricDimensionYamlSchema = z.object({
	name: z.string(),
	description: z.string(),
	scoring: z.string(),
	threshold: z.number(),
});

/**
 * Schema for rubric YAML files at plugin/rubrics/*.yaml.
 * Each rubric defines scoring dimensions and convergence criteria.
 */
export const rubricYamlSchema = z.object({
	id: z.string(),
	version: z.literal(1),
	dimensions: z.array(rubricDimensionYamlSchema).min(1),
	convergence: z.object({
		max_rounds: z.number().min(1),
		zero_blocking_required: z.boolean(),
		zero_critical_required: z.boolean(),
	}),
});

export type RubricDimensionYaml = z.infer<typeof rubricDimensionYamlSchema>;
export type RubricYaml = z.infer<typeof rubricYamlSchema>;
