import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { QUESTION_IDS, epicDetailQuestionId } from "../../src/commands/global/migrate/schemas.js";
import type {
	ConfirmationResponse,
	EpicDetailResponse,
	InventoryResponse,
} from "../../src/commands/global/migrate/schemas.js";
import { buildMigrationState, rpcMigrate } from "../../src/core/rpc/migrate.js";
import { GoodplanError } from "../../src/util/errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temp dir, copy fixture into it, run callback, clean up. */
async function withMigrateFixture<T>(
	fn: (tmpDir: string, projectDir: string) => T | Promise<T>,
): Promise<T> {
	const fixtureDir = path.resolve(import.meta.dirname, "../fixtures/pre-cli-project");
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-migrate-test-"));

	try {
		fs.cpSync(fixtureDir, tmpDir, { recursive: true });
		const projectDir = path.join(tmpDir, ".project");
		return await fn(tmpDir, projectDir);
	} finally {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
}

// Fixture inventory answers matching the pre-cli-project fixture
const FIXTURE_PROJECT: InventoryResponse["project"] = {
	name: "test-project",
	goal: "A test project for migration",
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
// Integration Tests: Full Migration Flow
// ---------------------------------------------------------------------------

describe("migrate: full flow", () => {
	it("completes a 3-round migration with epics, slices, and quests", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			// Round 1: get inventory questions (no stdin)
			const r1 = await rpcMigrate(projectDir, null, tmpDir);
			expect(r1.status).toBe("questions");
			if (r1.status !== "questions") throw new Error("expected questions");
			expect(r1.round.round).toBe(1);
			expect(r1.round.questions).toHaveLength(3);

			const questionIds = r1.round.questions.map((q) => q.id);
			expect(questionIds).toContain(QUESTION_IDS.PROJECT_INFO);
			expect(questionIds).toContain(QUESTION_IDS.EPIC_INVENTORY);
			expect(questionIds).toContain(QUESTION_IDS.QUEST_INVENTORY);

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
			expect(r2.status).toBe("questions");
			if (r2.status !== "questions") throw new Error("expected questions");
			expect(r2.round.round).toBe(2);
			// One question per epic
			expect(r2.round.questions).toHaveLength(1);
			expect(r2.round.questions[0]?.id).toBe(epicDetailQuestionId("test-epic"));

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
			expect(r3.status).toBe("questions");
			if (r3.status !== "questions") throw new Error("expected questions");
			expect(r3.round.round).toBe(3);
			expect(r3.round.questions[0]?.id).toBe(QUESTION_IDS.CONFIRMATION);

			// Round 3: confirm migration
			const confirmation: ConfirmationResponse = {
				approved: true,
				notes: "Looks good",
			};
			const r4 = await rpcMigrate(
				projectDir,
				{
					round: 3,
					answers: [{ id: QUESTION_IDS.CONFIRMATION, data: confirmation }],
				},
				tmpDir,
			);
			expect(r4.status).toBe("complete");
			if (r4.status !== "complete") throw new Error("expected complete");
			expect(r4.summary.projectName).toBe("test-project");
			expect(r4.summary.epicCount).toBe(1);
			expect(r4.summary.questCount).toBe(2);
			expect(r4.summary.sliceCount).toBe(2);

			// ── Post-migration assertions ──────────────────────────
			// Output always goes to .goodplan/ regardless of input path
			const outputDir = path.join(tmpDir, ".goodplan");

			// project.json exists in .goodplan/
			const projectJsonPath = path.join(outputDir, "project.json");
			expect(fs.existsSync(projectJsonPath)).toBe(true);
			const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, "utf-8")) as Record<
				string,
				unknown
			>;
			expect(projectJson.name).toBe("test-project");
			expect(projectJson.activeEpic).toBeNull(); // no active epics
			expect(projectJson.activeQuest).toBeNull(); // fix-typos is "created", not active

			// Unified overview
			const overviewPath = path.join(outputDir, "overview.json");
			expect(fs.existsSync(overviewPath)).toBe(true);
			const overview = JSON.parse(fs.readFileSync(overviewPath, "utf-8")) as {
				epics: Array<{ name: string; status: string; slices?: Array<{ name: string }> }>;
				quests: Array<{ name: string; status: string }>;
				tasks: Array<unknown>;
			};
			expect(overview.epics).toHaveLength(1);
			expect(overview.epics[0]?.name).toBe("test-epic");
			expect(overview.epics[0]?.status).toBe("completed");

			// Slices nested under epic (no top-level slices/ directory)
			const epicSlicesDir = path.join(outputDir, "epics", "test-epic", "slices");
			expect(fs.existsSync(epicSlicesDir)).toBe(true);
			expect(fs.existsSync(path.join(epicSlicesDir, "first-slice", "slice.json"))).toBe(true);
			expect(fs.existsSync(path.join(epicSlicesDir, "second-slice", "slice.json"))).toBe(true);
			// Slice info embedded in epic overview
			expect(overview.epics[0]?.slices).toHaveLength(2);
			const sliceNames = (overview.epics[0]?.slices ?? []).map((s) => s.name);
			expect(sliceNames).toContain("first-slice");
			expect(sliceNames).toContain("second-slice");

			// Quest overview
			expect(overview.quests).toHaveLength(2);
			const questNames = overview.quests.map((q) => q.name);
			expect(questNames).toContain("fix-typos");
			expect(questNames).toContain("cleanup-deps");

			// Entity JSON files
			const epicJson = JSON.parse(
				fs.readFileSync(path.join(outputDir, "epics", "test-epic", "epic.json"), "utf-8"),
			) as Record<string, unknown>;
			expect(epicJson.status).toBe("completed");
			// sliceSequence removed from epicSchema — no longer in on-disk output

			const sliceJson = JSON.parse(
				fs.readFileSync(
					path.join(outputDir, "epics", "test-epic", "slices", "first-slice", "slice.json"),
					"utf-8",
				),
			) as Record<string, unknown>;
			expect(sliceJson.status).toBe("completed");
			expect(sliceJson.epic).toBe("test-epic");

			// Markdown artifacts preserved
			expect(fs.existsSync(path.join(outputDir, "idea.md"))).toBe(true);
			expect(fs.existsSync(path.join(outputDir, "conventions.md"))).toBe(true);
			const ideaContent = fs.readFileSync(path.join(outputDir, "idea.md"), "utf-8");
			expect(ideaContent).toContain("A test project");

			// Epic architecture markdown copied
			expect(
				fs.existsSync(path.join(outputDir, "epics", "test-epic", "architecture", "_overview.md")),
			).toBe(true);

			// Epic completion markdown copied
			expect(
				fs.existsSync(path.join(outputDir, "epics", "test-epic", "completion", "learnings.md")),
			).toBe(true);

			// .project-old-<timestamp>/ exists (renamed original)
			const backupDirs = fs.readdirSync(tmpDir).filter((d) => d.startsWith(".project-old-"));
			expect(backupDirs).toHaveLength(1);
			const projectOldDir = path.join(tmpDir, backupDirs[0]!);
			// Old fixture files still in backup
			expect(fs.existsSync(path.join(projectOldDir, "idea.md"))).toBe(true);
			expect(fs.existsSync(path.join(projectOldDir, "state.md"))).toBe(true);

			// .migration-in-progress.json cleaned up
			expect(fs.existsSync(path.join(tmpDir, ".migration-in-progress.json"))).toBe(false);

			// Activity log has migration entry
			const activityLog = fs.readFileSync(path.join(outputDir, "activity-log.jsonl"), "utf-8");
			expect(activityLog).toContain("migration");
		});
	});

	it("skips round 2 when no epics exist", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			// Round 1: no stdin
			await rpcMigrate(projectDir, null, tmpDir);

			// Round 1: submit with empty epics
			const r2 = await rpcMigrate(
				projectDir,
				{
					round: 1,
					answers: [
						{ id: QUESTION_IDS.PROJECT_INFO, data: FIXTURE_PROJECT },
						{ id: QUESTION_IDS.EPIC_INVENTORY, data: [] },
						{ id: QUESTION_IDS.QUEST_INVENTORY, data: FIXTURE_QUESTS },
					],
				},
				tmpDir,
			);
			// Should skip straight to confirmation (round 3), not round 2
			expect(r2.status).toBe("questions");
			if (r2.status !== "questions") throw new Error("expected questions");
			expect(r2.round.round).toBe(3);
			expect(r2.round.questions[0]?.id).toBe(QUESTION_IDS.CONFIRMATION);
		});
	});
});

