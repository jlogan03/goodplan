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
	type ConfirmationResponse,
	type EpicDetailResponse,
	type MigrationAnswer,
	type MigrationQuestion,
	type MigrationResult,
	type MigrationRound,
	type MigrationState,
	QUESTION_IDS,
	confirmationResponseSchema,
	epicDetailQuestionId,
	epicDetailResponseSchema,
	inventoryResponseSchema,
	migrationStateSchema,
	validateAnswer,
} from "../../commands/global/migrate/schemas.js";
import { validateSourcePath } from "../../commands/global/migrate/validate-source-path.js";
import type { ActivityEntry } from "../../schemas/records/activity-log.js";
import { GoodplanError } from "../../util/errors.js";
import { deterministicStringify } from "../../util/json.js";
import { VERSION } from "../../version.js";
import { commitState } from "../data/commit.js";
import type {
	DirectoryEntry,
	JsonEntry,
	JsonlEntry,
	ProjectState,
} from "../tree.js";
import { ZERO_STATE } from "../tree.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIGRATION_STATE_FILE = ".migration-in-progress.json";
const MAX_CORRECTION_ROUNDS = 3;

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
// State Construction (INV-001 exception: bypasses state machine)
// ---------------------------------------------------------------------------

/** Inventory-level epic as extracted from validated answers */
interface MigrationEpic {
	readonly name: string;
	readonly goal: string;
	readonly status: string;
	readonly sourcePath: string;
}

/** Inventory-level quest as extracted from validated answers */
interface MigrationQuest {
	readonly name: string;
	readonly goal: string;
	readonly status: string;
	readonly sourcePath: string;
}

/** Slice detail as extracted from epic detail answers */
interface MigrationSlice {
	readonly name: string;
	readonly goal: string;
	readonly status: string;
	readonly sourcePath: string;
}

/**
 * Build a complete ProjectState tree from validated migration answers.
 *
 * @internal Exported for unit testing only (Phase 6). Not part of public API.
 * Constructs state directly — no state machine event, no reduce() call.
 * Uses ZERO_STATE as oldState when calling commitState().
 */
