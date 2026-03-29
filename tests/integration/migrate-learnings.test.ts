import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
	QUESTION_IDS,
	epicDetailQuestionId,
} from "../../src/commands/global/migrate/schemas.js";
import type {
	ConfirmationResponse,
	EpicDetailResponse,
	InventoryResponse,
} from "../../src/commands/global/migrate/schemas.js";
import { parseLearningsMd, rpcMigrate } from "../../src/core/rpc/migrate.js";
import { learningEntrySchemaNew } from "../../src/schemas/records/learning.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temp dir, copy fixture into it, run callback, clean up. */
async function withLearningsMigrationFixture<T>(
	fn: (tmpDir: string, projectDir: string) => T | Promise<T>,
): Promise<T> {
	const fixtureDir = path.resolve(import.meta.dirname, "../fixtures/learnings-migration");
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-learnings-migrate-"));

	try {
		fs.cpSync(fixtureDir, tmpDir, { recursive: true });
		const projectDir = path.join(tmpDir, ".project");
		return await fn(tmpDir, projectDir);
	} finally {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
}

/** Run the full 3-round migration on the learnings fixture. */
async function runFullMigration(
	tmpDir: string,
	projectDir: string,
): Promise<void> {
	// Round 1: get inventory questions
	await rpcMigrate(projectDir, null, tmpDir);

	// Round 1: submit inventory answers
	const r2 = await rpcMigrate(
		projectDir,
		{
			round: 1,
			answers: [
				{ id: QUESTION_IDS.PROJECT_INFO, data: FIXTURE_PROJECT },
				{ id: QUESTION_IDS.EPIC_INVENTORY, data: FIXTURE_EPICS },
				{ id: QUESTION_IDS.QUEST_INVENTORY, data: FIXTURE_QUESTS },
			],
		},
		tmpDir,
	);
	if (r2.status !== "questions") throw new Error("expected questions for round 2");

	// Round 2: submit epic detail answers
	const r3 = await rpcMigrate(
		projectDir,
		{
			round: 2,
			answers: [
				{
					id: epicDetailQuestionId("test-epic"),
					data: FIXTURE_EPIC_DETAIL,
				},
			],
		},
		tmpDir,
	);
	if (r3.status !== "questions") throw new Error("expected questions for round 3");

	// Round 3: confirm migration
	const confirmation: ConfirmationResponse = {
		approved: true,
		notes: "Approve",
	};
	const r4 = await rpcMigrate(
		projectDir,
		{
			round: 3,
			answers: [{ id: QUESTION_IDS.CONFIRMATION, data: confirmation }],
		},
		tmpDir,
	);
	if (r4.status !== "complete") throw new Error("expected complete");
}

// Fixture inventory answers matching the learnings-migration fixture
const FIXTURE_PROJECT: InventoryResponse["project"] = {
	name: "learnings-test",
	goal: "A test project for learnings migration",
};

const FIXTURE_EPICS: InventoryResponse["epics"] = [
	{
		name: "test-epic",
		goal: "Build the core feature set",
		status: "completed",
		sourcePath: "epics/~~archived~~01_test-epic",
	},
];

const FIXTURE_QUESTS: InventoryResponse["quests"] = [
	{
		name: "fix-typos",
		goal: "Fix typos across the documentation",
		status: "created",
		sourcePath: "side-quests/__active__fix-typos",
	},
	{
		name: "cleanup-deps",
		goal: "Remove unused dependencies",
		status: "completed",
		sourcePath: "side-quests/~~archived~~cleanup-deps",
	},
];

const FIXTURE_EPIC_DETAIL: EpicDetailResponse = {
	slices: [
		{
			name: "first-slice",
			goal: "Implement the first feature",
			status: "completed",
			sourcePath: "epics/~~archived~~01_test-epic/slices/01_first-slice",
		},
		{
			name: "second-slice",
			goal: "Implement the second feature",
			status: "completed",
			sourcePath: "epics/~~archived~~01_test-epic/slices/02_second-slice",
		},
	],
	sliceSequence: ["first-slice", "second-slice"],
	hasArchitecture: true,
	activatedDate: "2025-01-15T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// parseLearningsMd unit tests
// ---------------------------------------------------------------------------

describe("parseLearningsMd", () => {
	it("parses entries with ## headings, _Source:_, and detail body", () => {
		const content = `# Learnings

Accumulated across all completed slices.

## First learning summary
_Source: 01-slice_

This is the detail for the first learning.
It spans multiple lines.

## Second learning summary
_Source: epic-name (epic)_

Second learning detail.
`;

		const entries = parseLearningsMd(content);
		expect(entries).toHaveLength(2);

		expect(entries[0]!.summary).toBe("First learning summary");
		expect(entries[0]!.source).toBe("01-slice");
		expect(entries[0]!.detail).toContain("This is the detail for the first learning.");
		expect(entries[0]!.detail).toContain("It spans multiple lines.");

		expect(entries[1]!.summary).toBe("Second learning summary");
		expect(entries[1]!.source).toBe("epic-name (epic)");
		expect(entries[1]!.detail).toBe("Second learning detail.");
	});

	it("handles source with suffixes like (updated by <slice>)", () => {
		const content = `# Learnings

## Some learning
_Source: 03-core (updated by 05-cleanup)_

Detail text here.
`;

		const entries = parseLearningsMd(content);
		expect(entries).toHaveLength(1);
		expect(entries[0]!.source).toBe("03-core (updated by 05-cleanup)");
	});

	it("returns empty array for empty content", () => {
		expect(parseLearningsMd("")).toHaveLength(0);
		expect(parseLearningsMd("# Learnings\n\nNo entries yet.")).toHaveLength(0);
	});

	it("skips entries without detail body", () => {
		const content = `# Learnings

## Empty entry
_Source: test_

## Entry with body
_Source: test2_

Actual detail here.
`;

		const entries = parseLearningsMd(content);
		expect(entries).toHaveLength(1);
		expect(entries[0]!.summary).toBe("Entry with body");
	});
});

// ---------------------------------------------------------------------------
// Integration: learnings migration during full migrate flow
// ---------------------------------------------------------------------------

describe("migrate: learnings conversion", () => {
	it("converts monolithic learnings.md to per-file learnings/ at project level", async () => {
		await withLearningsMigrationFixture(async (tmpDir, projectDir) => {
			await runFullMigration(tmpDir, projectDir);

			// Monolithic learnings.md should be removed
			expect(fs.existsSync(path.join(projectDir, "learnings.md"))).toBe(false);

			// learnings/ directory should exist with per-learning .md files
			const learningsDir = path.join(projectDir, "learnings");
			expect(fs.existsSync(learningsDir)).toBe(true);
			const learningFiles = fs.readdirSync(learningsDir).filter((f) => f.endsWith(".md"));
			// 3 from learnings.md parsing + 2 from learnings.jsonl inline detail conversion = 5
			expect(learningFiles.length).toBe(5);

			// Verify at least one known file exists
			const fileNames = learningFiles.map((f) => f.replace(".md", ""));
			expect(
				fileNames.some((f) => f.includes("schema-registry")),
			).toBe(true);
		});
	});

	it("converts inline detail entries in JSONL to file-based entries", async () => {
		await withLearningsMigrationFixture(async (tmpDir, projectDir) => {
			await runFullMigration(tmpDir, projectDir);

			// Read the updated learnings.jsonl
			const jsonlPath = path.join(projectDir, "learnings.jsonl");
			expect(fs.existsSync(jsonlPath)).toBe(true);
			const jsonlContent = fs.readFileSync(jsonlPath, "utf-8").trim();
			const entries = jsonlContent.split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);

			// All entries should have `file` field and no `detail` field
			for (const entry of entries) {
				expect(entry).toHaveProperty("file");
				expect(entry).not.toHaveProperty("detail");
				expect(typeof entry.file).toBe("string");
				expect((entry.file as string).startsWith("learnings/")).toBe(true);
			}

			// Total entries: 3 from learnings.md + 2 from original learnings.jsonl
			expect(entries.length).toBe(5);
		});
	});

	it("all migrated JSONL entries pass the tightened schema", async () => {
		await withLearningsMigrationFixture(async (tmpDir, projectDir) => {
			await runFullMigration(tmpDir, projectDir);

			// Check all scopes
			const jsonlFiles = [
				path.join(projectDir, "learnings.jsonl"),
			];

			for (const jsonlPath of jsonlFiles) {
				if (!fs.existsSync(jsonlPath)) continue;
				const content = fs.readFileSync(jsonlPath, "utf-8").trim();
				if (content.length === 0) continue;

				const lines = content.split("\n");
				for (const line of lines) {
					const parsed = JSON.parse(line) as unknown;
					const result = learningEntrySchemaNew.safeParse(parsed);
					expect(result.success).toBe(true);
				}
			}
		});
	});

	it("preserves completion/learnings.md files untouched", async () => {
		await withLearningsMigrationFixture(async (tmpDir, projectDir) => {
			await runFullMigration(tmpDir, projectDir);

			// Slice completion/learnings.md should be preserved (the fixture has it under the slice, not the epic)
			const sliceCompletionLearnings = path.join(
				projectDir,
				"epics",
				"test-epic",
				"slices",
				"first-slice",
				"completion",
				"learnings.md",
			);
			expect(fs.existsSync(sliceCompletionLearnings)).toBe(true);
			const sliceContent = fs.readFileSync(sliceCompletionLearnings, "utf-8");
			expect(sliceContent).toContain("Slice-level learning about testing");

			// Quest completion/learnings.md should be preserved
			const questCompletionLearnings = path.join(
				projectDir,
				"quests",
				"cleanup-deps",
				"completion",
				"learnings.md",
			);
			expect(fs.existsSync(questCompletionLearnings)).toBe(true);
			const questContent = fs.readFileSync(questCompletionLearnings, "utf-8");
			expect(questContent).toContain("Completion learnings");
		});
	});

	it("re-migration preserves existing learnings/ directories", async () => {
		await withLearningsMigrationFixture(async (tmpDir, projectDir) => {
			// First migration
			await runFullMigration(tmpDir, projectDir);

			// Verify learnings dir was created
			const learningsDir = path.join(projectDir, "learnings");
			expect(fs.existsSync(learningsDir)).toBe(true);
			const firstRunFiles = fs.readdirSync(learningsDir).sort();

			// Now re-migrate: copy the migrated project as a new fixture
			// Re-migration uses the NEW directory structure (epics/test-epic, not epics/~~archived~~01_test-epic)
			const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-learnings-remigrate-"));
			try {
				fs.cpSync(tmpDir, tmpDir2, { recursive: true });
				const projectDir2 = path.join(tmpDir2, ".project");

				// Remove migration state file and old backups from first migration
				const migFile = path.join(tmpDir2, ".migration-in-progress.json");
				if (fs.existsSync(migFile)) fs.unlinkSync(migFile);
				for (const entry of fs.readdirSync(tmpDir2)) {
					if (entry.startsWith(".project-old-")) {
						fs.rmSync(path.join(tmpDir2, entry), { recursive: true, force: true });
					}
				}

				// Re-migration uses the NEW directory structure as source paths
				const REMIGRATION_EPICS: InventoryResponse["epics"] = [
					{
						name: "test-epic",
						goal: "Build the core feature set",
						status: "completed",
						sourcePath: "epics/test-epic",
					},
				];
				const REMIGRATION_QUESTS: InventoryResponse["quests"] = [
					{
						name: "fix-typos",
						goal: "Fix typos across the documentation",
						status: "created",
						sourcePath: "quests/fix-typos",
					},
					{
						name: "cleanup-deps",
						goal: "Remove unused dependencies",
						status: "completed",
						sourcePath: "quests/cleanup-deps",
					},
				];
				const REMIGRATION_EPIC_DETAIL: EpicDetailResponse = {
					slices: [
						{
							name: "first-slice",
							goal: "Implement the first feature",
							status: "completed",
							sourcePath: "epics/test-epic/slices/first-slice",
						},
						{
							name: "second-slice",
							goal: "Implement the second feature",
							status: "completed",
							sourcePath: "epics/test-epic/slices/second-slice",
						},
					],
					sliceSequence: ["first-slice", "second-slice"],
					hasArchitecture: true,
					activatedDate: "2025-01-15T00:00:00.000Z",
				};

				// Run re-migration
				await rpcMigrate(projectDir2, null, tmpDir2);
				await rpcMigrate(
					projectDir2,
					{
						round: 1,
						answers: [
							{ id: QUESTION_IDS.PROJECT_INFO, data: FIXTURE_PROJECT },
							{ id: QUESTION_IDS.EPIC_INVENTORY, data: REMIGRATION_EPICS },
							{ id: QUESTION_IDS.QUEST_INVENTORY, data: REMIGRATION_QUESTS },
						],
					},
					tmpDir2,
				);
				await rpcMigrate(
					projectDir2,
					{
						round: 2,
						answers: [
							{
								id: epicDetailQuestionId("test-epic"),
								data: REMIGRATION_EPIC_DETAIL,
							},
						],
					},
					tmpDir2,
				);
				const confirmation: ConfirmationResponse = { approved: true, notes: "Re-approve" };
				await rpcMigrate(
					projectDir2,
					{
						round: 3,
						answers: [{ id: QUESTION_IDS.CONFIRMATION, data: confirmation }],
					},
					tmpDir2,
				);

				// learnings/ should still exist with the same files (already migrated, no learnings.md to re-convert)
				const learningsDir2 = path.join(projectDir2, "learnings");
				expect(fs.existsSync(learningsDir2)).toBe(true);
				const secondRunFiles = fs.readdirSync(learningsDir2).sort();

				// Same files should exist — re-migration is idempotent
				expect(secondRunFiles).toEqual(firstRunFiles);
			} finally {
				fs.rmSync(tmpDir2, { recursive: true, force: true });
			}
		});
	});

	it("learnings.md is no longer copied as a project-level markdown file", async () => {
		await withLearningsMigrationFixture(async (tmpDir, projectDir) => {
			await runFullMigration(tmpDir, projectDir);

			// The monolithic learnings.md should NOT exist in the migrated .project/
			expect(fs.existsSync(path.join(projectDir, "learnings.md"))).toBe(false);

			// But idea.md and conventions.md should still be there
			expect(fs.existsSync(path.join(projectDir, "idea.md"))).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "conventions.md"))).toBe(true);
		});
	});
});