// ---------------------------------------------------------------------------
// Error Cases
// ---------------------------------------------------------------------------

describe("migrate: error cases", () => {
	it("throws DATA_NO_PROJECT when project directory does not exist", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-migrate-no-project-"));
		try {
			const missingDir = path.join(tmpDir, ".project");
			await expect(rpcMigrate(missingDir, null, tmpDir)).rejects.toThrow(GoodplanError);

			try {
				await rpcMigrate(missingDir, null, tmpDir);
			} catch (err) {
				expect((err as GoodplanError).code).toBe("DATA_NO_PROJECT");
			}
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("throws DATA_NO_PROJECT when .goodplan/ directory does not exist", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-migrate-no-goodplan-"));
		try {
			const missingDir = path.join(tmpDir, ".goodplan");
			await expect(rpcMigrate(missingDir, null, tmpDir)).rejects.toThrow(GoodplanError);

			try {
				await rpcMigrate(missingDir, null, tmpDir);
			} catch (err) {
				expect((err as GoodplanError).code).toBe("DATA_NO_PROJECT");
			}
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("emits warning when project.json exists (re-migration)", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-migrate-already-init-"));
		try {
			const projectDir = path.join(tmpDir, ".project");
			fs.mkdirSync(projectDir, { recursive: true });
			fs.writeFileSync(path.join(projectDir, "project.json"), '{"name":"already-init"}');

			const result = await rpcMigrate(projectDir, null, tmpDir);
			expect(result.status).toBe("questions");
			if (result.status !== "questions") throw new Error("expected questions");
			expect(result.warning).toBe(
				"Project is already initialized. Re-migration will rebuild state from directory contents.",
			);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("throws VALIDATION_MIGRATION_INVALID for invalid source paths", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			await rpcMigrate(projectDir, null, tmpDir);

			await expect(
				rpcMigrate(
					projectDir,
					{
						round: 1,
						answers: [
							{ id: QUESTION_IDS.PROJECT_INFO, data: FIXTURE_PROJECT },
							{
								id: QUESTION_IDS.EPIC_INVENTORY,
								data: [
									{
										name: "ghost-epic",
										goal: "Does not exist",
										status: "completed",
										sourcePath: "epics/nonexistent-path",
									},
								],
							},
							{ id: QUESTION_IDS.QUEST_INVENTORY, data: [] },
						],
					},
					tmpDir,
				),
			).rejects.toThrow(GoodplanError);
		});
	});

	it("throws VALIDATION_MIGRATION_INVALID for wrong round number", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			await rpcMigrate(projectDir, null, tmpDir);

			await expect(
				rpcMigrate(
					projectDir,
					{
						round: 2,
						answers: [],
					},
					tmpDir,
				),
			).rejects.toThrow(GoodplanError);
		});
	});
});