export function buildMigrationState(
	validatedAnswers: Record<string, unknown>,
): ProjectState {
	const ts = new Date().toISOString();

	const project = validatedAnswers[QUESTION_IDS.PROJECT_INFO] as
		| { name: string; goal: string }
		| undefined;
	if (project === undefined) {
		throw new GoodplanError(
			"INTERNAL_ERROR",
			"Missing project-info in validated migration answers",
		);
	}

	const epicInventory =
		(validatedAnswers[QUESTION_IDS.EPIC_INVENTORY] as MigrationEpic[] | undefined) ?? [];
	const questInventory =
		(validatedAnswers[QUESTION_IDS.QUEST_INVENTORY] as MigrationQuest[] | undefined) ?? [];

	// Determine active pointers — find entities with "active" statuses
	const activeEpicStatuses = new Set([
		"activated",
		"exploring",
		"explored",
		"defining-architecture",
		"architecture-defined",
		"refining-architecture",
		"architecture-refined",
		"defining-slices",
		"slices-defined",
		"refining-slices",
		"slices-refined",
	]);
	const activeSliceStatuses = new Set([
		"planning",
		"plan-created",
		"refining",
		"plan-refined",
		"implementing",
		"implementation-complete",
	]);
	const activeQuestStatuses = new Set([
		"planning",
		"plan-created",
		"refining",
		"plan-refined",
		"implementing",
		"implementation-complete",
	]);

	const activeEpic = epicInventory.find((e) => activeEpicStatuses.has(e.status))?.name ?? null;
	const activeQuest = questInventory.find((q) => activeQuestStatuses.has(q.status))?.name ?? null;

	// Find active slice across all epics
	let activeSlice: string | null = null;
	for (const epic of epicInventory) {
		const detailKey = epicDetailQuestionId(epic.name);
		const detail = validatedAnswers[detailKey] as EpicDetailResponse | undefined;
		if (detail !== undefined) {
			const found = detail.slices.find((s) => activeSliceStatuses.has(s.status));
			if (found !== undefined) {
				activeSlice = found.name;
				break;
			}
		}
	}

	// ── Build the state tree ────────────────────────────────────

	// Project JSON
	const projectJson: JsonEntry<unknown> = {
		type: "json",
		content: {
			version: VERSION,
			name: project.name,
			activeEpic,
			activeSlice,
			activeQuest,
			created: ts,
			updated: ts,
		},
	};

	// Activity log
	const activityEntry: ActivityEntry = {
		ts,
		phase: "migration",
		scope: "project",
		status: "complete",
		summary: "Migrated from pre-CLI .project/ format",
		...(epicInventory.length > 0 || questInventory.length > 0
			? {
					detail: `${String(epicInventory.length)} epics, ${String(countAllSlices(validatedAnswers, epicInventory))} slices, ${String(questInventory.length)} quests`,
				}
			: {}),
	};

	const activityLog: JsonlEntry<unknown> = {
		type: "jsonl",
		content: [activityEntry],
	};

	// Empty JSONL files
	const decisionsJsonl: JsonlEntry<unknown> = { type: "jsonl", content: [] };
	const learningsJsonl: JsonlEntry<unknown> = { type: "jsonl", content: [] };

	// ── Epics ───────────────────────────────────────────────────

	const epicsContents: Record<string, DirectoryEntry | JsonEntry<unknown>> = {};

	const epicOverviewItems: Array<{
		name: string;
		status: string;
		created: string;
		completed: string | null;
		slices: Array<{
			name: string;
			status: string;
			created: string;
			completed: string | null;
		}>;
	}> = [];

	for (const epic of epicInventory) {
		const detailKey = epicDetailQuestionId(epic.name);
		const detail = validatedAnswers[detailKey] as EpicDetailResponse | undefined;

		const isTerminal = epic.status === "completed" || epic.status === "abandoned";

		// Build slice overview items for this epic (populated in the slices loop below)
		const epicSliceItems: Array<{
			name: string;
			status: string;
			created: string;
			completed: string | null;
		}> = [];

		epicOverviewItems.push({
			name: epic.name,
			status: epic.status,
			created: ts,
			completed: isTerminal ? ts : null,
			slices: epicSliceItems,
		});

		const epicJsonContent: Record<string, unknown> = {
			name: epic.name,
			status: epic.status,
			goal: epic.goal,
			verifications: [],
			refinement: null,
			sliceSequence: detail?.sliceSequence ?? [],
			created: ts,
			activated: detail?.activatedDate ?? (isTerminal ? ts : null),
			updated: ts,
		};

		const epicDirContents: Record<string, DirectoryEntry | JsonEntry<unknown>> = {
			"epic.json": { type: "json", content: epicJsonContent },
			architecture: { type: "directory", contents: {} },
			research: { type: "directory", contents: {} },
			brainstorm: { type: "directory", contents: {} },
			prototypes: { type: "directory", contents: {} },
		};

		epicsContents[epic.name] = { type: "directory", contents: epicDirContents };
	}

	const epicsOverview: JsonEntry<unknown> = {
		type: "json",
		content: { items: epicOverviewItems },
	};
	epicsContents["overview.json"] = epicsOverview;

	// ── Slices (nested under epics) ──────────────────────────────

	for (const epic of epicInventory) {
		const detailKey = epicDetailQuestionId(epic.name);
		const detail = validatedAnswers[detailKey] as EpicDetailResponse | undefined;
		if (detail === undefined) continue;

		// Find the matching epicOverviewItem to populate its slices array
		const epicOverviewItem = epicOverviewItems.find((e) => e.name === epic.name);

		const epicDir = epicsContents[epic.name] as DirectoryEntry | undefined;
		if (epicDir === undefined) continue;

		const slicesDirContents: Record<
			string,
			DirectoryEntry | JsonEntry<unknown> | JsonlEntry<unknown>
		> = {};

		for (const slice of detail.slices) {
			const isTerminal = slice.status === "completed" || slice.status === "abandoned";

			// Add to epic overview's embedded slices array
			if (epicOverviewItem !== undefined) {
				epicOverviewItem.slices.push({
					name: slice.name,
					status: slice.status,
					created: ts,
					completed: isTerminal ? ts : null,
				});
			}

			const sliceJsonContent = {
				name: slice.name,
				epic: epic.name,
				status: slice.status,
				goal: slice.goal,
				deferred: [],
				refinement: null,
				created: ts,
				updated: ts,
			};

			const sliceDirContents: Record<
				string,
				JsonEntry<unknown> | JsonlEntry<unknown>
			> = {
				"slice.json": { type: "json", content: sliceJsonContent },
				"learnings.jsonl": { type: "jsonl", content: [] },
				"architecture-deltas.jsonl": { type: "jsonl", content: [] },
			};

			slicesDirContents[slice.name] = { type: "directory", contents: sliceDirContents };
		}

		// Add slices directory to epic
		epicDir.contents.slices = { type: "directory", contents: slicesDirContents };
	}

	// ── Quests ──────────────────────────────────────────────────

	const questsContents: Record<
		string,
		DirectoryEntry | JsonEntry<unknown> | JsonlEntry<unknown>
	> = {};

	const questOverviewItems: Array<{
		name: string;
		status: string;
		created: string;
		completed: string | null;
	}> = [];

	for (const quest of questInventory) {
		const isTerminal = quest.status === "completed" || quest.status === "abandoned";

		questOverviewItems.push({
			name: quest.name,
			status: quest.status,
			created: ts,
			completed: isTerminal ? ts : null,
		});

		const questJsonContent = {
			name: quest.name,
			status: quest.status,
			goal: quest.goal,
			refinement: null,
			created: ts,
			updated: ts,
		};

		const questDirContents: Record<
			string,
			JsonEntry<unknown> | JsonlEntry<unknown>
		> = {
			"quest.json": { type: "json", content: questJsonContent },
			"learnings.jsonl": { type: "jsonl", content: [] },
			"architecture-deltas.jsonl": { type: "jsonl", content: [] },
		};

		questsContents[quest.name] = { type: "directory", contents: questDirContents };
	}

	const questsOverview: JsonEntry<unknown> = {
		type: "json",
		content: { items: questOverviewItems },
	};
	questsContents["overview.json"] = questsOverview;

	// ── Root tree ───────────────────────────────────────────────

	const state: ProjectState = {
		type: "directory",
		contents: {
			"project.json": projectJson,
			"activity-log.jsonl": activityLog,
			"decisions.jsonl": decisionsJsonl,
			"learnings.jsonl": learningsJsonl,
			epics: { type: "directory", contents: epicsContents },
			quests: { type: "directory", contents: questsContents },
			architecture: { type: "directory", contents: {} },
			research: { type: "directory", contents: {} },
			brainstorm: { type: "directory", contents: {} },
			prototypes: { type: "directory", contents: {} },
		},
	};

	return state;
}

