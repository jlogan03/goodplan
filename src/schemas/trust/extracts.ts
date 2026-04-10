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

/**
 * Side-quest goal extract: description, scope, verification method, parent epic ref.
 */
export const sideQuestGoalExtractSchema = z
	.object({
		description: z.string(),
		scope: z.array(z.string()),
		verificationMethod: z.string(),
		parentEpicRef: z.string(),
	})
	.strict();
export type SideQuestGoalExtract = z.infer<typeof sideQuestGoalExtractSchema>;

/**
 * Briefing extract: time context, current position, last action, where stopped,
 * next action, attention items, deep links.
 */
export const briefingExtractSchema = z
	.object({
		timeContext: z.string(),
		currentPosition: z.string(),
		lastAction: z.string(),
		whereStopped: z.string(),
		nextAction: z.string(),
		attentionItems: z.array(z.string()),
		deepLinks: z.array(z.string()),
	})
	.strict();
export type BriefingExtract = z.infer<typeof briefingExtractSchema>;

/**
 * A single failure mode in a pressure test.
 */
export const failureModeSchema = z
	.object({
		id: z.string(),
		description: z.string(),
		likelihood: z.enum(["low", "medium", "high"]),
		impact: z.enum(["low", "medium", "high"]),
	})
	.strict();

/**
 * A single pressure test finding.
 */
export const pressureTestFindingSchema = z
	.object({
		description: z.string(),
		severity: z.enum(["BLOCKING", "CRITICAL", "IMPORTANT", "MINOR"]),
	})
	.strict();

/**
 * Pressure test extract: failure modes, scaling cliffs, optionality ledger,
 * error classes, locked-in assumptions, findings.
 */
export const pressureTestExtractSchema = z
	.object({
		failureModes: z.array(failureModeSchema),
		scalingCliffs: z.array(z.string()),
		optionalityLedger: z.array(z.string()),
		errorClasses: z.array(z.string()),
		lockedInAssumptions: z.array(z.string()),
		findings: z.array(pressureTestFindingSchema),
	})
	.strict();
export type PressureTestExtract = z.infer<typeof pressureTestExtractSchema>;

/**
 * Finding extract: classification (blocking/non-blocking x in-scope/out-of-scope),
 * reshape option, related subsystems.
 */
export const findingExtractSchema = z
	.object({
		classification: z
			.object({
				blocking: z.boolean(),
				inScope: z.boolean(),
			})
			.strict(),
		reshapeOption: z.string(),
		relatedSubsystems: z.array(z.string()),
	})
	.strict();
export type FindingExtract = z.infer<typeof findingExtractSchema>;

/**
 * Subsystem extract: id, name, maturity, description, owns, dependsOn, dependentCount.
 */
export const subsystemExtractSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		maturity: z.enum(["foundational", "maturing", "developing", "experimental"]),
		description: z.string(),
		owns: z.array(z.string()),
		dependsOn: z.array(z.string()),
		dependentCount: z.number(),
	})
	.strict();
export type SubsystemExtract = z.infer<typeof subsystemExtractSchema>;
