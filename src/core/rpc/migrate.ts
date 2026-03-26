/**
 * RPC migrate — multi-round Q&A protocol for migrating pre-CLI .project/ to CLI format.
 *
 * Owns all orchestration logic: pre-checks, question generation, answer validation,
 * intermediate state persistence (.migration-in-progress.json), and round dispatch.
 * The command wrapper is thin — it reads stdin and delegates here.
 *
 * Design: Direct state construction (no state machine event). Migration constructs
 * ProjectState via buildMigrationState() and calls commitState(), bypassing reduce().
 * This is a formal INV-001 exception.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
	type MigrationAnswer,
	type MigrationQuestion,
	type MigrationResult,
	type MigrationRound,
	type MigrationState,
	QUESTION_IDS,
	epicDetailQuestionId,
	epicDetailResponseSchema,
	inventoryResponseSchema,
	migrationStateSchema,
	validateAnswer,
} from "../../commands/global/migrate/schemas.js";
import { validateSourcePath } from "../../commands/global/migrate/validate-source-path.js";
import { GoodplanError } from "../../util/errors.js";
import { deterministicStringify } from "../../util/json.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIGRATION_STATE_FILE = ".migration-in-progress.json";

/** Convert a MigrationRound (readonly arrays) to a MigrationResult questions variant */
function questionsResult(round: MigrationRound): MigrationResult {
	return {
		status: "questions",
		round: {
			round: round.round,
			questions: round.questions.map((q) => ({
				id: q.id,
				question: q.question,
				hint: q.hint,
				responseSchema: q.responseSchema as Record<string, unknown>,
			})),
		},
	};
}

// ---------------------------------------------------------------------------
// Round 1 Question Generation
// ---------------------------------------------------------------------------

function generateInventoryQuestions(): MigrationRound {
	const questions: MigrationQuestion[] = [
		{
			id: QUESTION_IDS.PROJECT_INFO,
			question: "What is the project name and goal?",
			hint: "Look at .project/idea.md for the project goal. The project name should be a short kebab-case identifier.",
			responseSchema: z.toJSONSchema(inventoryResponseSchema.shape.project, {
				unrepresentable: "any",
			}),
		},
		{
			id: QUESTION_IDS.EPIC_INVENTORY,
			question: "List all epics with names, goals, statuses, and source paths.",
			hint: "Look in .project/epics/ for directories. Each directory is an epic. Active epics are prefixed with __active__, completed with __complete__, abandoned with __abandoned__. The sourcePath should be relative to .project/ (e.g., 'epics/__active__my-epic').",
			responseSchema: z.toJSONSchema(inventoryResponseSchema.shape.epics, {
				unrepresentable: "any",
			}),
		},
		{
			id: QUESTION_IDS.QUEST_INVENTORY,
			question: "List all quests/side-quests with names, goals, statuses, and source paths.",
			hint: "Look in .project/side-quests/ for directories. Each directory is a quest. Active quests are prefixed with __active__, completed with __complete__, abandoned with __abandoned__. The sourcePath should be relative to .project/ (e.g., 'side-quests/__active__my-quest'). Return an empty array if no quests exist.",
			responseSchema: z.toJSONSchema(inventoryResponseSchema.shape.quests, {
				unrepresentable: "any",
			}),
		},
	];

	return { round: 1, questions };
}

// ---------------------------------------------------------------------------
// Round 2 Question Generation (per-epic details)
// ---------------------------------------------------------------------------

