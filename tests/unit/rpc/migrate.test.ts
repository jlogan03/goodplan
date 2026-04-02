import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rpcMigrate } from "../../../src/core/rpc/migrate.js";
import { GoodplanError } from "../../../src/util/errors.js";

let tmpDir: string;
let projectDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-rpc-migrate-"));
	projectDir = path.join(tmpDir, ".project");
	fs.mkdirSync(projectDir, { recursive: true });
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupOldProject() {
	// Create old-format epic and quest directories
	const epicDir = path.join(projectDir, "epics", "__active__my-epic");
	fs.mkdirSync(epicDir, { recursive: true });

	const sliceDir = path.join(epicDir, "slices", "slice-one");
	fs.mkdirSync(sliceDir, { recursive: true });

	const questDir = path.join(projectDir, "side-quests", "__active__my-quest");
	fs.mkdirSync(questDir, { recursive: true });
}

function round1Answers() {
	return {
		round: 1,
		answers: [
			{
				id: "project-info",
				data: { name: "test-project", goal: "Test project goal" },
			},
			{
				id: "epic-inventory",
				data: [
					{
						name: "my-epic",
						goal: "Epic goal",
						status: "activated",
						sourcePath: "epics/__active__my-epic",
					},
				],
			},
			{
				id: "quest-inventory",
				data: [
					{
						name: "my-quest",
						goal: "Quest goal",
						status: "implementing",
						sourcePath: "side-quests/__active__my-quest",
					},
				],
			},
		],
	};
}

function round2Answers() {
	return {
		round: 2,
		answers: [
			{
				id: "epic-details-my-epic",
				data: {
					slices: [
						{
							name: "slice-one",
							goal: "Slice goal",
							status: "created",
							sourcePath: "epics/__active__my-epic/slices/slice-one",
						},
					],
					sliceSequence: ["slice-one"],
					hasArchitecture: false,
					activatedDate: null,
				},
			},
		],
	};
}

function readMigrationState() {
	const statePath = path.join(tmpDir, ".migration-in-progress.json");
	const raw = fs.readFileSync(statePath, "utf-8");
	return JSON.parse(raw) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("rpcMigrate — Round 2 answer validation", () => {
	it("validates Round 2 answers and returns confirmation round", async () => {
		setupOldProject();

		// Run round 1
		await rpcMigrate(projectDir, round1Answers(), tmpDir);

		// Run round 2
		const result = await rpcMigrate(projectDir, round2Answers(), tmpDir);

		expect(result.status).toBe("questions");
		if (result.status !== "questions") return;
		expect(result.round.round).toBe(3);
		expect(result.round.questions).toHaveLength(1);
		expect(result.round.questions[0]?.id).toBe("confirmation");
	});

	it("rejects Round 2 with missing answers", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);

		await expect(rpcMigrate(projectDir, { round: 2, answers: [] }, tmpDir)).rejects.toThrow(
			GoodplanError,
		);
	});
});

describe("rpcMigrate — Confirmation round", () => {
	it("returns complete on approved confirmation", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);
		await rpcMigrate(projectDir, round2Answers(), tmpDir);

		const result = await rpcMigrate(
			projectDir,
			{
				round: 3,
				answers: [
					{
						id: "confirmation",
						data: { approved: true, notes: "Looks good" },
					},
				],
			},
			tmpDir,
		);

		expect(result.status).toBe("complete");
		if (result.status !== "complete") return;
		expect(result.summary.projectName).toBe("test-project");
		expect(result.summary.epicCount).toBe(1);
		expect(result.summary.questCount).toBe(1);
		expect(result.summary.sliceCount).toBe(1);
	});

	it("includes state summary in confirmation hint", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);
		const r2Result = await rpcMigrate(projectDir, round2Answers(), tmpDir);

		if (r2Result.status !== "questions") throw new Error("expected questions");
		const hint = r2Result.round.questions[0]?.hint ?? "";
		expect(hint).toContain("test-project");
		expect(hint).toContain("my-epic");
		expect(hint).toContain("my-quest");
		expect(hint).toContain("slice-one");
	});

	it("executes migration on approval: creates state, renames project dir, cleans up", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);
		await rpcMigrate(projectDir, round2Answers(), tmpDir);
		const result = await rpcMigrate(
			projectDir,
			{
				round: 3,
				answers: [{ id: "confirmation", data: { approved: true, notes: "" } }],
			},
			tmpDir,
		);

		// Result should be complete with summary
		expect(result.status).toBe("complete");
		if (result.status === "complete") {
			expect(result.summary.projectName).toBe("test-project");
			expect(result.summary.epicCount).toBe(1);
			expect(result.summary.sliceCount).toBe(1);
			expect(result.summary.questCount).toBe(1);
		}

		// Output goes to .goodplan/ regardless of input path
		const outputDir = path.join(tmpDir, ".goodplan");

		// project.json should exist (state committed to .goodplan/)
		expect(fs.existsSync(path.join(outputDir, "project.json"))).toBe(true);

		// backup dir should exist (renamed from .project)
		const backupDirs = fs.readdirSync(tmpDir).filter((d) => d.startsWith(".project-old-"));
		expect(backupDirs).toHaveLength(1);

		// .migration-in-progress.json should be cleaned up
		expect(fs.existsSync(path.join(tmpDir, ".migration-in-progress.json"))).toBe(false);

		// Verify state structure
		const projectJson = JSON.parse(
			fs.readFileSync(path.join(outputDir, "project.json"), "utf-8"),
		) as Record<string, unknown>;
		expect(projectJson.name).toBe("test-project");
		expect(projectJson.activeEpic).toBe("my-epic");
		expect(projectJson.activeQuest).toBe("my-quest");

		// Verify unified overview file
		expect(fs.existsSync(path.join(outputDir, "overview.json"))).toBe(true);

		// Verify entity directories
		expect(fs.existsSync(path.join(outputDir, "epics", "my-epic", "epic.json"))).toBe(true);
		expect(fs.existsSync(path.join(outputDir, "epics", "my-epic", "slices", "slice-one", "slice.json"))).toBe(true);
		expect(fs.existsSync(path.join(outputDir, "quests", "my-quest", "quest.json"))).toBe(true);

		// Verify activity log
		expect(fs.existsSync(path.join(outputDir, "activity-log.jsonl"))).toBe(true);
	});
});

