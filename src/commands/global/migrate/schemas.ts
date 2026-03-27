import { z } from "zod";
import { epicStatusSchema } from "../../../schemas/entities/epic.js";
import type { EpicStatus } from "../../../schemas/entities/epic.js";
import { questStatusSchema } from "../../../schemas/entities/quest.js";
import type { QuestStatus } from "../../../schemas/entities/quest.js";
import { sliceStatusSchema } from "../../../schemas/entities/slice.js";
import type { SliceStatus } from "../../../schemas/entities/slice.js";
import { timestampSchema } from "../../../schemas/shared.js";

// ---------------------------------------------------------------------------
// Round 1: Inventory Response
// ---------------------------------------------------------------------------

/** Project-level info collected during inventory */
const projectInfoSchema = z.object({
	name: z.string().min(1).describe("Project name (used in project.json)"),
	goal: z
		.string()
		.min(1)
		.describe("Project goal (written to idea.md during artifact copy, NOT stored in project.json)"),
});

/** Epic entry from inventory round */
const epicInventoryItemSchema = z.object({
	name: z.string().min(1).describe("Epic name (kebab-case)"),
	goal: z.string().min(1).describe("Epic goal"),
	status: epicStatusSchema.describe("Current lifecycle status"),
	sourcePath: z
		.string()
		.min(1)
		.describe("Path to the old-format epic directory relative to .project/"),
});

/** Quest entry from inventory round */
const questInventoryItemSchema = z.object({
	name: z.string().min(1).describe("Quest name (kebab-case)"),
	goal: z.string().min(1).describe("Quest goal"),
	status: questStatusSchema.describe("Current lifecycle status"),
	sourcePath: z
		.string()
		.min(1)
		.describe("Path to the old-format quest directory relative to .project/"),
});

/** Full inventory response — answers to Round 1 questions */
export const inventoryResponseSchema = z.object({
	project: projectInfoSchema.describe("Project-level information"),
	epics: z
		.array(epicInventoryItemSchema)
		.describe("All epics found in the old .project/ directory"),
	quests: z
		.array(questInventoryItemSchema)
		.describe("All quests found in the old .project/ directory"),
});
export type InventoryResponse = z.infer<typeof inventoryResponseSchema>;

// ---------------------------------------------------------------------------
// Round 2: Per-Epic Detail Response
// ---------------------------------------------------------------------------

/** Slice entry within an epic detail response */
const sliceDetailItemSchema = z.object({
	name: z.string().min(1).describe("Slice name (kebab-case)"),
	goal: z.string().min(1).describe("Slice goal"),
	status: sliceStatusSchema.describe("Current lifecycle status"),
	sourcePath: z
		.string()
		.min(1)
		.describe("Path to the old-format slice directory relative to .project/"),
});

/**
 * Per-epic detail response.
 *
 * Note: sliceSequence is collected here for slice ordering during Q&A — buildMigrationState
 * uses it to determine slice directory ordering, but it is intentionally excluded from the
 * output epic.json (epicSchema does not include sliceSequence; ordering is implicit in the
 * directory structure).
 */
export const epicDetailResponseSchema = z.object({
	slices: z.array(sliceDetailItemSchema).describe("All slices belonging to this epic"),
	sliceSequence: z
		.array(z.string().min(1))
		.describe("Ordered list of slice names defining execution order (used for ordering, not persisted in output)"),
	hasArchitecture: z
		.boolean()
		.describe("Whether the old epic directory contains architecture artifacts"),
	activatedDate: timestampSchema
		.nullable()
		.describe("ISO 8601 date when the epic was activated, or null if not yet activated"),
});
export type EpicDetailResponse = z.infer<typeof epicDetailResponseSchema>;

// ---------------------------------------------------------------------------
// Confirmation Round
// ---------------------------------------------------------------------------

const confirmApprovedSchema = z.object({
	approved: z.literal(true).describe("Set to true to approve the migration"),
	notes: z.string().describe("Any notes about the migration"),
});

const confirmRejectedSchema = z.object({
	approved: z.literal(false).describe("Set to false to request corrections"),
	reAnswerIds: z
		.array(z.string().min(1))
		.min(1)
		.describe("Question IDs to re-answer (at least one required when rejecting)"),
	notes: z.string().describe("Explanation of what needs correction"),
});