/** Count total slices across all epics */
function countAllSlices(
	answers: Record<string, unknown>,
	epics: readonly MigrationEpic[],
): number {
	let total = 0;
	for (const epic of epics) {
		const detail = answers[epicDetailQuestionId(epic.name)] as
			| EpicDetailResponse
			| undefined;
		if (detail !== undefined) {
			total += detail.slices.length;
		}
	}
	return total;
}

// ---------------------------------------------------------------------------
// .project/ → .project-old/ Rename
// ---------------------------------------------------------------------------

function renameProjectDir(projectDir: string): string {
	const projectOldDir = `${projectDir}-old`;

	if (fs.existsSync(projectOldDir)) {
		throw new GoodplanError(
			"DATA_MIGRATION_BACKUP_EXISTS",
			`${projectOldDir} already exists — a previous migration attempt may have left debris. Remove or rename it before retrying.`,
		);
	}

	try {
		fs.renameSync(projectDir, projectOldDir);
	} catch (err: unknown) {
		const errCode = (err as NodeJS.ErrnoException).code;
		if (errCode === "EXDEV") {
			throw new GoodplanError(
				"DATA_WRITE_ERROR",
				`Cannot rename ${projectDir} to ${projectOldDir}: cross-filesystem rename (EXDEV). This happens when .project/ is a symlink or on a different mount. Move it manually and retry.`,
				{ projectDir, projectOldDir },
				err,
			);
		}
		throw new GoodplanError(
			"DATA_WRITE_ERROR",
			`Failed to rename ${projectDir} to ${projectOldDir}`,
			{ projectDir, projectOldDir },
			err,
		);
	}

	return projectOldDir;
}