describe("rpcMigrate — Correction protocol", () => {
	it("re-emits requested questions on rejection", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);
		await rpcMigrate(projectDir, round2Answers(), tmpDir);

		const result = await rpcMigrate(
			projectDir,
			{
				round: 3,
				answers: [
					{
						id: "confirmation",
						data: {
							approved: false,
							reAnswerIds: ["epic-details-my-epic"],
							notes: "Fix slice status",
						},
					},
				],
			},
			tmpDir,
		);

		expect(result.status).toBe("questions");
		if (result.status !== "questions") return;
		expect(result.round.questions).toHaveLength(1);
		expect(result.round.questions[0]?.id).toBe("epic-details-my-epic");
	});

	it("merges correction answers and returns to confirmation", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);
		await rpcMigrate(projectDir, round2Answers(), tmpDir);

		// Reject
		const rejectResult = await rpcMigrate(
			projectDir,
			{
				round: 3,
				answers: [
					{
						id: "confirmation",
						data: {
							approved: false,
							reAnswerIds: ["epic-details-my-epic"],
							notes: "Fix slice status",
						},
					},
				],
			},
			tmpDir,
		);

		if (rejectResult.status !== "questions") throw new Error("expected questions");
		const correctionRound = rejectResult.round.round;

		// Submit correction
		const result = await rpcMigrate(
			projectDir,
			{
				round: correctionRound,
				answers: [
					{
						id: "epic-details-my-epic",
						data: {
							slices: [
								{
									name: "slice-one",
									goal: "Updated slice goal",
									status: "plan-created",
									sourcePath: "epics/__active__my-epic/slices/slice-one",
								},
							],
							sliceSequence: ["slice-one"],
							hasArchitecture: false,
							activatedDate: null,
						},
					},
				],
			},
			tmpDir,
		);

		expect(result.status).toBe("questions");
		if (result.status !== "questions") return;
		// Should be back at confirmation
		expect(result.round.questions[0]?.id).toBe("confirmation");
	});

	it("approves after correction round", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);
		await rpcMigrate(projectDir, round2Answers(), tmpDir);

		// Reject
		const rejectResult = await rpcMigrate(
			projectDir,
			{
				round: 3,
				answers: [
					{
						id: "confirmation",
						data: {
							approved: false,
							reAnswerIds: ["epic-details-my-epic"],
							notes: "Fix",
						},
					},
				],
			},
			tmpDir,
		);
		if (rejectResult.status !== "questions") throw new Error("expected questions");
		const correctionRound = rejectResult.round.round;

		// Submit correction
		const confirmResult = await rpcMigrate(
			projectDir,
			{
				round: correctionRound,
				answers: [
					{
						id: "epic-details-my-epic",
						data: {
							slices: [
								{
									name: "slice-one",
									goal: "Updated",
									status: "plan-created",
									sourcePath: "epics/__active__my-epic/slices/slice-one",
								},
							],
							sliceSequence: ["slice-one"],
							hasArchitecture: false,
							activatedDate: null,
						},
					},
				],
			},
			tmpDir,
		);
		if (confirmResult.status !== "questions") throw new Error("expected confirmation");
		const confirmRound = confirmResult.round.round;

		// Approve
		const result = await rpcMigrate(
			projectDir,
			{
				round: confirmRound,
				answers: [{ id: "confirmation", data: { approved: true, notes: "" } }],
			},
			tmpDir,
		);

		expect(result.status).toBe("complete");
		if (result.status !== "complete") return;
		expect(result.summary.projectName).toBe("test-project");
	});

	it("throws after 3 correction rounds", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);
		await rpcMigrate(projectDir, round2Answers(), tmpDir);

		// Reject 3 times
		for (let i = 0; i < 3; i++) {
			const state = readMigrationState();
			const result = await rpcMigrate(
				projectDir,
				{
					round: state.round as number,
					answers: [
						{
							id: "confirmation",
							data: {
								approved: false,
								reAnswerIds: ["epic-details-my-epic"],
								notes: `Correction ${String(i + 1)}`,
							},
						},
					],
				},
				tmpDir,
			);

			if (result.status !== "questions") throw new Error("expected questions");

			// Submit correction answer to get back to confirmation
			const corrState = readMigrationState();
			await rpcMigrate(
				projectDir,
				{
					round: corrState.round as number,
					answers: [
						{
							id: "epic-details-my-epic",
							data: {
								slices: [
									{
										name: "slice-one",
										goal: "Fixed",
										status: "plan-created",
										sourcePath: "epics/__active__my-epic/slices/slice-one",
									},
								],
								sliceSequence: ["slice-one"],
								hasArchitecture: false,
								activatedDate: null,
							},
						},
					],
				},
				tmpDir,
			);
		}

		// 4th rejection should throw
		const state = readMigrationState();
		await expect(
			rpcMigrate(
				projectDir,
				{
					round: state.round as number,
					answers: [
						{
							id: "confirmation",
							data: {
								approved: false,
								reAnswerIds: ["epic-details-my-epic"],
								notes: "4th try",
							},
						},
					],
				},
				tmpDir,
			),
		).rejects.toThrow("Exceeded maximum correction rounds");
	});

	it("rejects invalid reAnswerIds", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);
		await rpcMigrate(projectDir, round2Answers(), tmpDir);

		await expect(
			rpcMigrate(
				projectDir,
				{
					round: 3,
					answers: [
						{
							id: "confirmation",
							data: {
								approved: false,
								reAnswerIds: ["nonexistent-id"],
								notes: "Bad ID",
							},
						},
					],
				},
				tmpDir,
			),
		).rejects.toThrow(GoodplanError);
	});
});