/** Confirmation response — discriminated union on `approved` */
export const confirmationResponseSchema = z.discriminatedUnion("approved", [
	confirmApprovedSchema,
	confirmRejectedSchema,
]);
export type ConfirmationResponse = z.infer<typeof confirmationResponseSchema>;

// ---------------------------------------------------------------------------
// Q&A Protocol Envelope Types
// ---------------------------------------------------------------------------

/** A single question emitted by the CLI */
export interface MigrationQuestion {
	/** Kebab-case ID with entity-type prefix (e.g., "project-info", "epic-details-my-epic") */
	readonly id: string;
	/** Human-readable question text */
	readonly question: string;
	/** Hint text providing context (may be large for confirmation rounds) */
	readonly hint: string;
	/** JSON Schema for the expected response shape (generated via z.toJSONSchema()) */
	readonly responseSchema: object;
}

/** A single answer from the LLM */
export interface MigrationAnswer<T = unknown> {
	/** Matches the corresponding MigrationQuestion.id */
	readonly id: string;
	/** The response data, validated against the question's schema */
	readonly data: T;
}

/** A round of questions emitted by the CLI */
export interface MigrationRound {
	readonly round: number;
	readonly questions: readonly MigrationQuestion[];
}

/** A round of answers from the LLM */
export interface MigrationResponse {
	readonly round: number;
	readonly answers: readonly MigrationAnswer[];
}

/**
 * Validates an answer's data against a Zod schema and returns a narrowed MigrationAnswer.
 * Throws if validation fails.
 */
export function validateAnswer<S extends z.ZodType>(
	answer: MigrationAnswer,
	schema: S,
): MigrationAnswer<z.infer<S>> {
	const parsed = schema.parse(answer.data);
	return { id: answer.id, data: parsed };
}

// ---------------------------------------------------------------------------
// Migration State (serialized to .migration-in-progress.json)
// ---------------------------------------------------------------------------

/** Schema for migration intermediate state persisted between rounds */
export const migrationStateSchema = z.object({
	status: z.enum(["in-progress", "confirming", "complete"]).describe("Current migration phase"),
	round: z.number().int().nonnegative().describe("Current round number"),
	answers: z
		.record(z.string(), z.unknown())
		.describe("Answers keyed by question ID (e.g., 'project-info', 'epic-details-initial')"),
	correctionRound: z
		.number()
		.int()
		.nonnegative()
		.describe("Number of correction rounds used (circuit breaker at 3)"),
});
export type MigrationState = z.infer<typeof migrationStateSchema>;

// ---------------------------------------------------------------------------
// Migration Result
// ---------------------------------------------------------------------------

/** Summary emitted on migration completion */
export interface MigrationSummary {
	readonly projectName: string;
	readonly epicCount: number;
	readonly questCount: number;
	readonly sliceCount: number;
}

/** Schema for migration result — either more questions or completion */
export const migrationResultSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("questions").describe("More questions to answer"),
		round: z.object({
			round: z.number().int().positive(),
			questions: z.array(
				z.object({
					id: z.string().min(1),
					question: z.string(),
					hint: z.string(),
					responseSchema: z.record(z.string(), z.unknown()),
				}),
			),
		}),
		warning: z.string().optional(),
	}),
	z.object({
		status: z.literal("complete").describe("Migration finished"),
		summary: z.object({
			projectName: z.string().min(1),
			epicCount: z.number().int().nonnegative(),
			questCount: z.number().int().nonnegative(),
			sliceCount: z.number().int().nonnegative(),
		}),
	}),
]);
export type MigrationResult = z.infer<typeof migrationResultSchema>;

// ---------------------------------------------------------------------------
// Question ID Conventions
// ---------------------------------------------------------------------------

/** Round 1 static question IDs */
export const QUESTION_IDS = {
	PROJECT_INFO: "project-info",
	EPIC_INVENTORY: "epic-inventory",
	QUEST_INVENTORY: "quest-inventory",
	CONFIRMATION: "confirmation",
} as const;

/** Generate a parameterized question ID for epic detail rounds */
export function epicDetailQuestionId(epicName: string): string {
	return `epic-details-${epicName}`;
}

// ---------------------------------------------------------------------------
// Re-exports of shared status schemas for convenience
// ---------------------------------------------------------------------------

export { epicStatusSchema, questStatusSchema, sliceStatusSchema };
export type { EpicStatus, QuestStatus, SliceStatus };