// ---------------------------------------------------------------------------
// Markdown Artifact Copy
// ---------------------------------------------------------------------------

/** Allowlisted directories for recursive copy */
const ARTIFACT_DIRS = new Set([
	"architecture",
	"research",
	"brainstorm",
	"prototypes",
	"decisions",
	"completion",
]);

/** Allowlisted project-level markdown files */
const PROJECT_MARKDOWN_FILES = [
	"idea.md",
	"conventions.md",
	"learnings.md",
	"project-health.md",
];

/**
 * Copy markdown artifacts from .project-old/ to the new .project/ directory.
 * Uses an allowlist approach: only copies *.md files and specific directories.
 */
function copyMigrationArtifacts(
	projectDir: string,
	projectOldDir: string,
	validatedAnswers: Record<string, unknown>,
): void {
	// Project-level markdown files
	for (const file of PROJECT_MARKDOWN_FILES) {
		const src = path.join(projectOldDir, file);
		if (fs.existsSync(src)) {
			fs.copyFileSync(src, path.join(projectDir, file));
		}
	}

	// Project-level directories
	for (const dir of ARTIFACT_DIRS) {
		const src = path.join(projectOldDir, dir);
		if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
			copyDirRecursive(src, path.join(projectDir, dir));
		}
	}

	// Per-epic artifacts
	const epicInventory =
		(validatedAnswers[QUESTION_IDS.EPIC_INVENTORY] as MigrationEpic[] | undefined) ?? [];

	for (const epic of epicInventory) {
		const epicSrcDir = path.join(projectOldDir, epic.sourcePath);
		const epicDestDir = path.join(projectDir, "epics", epic.name);

		if (!fs.existsSync(epicSrcDir)) continue;

		// Copy allowlisted directories
		for (const dir of ARTIFACT_DIRS) {
			const src = path.join(epicSrcDir, dir);
			if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
				copyDirRecursive(src, path.join(epicDestDir, dir));
			}
		}

		// Copy any root-level .md files from the epic source
		copyMarkdownFiles(epicSrcDir, epicDestDir);

		// Per-slice artifacts
		const detailKey = epicDetailQuestionId(epic.name);
		const detail = validatedAnswers[detailKey] as EpicDetailResponse | undefined;
		if (detail === undefined) continue;

		for (const slice of detail.slices) {
			const sliceSrcDir = path.join(projectOldDir, slice.sourcePath);
			const sliceDestDir = path.join(projectDir, "epics", epic.name, "slices", slice.name);

			if (!fs.existsSync(sliceSrcDir)) continue;

			// Copy allowlisted directories
			for (const dir of ARTIFACT_DIRS) {
				const src = path.join(sliceSrcDir, dir);
				if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
					copyDirRecursive(src, path.join(sliceDestDir, dir));
				}
			}

			// Copy any root-level .md files from the slice source
			copyMarkdownFiles(sliceSrcDir, sliceDestDir);
		}
	}

	// Per-quest artifacts
	const questInventory =
		(validatedAnswers[QUESTION_IDS.QUEST_INVENTORY] as MigrationQuest[] | undefined) ?? [];

	for (const quest of questInventory) {
		const questSrcDir = path.join(projectOldDir, quest.sourcePath);
		const questDestDir = path.join(projectDir, "quests", quest.name);

		if (!fs.existsSync(questSrcDir)) continue;

		// Copy allowlisted directories
		for (const dir of ARTIFACT_DIRS) {
			const src = path.join(questSrcDir, dir);
			if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
				copyDirRecursive(src, path.join(questDestDir, dir));
			}
		}

		// Copy any root-level .md files from the quest source
		copyMarkdownFiles(questSrcDir, questDestDir);
	}
}