describe("rpcMigrate — Edge cases", () => {
	it("handles project with no epics (skip to confirmation)", async () => {
		// Only create quest directory, no epics
		const questDir = path.join(projectDir, "side-quests", "__active__my-quest");
		fs.mkdirSync(questDir, { recursive: true });

		const result = await rpcMigrate(
			projectDir,
			{
				round: 1,
				answers: [
					{
						id: "project-info",
						data: { name: "no-epics", goal: "Just quests" },
					},
					{
						id: "epic-inventory",
						data: [],
					},
					{
						id: "quest-inventory",
						data: [
							{
								name: "my-quest",
								goal: "Quest goal",
								status: "implementing",
								sourcePath: "side-quests/__active__my-quest",
							},
						],
					},
				],
			},
			tmpDir,
		);

		// Should skip round 2 and go straight to confirmation
		expect(result.status).toBe("questions");
		if (result.status !== "questions") return;
		expect(result.round.questions[0]?.id).toBe("confirmation");
		expect(result.round.questions[0]?.hint).toContain("no-epics");
	});

	it("handles epic with zero slices", async () => {
		const epicDir = path.join(projectDir, "epics", "__active__empty-epic");
		fs.mkdirSync(epicDir, { recursive: true });

		await rpcMigrate(
			projectDir,
			{
				round: 1,
				answers: [
					{ id: "project-info", data: { name: "test", goal: "Test" } },
					{
						id: "epic-inventory",
						data: [
							{
								name: "empty-epic",
								goal: "Early stage",
								status: "created",
								sourcePath: "epics/__active__empty-epic",
							},
						],
					},
					{ id: "quest-inventory", data: [] },
				],
			},
			tmpDir,
		);

		const result = await rpcMigrate(
			projectDir,
			{
				round: 2,
				answers: [
					{
						id: "epic-details-empty-epic",
						data: {
							slices: [],
							sliceSequence: [],
							hasArchitecture: false,
							activatedDate: null,
						},
					},
				],
			},
			tmpDir,
		);

		expect(result.status).toBe("questions");
		if (result.status !== "questions") return;
		expect(result.round.questions[0]?.id).toBe("confirmation");
		expect(result.round.questions[0]?.hint).toContain("0 slices");
	});

	it("resumes at confirmation round on re-invocation without stdin", async () => {
		setupOldProject();
		await rpcMigrate(projectDir, round1Answers(), tmpDir);
		await rpcMigrate(projectDir, round2Answers(), tmpDir);

		// Resume without stdin
		const result = await rpcMigrate(projectDir, null, tmpDir);

		expect(result.status).toBe("questions");
		if (result.status !== "questions") return;
		expect(result.round.questions[0]?.id).toBe("confirmation");
	});
});
