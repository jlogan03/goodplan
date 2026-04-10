import { z } from "zod";

/**
 * Subsystem definition within an architecture extract.
 */
export const subsystemDefSchema = z
	.object({
		id: z.string(),
		maturity: z.enum(["foundational", "maturing", "developing", "experimental"]),
		owns: z.array(z.string()),
		dependsOn: z.array(z.string()),
	})
	.strict();

/**
 * Architecture extract: subsystems, communication patterns, proposed invariants.
 */
export const architectureExtractSchema = z
	.object({
		subsystems: z.array(subsystemDefSchema),
		communicationPatterns: z.array(z.string()),
		proposedInvariants: z.array(z.string()),
	})
	.strict();
export type ArchitectureExtract = z.infer<typeof architectureExtractSchema>;

/**
 * Architecture target extract: same shape as architecture (target state).
 */
export const architectureTargetExtractSchema = z
	.object({
		subsystems: z.array(subsystemDefSchema),
		communicationPatterns: z.array(z.string()),
		proposedInvariants: z.array(z.string()),
	})
	.strict();
export type ArchitectureTargetExtract = z.infer<typeof architectureTargetExtractSchema>;

/**
 * A single plan chunk definition.
 */
export const planChunkSchema = z
	.object({
		id: z.string(),
		description: z.string(),
		expectation: z.string(),
		redTest: z.string(),
		verificationType: z.enum(["automated", "manual", "hybrid"]),
	})
	.strict();

/**
 * Plan extract: chunks, chunk dependencies, affected subsystems, rollback path.
 */
export const planExtractSchema = z
	.object({
		chunks: z.array(planChunkSchema),
		chunkDependencies: z.array(z.object({ from: z.string(), to: z.string() }).strict()),
		affectedSubsystems: z.array(z.string()),
		rollbackPath: z.string(),
	})
	.strict();
export type PlanExtract = z.infer<typeof planExtractSchema>;

/**
 * Epic goal extract: description, scope, non-goals, success criteria, initial subsystems.
 */
export const epicGoalExtractSchema = z
	.object({
		description: z.string(),
		scope: z.array(z.string()),
		nonGoals: z.array(z.string()),
		successCriteria: z.array(z.string()),
		initialSubsystems: z.array(z.string()),
	})
	.strict();
export type EpicGoalExtract = z.infer<typeof epicGoalExtractSchema>;

/**
 * Slice goal extract: description, acceptance criteria, affected subsystems,
 * dependencies, scope exclusions.
 */
export const sliceGoalExtractSchema = z
	.object({
		description: z.string(),
		acceptanceCriteria: z.array(z.string()),
		affectedSubsystems: z.array(z.string()),
		dependencies: z.array(z.string()),
		scopeExclusions: z.array(z.string()),
	})
	.strict();
export type SliceGoalExtract = z.infer<typeof sliceGoalExtractSchema>;