/** Recursively copy a directory, only copying .md files (skip JSON/JSONL) */
function copyDirRecursive(src: string, dest: string): void {
	fs.mkdirSync(dest, { recursive: true });

	const entries = fs.readdirSync(src, { withFileTypes: true });
	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDirRecursive(srcPath, destPath);
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/** Copy .md files from the root of src to dest (non-recursive) */
function copyMarkdownFiles(src: string, dest: string): void {
	const entries = fs.readdirSync(src, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isFile() && entry.name.endsWith(".md")) {
			fs.mkdirSync(dest, { recursive: true });
			fs.copyFileSync(path.join(src, entry.name), path.join(dest, entry.name));
		}
	}
}

// ---------------------------------------------------------------------------
// Execute Migration (state construction + artifact copy)
// ---------------------------------------------------------------------------

function executeMigration(
	projectDir: string,
	cwd: string,
	validatedAnswers: Record<string, unknown>,
): MigrationResult {
	// Step 1: Rename .project/ → .project-old/
	const projectOldDir = renameProjectDir(projectDir);

	// Step 2: Build state tree
	const newState = buildMigrationState(validatedAnswers);

	// Step 3: Guard — project.json must not exist (zero state)
	// After rename, projectDir should not exist. commitState will create it.

	// Step 4: Commit state (creates .project/ from scratch)
	try {
		commitState(projectDir, ZERO_STATE, newState);
	} catch (err) {
		// Preserve .migration-in-progress.json so user can retry
		// Error message instructs manual recovery
		throw new GoodplanError(
			"DATA_WRITE_ERROR",
			`Migration state construction failed after renaming .project/ to .project-old/. ` +
				`To recover: rename ${projectOldDir} back to ${projectDir} and retry. ` +
				`The .migration-in-progress.json file has been preserved for retry.`,
			{ projectDir, projectOldDir },
			err,
		);
	}

	// Step 5: Copy markdown artifacts from old to new
	try {
		copyMigrationArtifacts(projectDir, projectOldDir, validatedAnswers);
	} catch (err) {
		// Non-fatal for the migration itself — state is committed
		// Log but don't fail the migration
		process.stderr.write(
			`[goodplan] Warning: some markdown artifacts may not have been copied: ${String(err)}\n`,
		);
	}

	// Step 6: Clean up migration state file
	const migrationFile = migrationStatePath(cwd);
	try {
		fs.unlinkSync(migrationFile);
	} catch {
		// Ignore — file may not exist or may have been cleaned up
	}

	// Step 7: Build summary
	const summary = buildStateSummary(validatedAnswers);

	return {
		status: "complete",
		summary: {
			projectName: summary.projectName,
			epicCount: summary.totalEpics,
			questCount: summary.totalQuests,
			sliceCount: summary.totalSlices,
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
// Confirmation Round Generation
// ---------------------------------------------------------------------------

interface StateSummary {
	readonly projectName: string;
	readonly projectGoal: string;
	readonly epics: ReadonlyArray<{
		readonly name: string;
		readonly status: string;
		readonly sliceCount: number;
		readonly slices: ReadonlyArray<{ readonly name: string; readonly status: string }>;
	}>;
	readonly quests: ReadonlyArray<{
		readonly name: string;
		readonly status: string;
	}>;
	readonly totalEpics: number;
	readonly totalQuests: number;
	readonly totalSlices: number;
}

function buildStateSummary(answers: Record<string, unknown>): StateSummary {
	const project = answers[QUESTION_IDS.PROJECT_INFO] as { name: string; goal: string };
	const epicInventory =
		(answers[QUESTION_IDS.EPIC_INVENTORY] as Array<{ name: string; status: string }>) ?? [];
	const questInventory =
		(answers[QUESTION_IDS.QUEST_INVENTORY] as Array<{ name: string; status: string }>) ?? [];

	let totalSlices = 0;
	const epics = epicInventory.map((epic) => {
		const detailKey = epicDetailQuestionId(epic.name);
		const detail = answers[detailKey] as EpicDetailResponse | undefined;
		const slices = detail?.slices ?? [];
		totalSlices += slices.length;
		return {
			name: epic.name,
			status: epic.status,
			sliceCount: slices.length,
			slices: slices.map((s) => ({ name: s.name, status: s.status })),
		};
	});

	const quests = questInventory.map((q) => ({ name: q.name, status: q.status }));

	return {
		projectName: project.name,
		projectGoal: project.goal,
		epics,
		quests,
		totalEpics: epics.length,
		totalQuests: quests.length,
		totalSlices,
	};
}

function generateConfirmationRound(answers: Record<string, unknown>, round = 3): MigrationRound {
	const summary = buildStateSummary(answers);

	const summaryLines: string[] = [
		`Project: ${summary.projectName}`,
		`Goal: ${summary.projectGoal}`,
		"",
		`Epics (${String(summary.totalEpics)}):`,
	];
	for (const epic of summary.epics) {
		summaryLines.push(`  - ${epic.name} [${epic.status}] (${String(epic.sliceCount)} slices)`);
		for (const slice of epic.slices) {
			summaryLines.push(`    - ${slice.name} [${slice.status}]`);
		}
	}
	summaryLines.push("");
	summaryLines.push(`Quests (${String(summary.totalQuests)}):`);
	if (summary.quests.length === 0) {
		summaryLines.push("  (none)");
	} else {
		for (const quest of summary.quests) {
			summaryLines.push(`  - ${quest.name} [${quest.status}]`);
		}
	}
	summaryLines.push("");
	summaryLines.push(
		`Totals: ${String(summary.totalEpics)} epics, ${String(summary.totalQuests)} quests, ${String(summary.totalSlices)} slices`,
	);

	const hint = summaryLines.join("\n");

	return {
		round,
		questions: [
			{
				id: QUESTION_IDS.CONFIRMATION,
				question: "Review the migration summary below and confirm or request corrections.",
				hint,
				responseSchema: z.toJSONSchema(confirmationResponseSchema, {
					unrepresentable: "any",
				}),
			},
		],
	};
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

	if (existingState === null) {
		throw new GoodplanError(
			"VALIDATION_MIGRATION_INVALID",
			`No migration state found for round ${String(response.round)}`,
		);
	}

	if (response.round === 2) {
		return handleRound2(response.answers, existingState, projectDir, cwd);
	}

	if (response.round >= 3) {
		return handleConfirmationOrCorrection(response.answers, existingState, projectDir, cwd);
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

	// Generate round 2 questions
	const round2 = generateEpicDetailQuestions(validated);

	if (round2.questions.length === 0) {
		// No epics to detail — skip straight to confirmation
		const state: MigrationState = {
			status: "confirming",
			round: 3,
			answers: validated,
			correctionRound: 0,
		};
		writeMigrationState(cwd, state);
		return questionsResult(generateConfirmationRound(validated));
	}

	// Write migration state for round 2
	const state: MigrationState = {
		status: "in-progress",
		round: 2,
		answers: validated,
		correctionRound: 0,
	};
	writeMigrationState(cwd, state);

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

	// Update state — advance to confirmation round
	const newState: MigrationState = {
		status: "confirming",
		round: 3,
		answers: validated,
		correctionRound: 0,
	};
	writeMigrationState(cwd, newState);

	return questionsResult(generateConfirmationRound(validated));
}

// ---------------------------------------------------------------------------
// Confirmation / Correction Handler
// ---------------------------------------------------------------------------

function handleConfirmationOrCorrection(
	answers: readonly MigrationAnswer[],
	existingState: MigrationState,
	projectDir: string,
	cwd: string,
): MigrationResult {
	// Determine if this is a confirmation answer or a correction re-answer
	const confirmationAnswer = answers.find((a) => a.id === QUESTION_IDS.CONFIRMATION);

	if (confirmationAnswer !== undefined) {
		// This is a confirmation round response
		return handleConfirmation(confirmationAnswer, existingState, projectDir, cwd);
	}

	// This is a correction re-answer — validate and merge back
	return handleCorrectionAnswers(answers, existingState, projectDir, cwd);
}

function handleConfirmation(
	answer: MigrationAnswer,
	existingState: MigrationState,
	projectDir: string,
	cwd: string,
): MigrationResult {
	// Validate against confirmation schema
	const result = validateAnswer(answer, confirmationResponseSchema);
	const data = result.data as ConfirmationResponse;

	if (data.approved) {
		// Migration approved — construct state, rename .project/, copy artifacts
		return executeMigration(projectDir, cwd, existingState.answers);
	}

	// Rejected — check circuit breaker
	const nextCorrectionRound = existingState.correctionRound + 1;
	if (nextCorrectionRound > MAX_CORRECTION_ROUNDS) {
		throw new GoodplanError(
			"VALIDATION_MIGRATION_CORRECTION_LIMIT",
			`Exceeded maximum correction rounds (${String(MAX_CORRECTION_ROUNDS)}). Migration cannot proceed.`,
			{
				correctionRound: nextCorrectionRound,
				answers: existingState.answers,
			},
		);
	}

	// Validate reAnswerIds exist in known question IDs
	const knownIds = collectKnownQuestionIds(existingState.answers);
	const invalidIds = data.reAnswerIds.filter((id) => !knownIds.has(id));
	if (invalidIds.length > 0) {
		throw new GoodplanError(
			"VALIDATION_MIGRATION_INVALID",
			"Invalid reAnswerIds — these question IDs were not found in previous rounds",
			{ invalidIds },
		);
	}

	// Update state for correction round
	const correctionState: MigrationState = {
		status: "confirming",
		round: existingState.round + 1,
		answers: existingState.answers,
		correctionRound: nextCorrectionRound,
	};
	writeMigrationState(cwd, correctionState);

	// Re-emit only the requested questions
	return questionsResult(
		regenerateQuestions(data.reAnswerIds, existingState.answers, correctionState.round),
	);
}

function handleCorrectionAnswers(
	answers: readonly MigrationAnswer[],
	existingState: MigrationState,
	projectDir: string,
	cwd: string,
): MigrationResult {
	const updatedAnswers: Record<string, unknown> = { ...existingState.answers };
	const errors: string[] = [];

	for (const answer of answers) {
		// Determine which schema to validate against based on the question ID
		const schema = schemaForQuestionId(answer.id);
		if (schema === undefined) {
			errors.push(`Unknown question ID for correction: "${answer.id}"`);
			continue;
		}

		try {
			const result = validateAnswer(answer, schema);
			updatedAnswers[answer.id] = result.data;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`Answer "${answer.id}" failed validation: ${msg}`);
		}
	}

	if (errors.length > 0) {
		throw new GoodplanError("VALIDATION_MIGRATION_INVALID", "Invalid correction answers", {
			errors,
		});
	}

	// Validate sourcePaths for any correction answers
	const sourcePathErrors: string[] = [];
	for (const answer of answers) {
		validateSourcePathsForAnswer(
			answer.id,
			updatedAnswers[answer.id],
			projectDir,
			sourcePathErrors,
		);
	}

	if (sourcePathErrors.length > 0) {
		throw new GoodplanError(
			"VALIDATION_MIGRATION_INVALID",
			"Invalid source paths in correction answers",
			{ errors: sourcePathErrors },
		);
	}

	// Merge corrections and return to confirmation
	const newState: MigrationState = {
		status: "confirming",
		round: existingState.round + 1,
		answers: updatedAnswers,
		correctionRound: existingState.correctionRound,
	};
	writeMigrationState(cwd, newState);

	return questionsResult(generateConfirmationRound(updatedAnswers, newState.round));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all known question IDs from accumulated answers */
function collectKnownQuestionIds(answers: Record<string, unknown>): Set<string> {
	return new Set(Object.keys(answers));
}

/** Determine the Zod schema for a given question ID */
function schemaForQuestionId(questionId: string): z.ZodType | undefined {
	if (questionId === QUESTION_IDS.PROJECT_INFO) {
		return inventoryResponseSchema.shape.project;
	}
	if (questionId === QUESTION_IDS.EPIC_INVENTORY) {
		return inventoryResponseSchema.shape.epics;
	}
	if (questionId === QUESTION_IDS.QUEST_INVENTORY) {
		return inventoryResponseSchema.shape.quests;
	}
	if (questionId.startsWith("epic-details-")) {
		return epicDetailResponseSchema;
	}
	return undefined;
}

/** Validate sourcePaths in a single answer */
function validateSourcePathsForAnswer(
	questionId: string,
	data: unknown,
	projectDir: string,
	errors: string[],
): void {
	if (questionId === QUESTION_IDS.EPIC_INVENTORY) {
		const epics = data as Array<{ sourcePath: string }> | undefined;
		if (epics) {
			for (const epic of epics) {
				if (validateSourcePath(epic.sourcePath, projectDir) === null) {
					errors.push(`Epic sourcePath does not exist: ${epic.sourcePath}`);
				}
			}
		}
	} else if (questionId === QUESTION_IDS.QUEST_INVENTORY) {
		const quests = data as Array<{ sourcePath: string }> | undefined;
		if (quests) {
			for (const quest of quests) {
				if (validateSourcePath(quest.sourcePath, projectDir) === null) {
					errors.push(`Quest sourcePath does not exist: ${quest.sourcePath}`);
				}
			}
		}
	} else if (questionId.startsWith("epic-details-")) {
		const detail = data as { slices?: Array<{ sourcePath: string }> } | undefined;
		if (detail?.slices) {
			for (const slice of detail.slices) {
				if (validateSourcePath(slice.sourcePath, projectDir) === null) {
					errors.push(`Slice sourcePath does not exist: ${slice.sourcePath} (in ${questionId})`);
				}
			}
		}
	}
}

/** Regenerate specific questions by ID for correction rounds */
function regenerateQuestions(
	questionIds: readonly string[],
	answers: Record<string, unknown>,
	round: number,
): MigrationRound {
	const questions: MigrationQuestion[] = [];
	const allRound1 = generateInventoryQuestions();
	const round2 = generateEpicDetailQuestions(answers);

	for (const id of questionIds) {
		const r1q = allRound1.questions.find((q) => q.id === id);
		if (r1q !== undefined) {
			questions.push(r1q);
			continue;
		}
		const r2q = round2.questions.find((q) => q.id === id);
		if (r2q !== undefined) {
			questions.push(r2q);
		}
	}

	return { round, questions };
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

	// Round 3+: confirmation or correction
	if (state.status === "confirming") {
		return questionsResult(generateConfirmationRound(state.answers, state.round));
	}

	// Fallback — shouldn't happen but be safe
	return questionsResult(generateConfirmationRound(state.answers, state.round));
}