function generateEpicDetailQuestions(inventoryAnswers: Record<string, unknown>): MigrationRound {
	const epicInventory = inventoryAnswers[QUESTION_IDS.EPIC_INVENTORY] as
		| Array<{ name: string }>
		| undefined;

	if (!epicInventory || epicInventory.length === 0) {
		// No epics — skip to confirmation round
		return { round: 2, questions: [] };
	}

	const questions: MigrationQuestion[] = epicInventory.map((epic) => ({
		id: epicDetailQuestionId(epic.name),
		question: `Provide details for epic "${epic.name}": slices, slice sequence, architecture presence, and activation date.`,
		hint: `Look in the epic's source directory for slice subdirectories. Each slice has a name, goal, status, and sourcePath. sliceSequence is the ordered list of slice names. hasArchitecture is true if the epic has an architecture/ directory. activatedDate is the ISO 8601 date when the epic was activated (null if not yet).`,
		responseSchema: z.toJSONSchema(epicDetailResponseSchema, {
			unrepresentable: "any",
		}),
	}));

	return { round: 2, questions };
}

// ---------------------------------------------------------------------------
// Answer Validation
// ---------------------------------------------------------------------------

/**
 * Validate Round 1 answers against their schemas and check sourcePaths.
 * Throws GoodplanError on any validation failure.
 */
function validateRound1Answers(
	answers: readonly MigrationAnswer[],
	questions: readonly MigrationQuestion[],
	projectDir: string,
): Record<string, unknown> {
	const questionIds = new Set(questions.map((q) => q.id));
	const errors: string[] = [];
	const validated: Record<string, unknown> = {};

	// Check all required questions are answered
	for (const qId of questionIds) {
		if (!answers.some((a) => a.id === qId)) {
			errors.push(`Missing answer for question "${qId}"`);
		}
	}

	// Check no unexpected answers
	for (const answer of answers) {
		if (!questionIds.has(answer.id)) {
			errors.push(`Unexpected answer ID "${answer.id}"`);
		}
	}

	if (errors.length > 0) {
		throw new GoodplanError("VALIDATION_MIGRATION_INVALID", "Invalid migration answers", {
			errors,
		});
	}

	// Validate each answer against the corresponding schema
	const schemaMap: Record<string, z.ZodType> = {
		[QUESTION_IDS.PROJECT_INFO]: inventoryResponseSchema.shape.project,
		[QUESTION_IDS.EPIC_INVENTORY]: inventoryResponseSchema.shape.epics,
		[QUESTION_IDS.QUEST_INVENTORY]: inventoryResponseSchema.shape.quests,
	};

	for (const answer of answers) {
		const schema = schemaMap[answer.id];
		if (schema === undefined) continue;

		try {
			const result = validateAnswer(answer, schema);
			validated[answer.id] = result.data;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`Answer "${answer.id}" failed validation: ${msg}`);
		}
	}

	if (errors.length > 0) {
		throw new GoodplanError("VALIDATION_MIGRATION_INVALID", "Invalid migration answers", {
			errors,
		});
	}

	// Validate sourcePaths
	const sourcePathErrors: string[] = [];

	// Epic sourcePaths
	const epics = validated[QUESTION_IDS.EPIC_INVENTORY] as Array<{ sourcePath: string }> | undefined;
	if (epics) {
		for (const epic of epics) {
			if (validateSourcePath(epic.sourcePath, projectDir) === null) {
				sourcePathErrors.push(`Epic sourcePath does not exist: ${epic.sourcePath}`);
			}
		}
	}

	// Quest sourcePaths
	const quests = validated[QUESTION_IDS.QUEST_INVENTORY] as
		| Array<{ sourcePath: string }>
		| undefined;
	if (quests) {
		for (const quest of quests) {
			if (validateSourcePath(quest.sourcePath, projectDir) === null) {
				sourcePathErrors.push(`Quest sourcePath does not exist: ${quest.sourcePath}`);
			}
		}
	}

	if (sourcePathErrors.length > 0) {
		throw new GoodplanError(
			"VALIDATION_MIGRATION_INVALID",
			"Invalid source paths in migration answers",
			{ errors: sourcePathErrors },
		);
	}

	return validated;
}

// ---------------------------------------------------------------------------
// Migration State I/O
// ---------------------------------------------------------------------------

function migrationStatePath(cwd: string): string {
	return path.join(cwd, MIGRATION_STATE_FILE);
}