// ---------------------------------------------------------------------------
// Unit Tests: buildMigrationState()
// ---------------------------------------------------------------------------

describe("buildMigrationState", () => {
	it("builds correct ProjectState from validated answers", () => {
		const answers: Record<string, unknown> = {
			[QUESTION_IDS.PROJECT_INFO]: { name: "my-project", goal: "Build things" },
			[QUESTION_IDS.EPIC_INVENTORY]: [
				{
					name: "epic-one",
					goal: "First epic",
					status: "completed",
					sourcePath: "epics/epic-one",
				},
			],
			[QUESTION_IDS.QUEST_INVENTORY]: [
				{
					name: "quest-one",
					goal: "Side quest",
					status: "created",
					sourcePath: "side-quests/quest-one",
				},
			],
			[epicDetailQuestionId("epic-one")]: {
				slices: [
					{
						name: "slice-a",
						goal: "First slice",
						status: "completed",
						sourcePath: "epics/epic-one/slices/slice-a",
					},
				],
				sliceSequence: ["slice-a"],
				hasArchitecture: true,
				activatedDate: "2025-06-01T00:00:00.000Z",
			} satisfies EpicDetailResponse,
		};

		const state = buildMigrationState(answers);

		expect(state.type).toBe("directory");

		// project.json
		const projectJson = state.contents["project.json"];
		expect(projectJson).toBeDefined();
		expect(projectJson?.type).toBe("json");
		if (projectJson?.type !== "json") throw new Error("expected json");
		const pj = projectJson.content as Record<string, unknown>;
		expect(pj.name).toBe("my-project");
		expect(pj.activeEpic).toBeNull(); // completed, not active
		expect(pj.activeQuest).toBeNull(); // created, not active

		// Unified overview
		const overviewEntry = state.contents["overview.json"];
		expect(overviewEntry).toBeDefined();
		if (overviewEntry?.type !== "json") throw new Error("expected json");
		const overviewContent = overviewEntry.content as {
			epics: unknown[];
			quests: unknown[];
			tasks: unknown[];
		};
		expect(overviewContent.epics).toHaveLength(1);

		// Epic entity
		const epicsDir = state.contents.epics;
		expect(epicsDir).toBeDefined();
		if (epicsDir?.type !== "directory") throw new Error("expected dir");
		const epicDir = epicsDir.contents["epic-one"];
		expect(epicDir).toBeDefined();
		if (epicDir?.type !== "directory") throw new Error("expected dir");
		const epicJson = epicDir.contents["epic.json"];
		if (epicJson?.type !== "json") throw new Error("expected json");
		const ej = epicJson.content as Record<string, unknown>;
		expect(ej.status).toBe("completed");
		expect(ej.activated).toBe("2025-06-01T00:00:00.000Z");

		// Slices nested under epic (no top-level slices/ directory)
		const epicSlicesDir = epicDir.contents.slices;
		if (epicSlicesDir?.type !== "directory") throw new Error("expected dir");

		// Slice entity
		const sliceDir = epicSlicesDir.contents["slice-a"];
		if (sliceDir?.type !== "directory") throw new Error("expected dir");
		const sliceJson = sliceDir.contents["slice.json"];
		if (sliceJson?.type !== "json") throw new Error("expected json");
		const sj = sliceJson.content as Record<string, unknown>;
		expect(sj.status).toBe("completed");
		expect(sj.epic).toBe("epic-one");

		// Quests in unified overview
		expect(overviewContent.quests).toHaveLength(1);

		// Activity log
		const activityLog = state.contents["activity-log.jsonl"];
		expect(activityLog).toBeDefined();
		if (activityLog?.type !== "jsonl") throw new Error("expected jsonl");
		expect(activityLog.content).toHaveLength(1);
	});

	it("sets activeEpic when an epic has an active status", () => {
		const answers: Record<string, unknown> = {
			[QUESTION_IDS.PROJECT_INFO]: { name: "active-test", goal: "Test active" },
			[QUESTION_IDS.EPIC_INVENTORY]: [
				{
					name: "active-epic",
					goal: "Currently active",
					status: "activated",
					sourcePath: "epics/active-epic",
				},
			],
			[QUESTION_IDS.QUEST_INVENTORY]: [],
			[epicDetailQuestionId("active-epic")]: {
				slices: [
					{
						name: "wip-slice",
						goal: "Work in progress",
						status: "implementing",
						sourcePath: "epics/active-epic/slices/wip-slice",
					},
				],
				sliceSequence: ["wip-slice"],
				hasArchitecture: false,
				activatedDate: "2025-03-01T00:00:00.000Z",
			} satisfies EpicDetailResponse,
		};

		const state = buildMigrationState(answers);
		const pj = state.contents["project.json"];
		if (pj?.type !== "json") throw new Error("expected json");
		const content = pj.content as Record<string, unknown>;
		expect(content.activeEpic).toBe("active-epic");
		expect(content.activeSlice).toBe("wip-slice");
	});

	it("handles epic with zero slices", () => {
		const answers: Record<string, unknown> = {
			[QUESTION_IDS.PROJECT_INFO]: { name: "no-slices", goal: "Test" },
			[QUESTION_IDS.EPIC_INVENTORY]: [
				{
					name: "empty-epic",
					goal: "No slices yet",
					status: "created",
					sourcePath: "epics/empty-epic",
				},
			],
			[QUESTION_IDS.QUEST_INVENTORY]: [],
			[epicDetailQuestionId("empty-epic")]: {
				slices: [],
				sliceSequence: [],
				hasArchitecture: false,
				activatedDate: null,
			} satisfies EpicDetailResponse,
		};

		const state = buildMigrationState(answers);
		// Slices nested under epic — empty epic should have an empty slices directory
		const epicsDir = state.contents.epics;
		if (epicsDir?.type !== "directory") throw new Error("expected dir");
		const emptyEpicDir = epicsDir.contents["empty-epic"];
		if (emptyEpicDir?.type !== "directory") throw new Error("expected dir");
		const slicesDir = emptyEpicDir.contents.slices;
		if (slicesDir?.type !== "directory") throw new Error("expected dir");
		// No slice entities
		expect(Object.keys(slicesDir.contents)).toEqual([]);
	});

	it("handles quest-only project (no epics)", () => {
		const answers: Record<string, unknown> = {
			[QUESTION_IDS.PROJECT_INFO]: { name: "quest-only", goal: "Test" },
			[QUESTION_IDS.EPIC_INVENTORY]: [],
			[QUESTION_IDS.QUEST_INVENTORY]: [
				{
					name: "solo-quest",
					goal: "Only quest",
					status: "planning",
					sourcePath: "side-quests/solo-quest",
				},
			],
		};

		const state = buildMigrationState(answers);
		const pj = state.contents["project.json"];
		if (pj?.type !== "json") throw new Error("expected json");
		const content = pj.content as Record<string, unknown>;
		expect(content.activeEpic).toBeNull();
		expect(content.activeQuest).toBe("solo-quest"); // planning is active

		const questsDir = state.contents.quests;
		if (questsDir?.type !== "directory") throw new Error("expected dir");
		expect(questsDir.contents["solo-quest"]).toBeDefined();
	});

	it("throws when project-info is missing", () => {
		const answers: Record<string, unknown> = {
			[QUESTION_IDS.EPIC_INVENTORY]: [],
			[QUESTION_IDS.QUEST_INVENTORY]: [],
		};

		expect(() => buildMigrationState(answers)).toThrow("Missing project-info");
	});

	it("populates completed timestamp for terminal entities", () => {
		const answers: Record<string, unknown> = {
			[QUESTION_IDS.PROJECT_INFO]: { name: "term-test", goal: "Test" },
			[QUESTION_IDS.EPIC_INVENTORY]: [
				{
					name: "done-epic",
					goal: "Finished",
					status: "completed",
					sourcePath: "epics/done-epic",
				},
				{
					name: "wip-epic",
					goal: "In progress",
					status: "activated",
					sourcePath: "epics/wip-epic",
				},
			],
			[QUESTION_IDS.QUEST_INVENTORY]: [],
			[epicDetailQuestionId("done-epic")]: {
				slices: [],
				sliceSequence: [],
				hasArchitecture: false,
				activatedDate: null,
			} satisfies EpicDetailResponse,
			[epicDetailQuestionId("wip-epic")]: {
				slices: [],
				sliceSequence: [],
				hasArchitecture: false,
				activatedDate: "2025-01-01T00:00:00.000Z",
			} satisfies EpicDetailResponse,
		};

		const state = buildMigrationState(answers);
		const overviewEntry = state.contents["overview.json"];
		if (overviewEntry?.type !== "json") throw new Error("expected json");
		const epics = (
			overviewEntry.content as { epics: Array<{ name: string; completed: string | null }> }
		).epics;

		const doneEpic = epics.find((i) => i.name === "done-epic");
		expect(doneEpic?.completed).not.toBeNull();

		const wipEpic = epics.find((i) => i.name === "wip-epic");
		expect(wipEpic?.completed).toBeNull();
	});
});
