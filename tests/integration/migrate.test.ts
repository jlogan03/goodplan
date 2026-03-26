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
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-migrate-test-"));

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

			// project.json exists
			const projectJsonPath = path.join(projectDir, "project.json");
			expect(fs.existsSync(projectJsonPath)).toBe(true);
			const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, "utf-8")) as Record<
				string,
				unknown
			>;
			expect(projectJson.name).toBe("test-project");
			expect(projectJson.activeEpic).toBeNull(); // no active epics
			expect(projectJson.activeQuest).toBeNull(); // fix-typos is "created", not active

			// Epic overview
			const epicOverviewPath = path.join(projectDir, "epics", "overview.json");
			expect(fs.existsSync(epicOverviewPath)).toBe(true);
			const epicOverview = JSON.parse(fs.readFileSync(epicOverviewPath, "utf-8")) as {
				items: Array<{ name: string; status: string }>;
			};
			expect(epicOverview.items).toHaveLength(1);
			expect(epicOverview.items[0]?.name).toBe("test-epic");
			expect(epicOverview.items[0]?.status).toBe("completed");

			// Slice overview
			const sliceOverviewPath = path.join(projectDir, "slices", "overview.json");
			expect(fs.existsSync(sliceOverviewPath)).toBe(true);
			const sliceOverview = JSON.parse(fs.readFileSync(sliceOverviewPath, "utf-8")) as {
				items: Array<{ name: string; epic: string }>;
			};
			expect(sliceOverview.items).toHaveLength(2);
			const sliceNames = sliceOverview.items.map((s) => s.name);
			expect(sliceNames).toContain("first-slice");
			expect(sliceNames).toContain("second-slice");

			// Quest overview
			const questOverviewPath = path.join(projectDir, "quests", "overview.json");
			expect(fs.existsSync(questOverviewPath)).toBe(true);
			const questOverview = JSON.parse(fs.readFileSync(questOverviewPath, "utf-8")) as {
				items: Array<{ name: string; status: string }>;
			};
			expect(questOverview.items).toHaveLength(2);
			const questNames = questOverview.items.map((q) => q.name);
			expect(questNames).toContain("fix-typos");
			expect(questNames).toContain("cleanup-deps");

			// Entity JSON files
			const epicJson = JSON.parse(
				fs.readFileSync(path.join(projectDir, "epics", "test-epic", "epic.json"), "utf-8"),
			) as Record<string, unknown>;
			expect(epicJson.status).toBe("completed");
			expect(epicJson.sliceSequence).toEqual(["first-slice", "second-slice"]);

			const sliceJson = JSON.parse(
				fs.readFileSync(path.join(projectDir, "slices", "first-slice", "slice.json"), "utf-8"),
			) as Record<string, unknown>;
			expect(sliceJson.status).toBe("completed");
			expect(sliceJson.epic).toBe("test-epic");

			// Markdown artifacts preserved
			expect(fs.existsSync(path.join(projectDir, "idea.md"))).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "conventions.md"))).toBe(true);
			const ideaContent = fs.readFileSync(path.join(projectDir, "idea.md"), "utf-8");
			expect(ideaContent).toContain("A test project");

			// Epic architecture markdown copied
			expect(
				fs.existsSync(path.join(projectDir, "epics", "test-epic", "architecture", "_overview.md")),
			).toBe(true);

			// Epic completion markdown copied
			expect(
				fs.existsSync(path.join(projectDir, "epics", "test-epic", "completion", "learnings.md")),
			).toBe(true);

			// .project-old/ exists (renamed original)
			const projectOldDir = path.join(tmpDir, ".project-old");
			expect(fs.existsSync(projectOldDir)).toBe(true);
			// Old fixture files still in .project-old/
			expect(fs.existsSync(path.join(projectOldDir, "idea.md"))).toBe(true);
			expect(fs.existsSync(path.join(projectOldDir, "state.md"))).toBe(true);

			// .migration-in-progress.json cleaned up
			expect(fs.existsSync(path.join(tmpDir, ".migration-in-progress.json"))).toBe(false);

			// Activity log has migration entry
			const activityLog = fs.readFileSync(path.join(projectDir, "activity-log.jsonl"), "utf-8");
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
	it("throws DATA_NO_PROJECT when .project/ does not exist", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-migrate-no-project-"));
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

	it("throws STATE_ALREADY_INITIALIZED when project.json exists", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-migrate-already-init-"));
		try {
			const projectDir = path.join(tmpDir, ".project");
			fs.mkdirSync(projectDir, { recursive: true });
			fs.writeFileSync(path.join(projectDir, "project.json"), '{"name":"already-init"}');

			await expect(rpcMigrate(projectDir, null, tmpDir)).rejects.toThrow(GoodplanError);

			try {
				await rpcMigrate(projectDir, null, tmpDir);
			} catch (err) {
				expect((err as GoodplanError).code).toBe("STATE_ALREADY_INITIALIZED");
			}
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

		// Epics overview
		const epicsDir = state.contents.epics;
		expect(epicsDir).toBeDefined();
		if (epicsDir?.type !== "directory") throw new Error("expected dir");
		const epicOverview = epicsDir.contents["overview.json"];
		expect(epicOverview).toBeDefined();
		if (epicOverview?.type !== "json") throw new Error("expected json");
		const items = (epicOverview.content as { items: unknown[] }).items;
		expect(items).toHaveLength(1);

		// Epic entity
		const epicDir = epicsDir.contents["epic-one"];
		expect(epicDir).toBeDefined();
		if (epicDir?.type !== "directory") throw new Error("expected dir");
		const epicJson = epicDir.contents["epic.json"];
		if (epicJson?.type !== "json") throw new Error("expected json");
		const ej = epicJson.content as Record<string, unknown>;
		expect(ej.status).toBe("completed");
		expect(ej.sliceSequence).toEqual(["slice-a"]);
		expect(ej.activated).toBe("2025-06-01T00:00:00.000Z");

		// Slices overview
		const slicesDir = state.contents.slices;
		if (slicesDir?.type !== "directory") throw new Error("expected dir");
		const sliceOverview = slicesDir.contents["overview.json"];
		if (sliceOverview?.type !== "json") throw new Error("expected json");
		const sliceItems = (sliceOverview.content as { items: unknown[] }).items;
		expect(sliceItems).toHaveLength(1);

		// Slice entity
		const sliceDir = slicesDir.contents["slice-a"];
		if (sliceDir?.type !== "directory") throw new Error("expected dir");
		const sliceJson = sliceDir.contents["slice.json"];
		if (sliceJson?.type !== "json") throw new Error("expected json");
		const sj = sliceJson.content as Record<string, unknown>;
		expect(sj.status).toBe("completed");
		expect(sj.epic).toBe("epic-one");

		// Quests overview
		const questsDir = state.contents.quests;
		if (questsDir?.type !== "directory") throw new Error("expected dir");
		const questOverview = questsDir.contents["overview.json"];
		if (questOverview?.type !== "json") throw new Error("expected json");
		const questItems = (questOverview.content as { items: unknown[] }).items;
		expect(questItems).toHaveLength(1);

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
		const slicesDir = state.contents.slices;
		if (slicesDir?.type !== "directory") throw new Error("expected dir");
		// Only overview.json, no slice entities
		expect(Object.keys(slicesDir.contents)).toEqual(["overview.json"]);
		const overview = slicesDir.contents["overview.json"];
		if (overview?.type !== "json") throw new Error("expected json");
		expect((overview.content as { items: unknown[] }).items).toHaveLength(0);
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
		const epicsDir = state.contents.epics;
		if (epicsDir?.type !== "directory") throw new Error("expected dir");
		const overview = epicsDir.contents["overview.json"];
		if (overview?.type !== "json") throw new Error("expected json");
		const items = (overview.content as { items: Array<{ name: string; completed: string | null }> })
			.items;

		const doneEpic = items.find((i) => i.name === "done-epic");
		expect(doneEpic?.completed).not.toBeNull();

		const wipEpic = items.find((i) => i.name === "wip-epic");
		expect(wipEpic?.completed).toBeNull();
	});
});