function readMigrationState(cwd: string): MigrationState | null {
	const filePath = migrationStatePath(cwd);
	if (!fs.existsSync(filePath)) return null;

	const raw = fs.readFileSync(filePath, "utf-8");
	const parsed: unknown = JSON.parse(raw);
	return migrationStateSchema.parse(parsed);
}

function writeMigrationState(cwd: string, state: MigrationState): void {
	const filePath = migrationStatePath(cwd);
	fs.writeFileSync(filePath, `${deterministicStringify(state)}\n`, "utf-8");
}

// ---------------------------------------------------------------------------
// Stdin Envelope Schema
// ---------------------------------------------------------------------------

/** Schema for the stdin envelope: { round, answers } */
const migrationResponseSchema = z.object({
	round: z.number().int().positive(),
	answers: z.array(
		z.object({
			id: z.string().min(1),
			data: z.unknown(),
		}),
	),
});
export { migrationResponseSchema };

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Execute one round of the migration protocol.
 *
 * @param projectDir - The `.project/` directory path (checked directly, no walk-up)
 * @param stdin - Parsed stdin object, or null if no stdin provided
 * @param cwd - Working directory (for .migration-in-progress.json location)
 * @param stdinStream - Optional stream for test injection (passed to readStdin)
 */
export async function rpcMigrate(
	projectDir: string,
	stdin: Record<string, unknown> | null,
	cwd: string,
): Promise<MigrationResult> {
	// ── Pre-checks ──────────────────────────────────────────────
	// .project/ must exist
	if (!fs.existsSync(projectDir)) {
		throw new GoodplanError(
			"DATA_NO_PROJECT",
			"No .project/ directory found. Cannot migrate without existing project artifacts.",
		);
	}

	// .project/project.json must NOT exist (already migrated)
	const projectJsonPath = path.join(projectDir, "project.json");
	if (fs.existsSync(projectJsonPath)) {
		throw new GoodplanError(
			"STATE_ALREADY_INITIALIZED",
			"Project is already initialized (.project/project.json exists). Migration is only for pre-CLI projects.",
		);
	}

	// ── Read existing migration state ───────────────────────────
	const existingState = readMigrationState(cwd);

	// ── No stdin: emit current round's questions ────────────────
	if (stdin === null) {
		if (existingState !== null) {
			// Resume: re-emit current round's questions
			return emitQuestionsForRound(existingState, projectDir);
		}

		// Fresh start: emit Round 1 inventory questions
		return questionsResult(generateInventoryQuestions());
	}

	// ── Stdin provided: validate and advance ────────────────────
	const parseResult = migrationResponseSchema.safeParse(stdin);
	if (!parseResult.success) {
		throw new GoodplanError("VALIDATION_MIGRATION_INVALID", "Invalid migration response envelope", {
			errors: parseResult.error.issues.map((i) => i.message),
		});
	}

	const response = parseResult.data;
	const expectedRound = existingState !== null ? existingState.round : 1;

	if (response.round !== expectedRound) {
		throw new GoodplanError(
			"VALIDATION_MIGRATION_INVALID",
			`Expected answers for round ${String(expectedRound)}, got round ${String(response.round)}`,
		);
	}

	// Dispatch by round
	if (response.round === 1) {
		return handleRound1(response.answers, projectDir, cwd);
	}

	if (response.round === 2 && existingState !== null) {
		return handleRound2(response.answers, existingState, projectDir, cwd);
	}

	throw new GoodplanError(
		"VALIDATION_MIGRATION_INVALID",
		`Unexpected round ${String(response.round)}`,
	);
}

// ---------------------------------------------------------------------------
// Round Handlers
// ---------------------------------------------------------------------------

function handleRound1(
	answers: readonly MigrationAnswer[],
	projectDir: string,
	cwd: string,
): MigrationResult {
	const questions = generateInventoryQuestions().questions;
	const validated = validateRound1Answers(answers, questions, projectDir);

	// Write migration state
	const state: MigrationState = {
		status: "in-progress",
		round: 2,
		answers: validated,
		correctionRound: 0,
	};
	writeMigrationState(cwd, state);

	// Generate round 2 questions
	const round2 = generateEpicDetailQuestions(validated);

	if (round2.questions.length === 0) {
		// No epics to detail — skip to confirmation (Phase 3 will handle this)
		// For now, advance to round 3 placeholder
		state.round = 3;
		writeMigrationState(cwd, state);
	}

	return questionsResult(round2);
}

function handleRound2(
	answers: readonly MigrationAnswer[],
	existingState: MigrationState,
	projectDir: string,
	cwd: string,
): MigrationResult {
	const round2 = generateEpicDetailQuestions(existingState.answers);
	const questionIds = new Set(round2.questions.map((q) => q.id));
	const errors: string[] = [];
	const validated: Record<string, unknown> = { ...existingState.answers };

	// Check all required questions are answered
	for (const qId of questionIds) {
		if (!answers.some((a) => a.id === qId)) {
			errors.push(`Missing answer for question "${qId}"`);
		}
	}

	// Check no unexpected answers
	for (const answer of answers) {
		if (!questionIds.has(answer.id)) {
			errors.push(`Unexpected answer ID "${answer.id}"`);
		}
	}

	if (errors.length > 0) {
		throw new GoodplanError("VALIDATION_MIGRATION_INVALID", "Invalid migration answers", {
			errors,
		});
	}

	// Validate each answer
	for (const answer of answers) {
		try {
			const result = validateAnswer(answer, epicDetailResponseSchema);
			validated[answer.id] = result.data;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`Answer "${answer.id}" failed validation: ${msg}`);
		}
	}

	if (errors.length > 0) {
		throw new GoodplanError("VALIDATION_MIGRATION_INVALID", "Invalid migration answers", {
			errors,
		});
	}

	// Validate slice sourcePaths
	const sourcePathErrors: string[] = [];
	for (const answer of answers) {
		const data = validated[answer.id] as { slices?: Array<{ sourcePath: string }> } | undefined;
		if (data?.slices) {
			for (const slice of data.slices) {
				if (validateSourcePath(slice.sourcePath, projectDir) === null) {
					sourcePathErrors.push(
						`Slice sourcePath does not exist: ${slice.sourcePath} (in ${answer.id})`,
					);
				}
			}
		}
	}

	if (sourcePathErrors.length > 0) {
		throw new GoodplanError(
			"VALIDATION_MIGRATION_INVALID",
			"Invalid source paths in migration answers",
			{ errors: sourcePathErrors },
		);
	}

	// Update state — advance to confirmation round (Phase 3)
	const newState: MigrationState = {
		status: "confirming",
		round: 3,
		answers: validated,
		correctionRound: 0,
	};
	writeMigrationState(cwd, newState);

	// Phase 3 will implement the confirmation round.
	// For now, emit a placeholder that indicates we need confirmation.
	return {
		status: "questions",
		round: {
			round: 3,
			questions: [
				{
					id: "confirmation",
					question: "Review the migration summary and confirm or request corrections.",
					hint: "Confirmation round will be implemented in Phase 3.",
					responseSchema: {},
				},
			],
		},
	};
}

// ---------------------------------------------------------------------------
// Resume Helper
// ---------------------------------------------------------------------------

function emitQuestionsForRound(state: MigrationState, _projectDir: string): MigrationResult {
	if (state.round === 1) {
		return questionsResult(generateInventoryQuestions());
	}

	if (state.round === 2) {
		return questionsResult(generateEpicDetailQuestions(state.answers));
	}

	// Rounds 3+ will be handled by Phase 3
	return {
		status: "questions",
		round: {
			round: state.round,
			questions: [
				{
					id: "confirmation",
					question: "Review the migration summary and confirm or request corrections.",
					hint: "Confirmation round will be implemented in Phase 3.",
					responseSchema: {},
				},
			],
		},
	};
}
