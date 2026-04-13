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
import { detectVersion } from "../../src/commands/global/migrate.js";
import { rpcMigrate } from "../../src/core/rpc/migrate.js";
import { computeDerivedState } from "../../src/engine/derived-state/compute.js";
import { appendEvent } from "../../src/engine/events/append.js";
import type { AnyEventEnvelope } from "../../src/schemas/envelope.js";
import { AnyEventEnvelopeSchema } from "../../src/schemas/envelope.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temp dir, copy fixture into it, init git repo, run callback, clean up. */
async function withMigrateFixture<T>(
	fn: (tmpDir: string, projectDir: string) => T | Promise<T>,
): Promise<T> {
	const fixtureDir = path.resolve(import.meta.dirname, "../fixtures/pre-cli-project");
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-migrate-events-test-"));

	try {
		fs.cpSync(fixtureDir, tmpDir, { recursive: true });

		// Initialize a git repo so storeContentRef (git hash-object) works
		const { execSync } = await import("node:child_process");
		execSync("git init", { cwd: tmpDir, stdio: "pipe" });
		execSync("git add -A", { cwd: tmpDir, stdio: "pipe" });
		execSync('git commit -m "fixture" --allow-empty', { cwd: tmpDir, stdio: "pipe" });

		const projectDir = path.join(tmpDir, ".project");
		return await fn(tmpDir, projectDir);
	} finally {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
}

/** Parse events.jsonl into an array of envelopes. */
function parseEventsFile(filePath: string): AnyEventEnvelope[] {
	const content = fs.readFileSync(filePath, "utf-8");
	return content
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => JSON.parse(line) as AnyEventEnvelope);
}

// Fixture answers matching the pre-cli-project fixture
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

/** Run the full 3-round migration and return the output directory. */
async function runFullMigration(tmpDir: string, projectDir: string): Promise<string> {
	// Round 1: get questions
	await rpcMigrate(projectDir, null, tmpDir);

	// Round 1: submit inventory answers
	await rpcMigrate(
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

	// Round 2: submit epic detail
	await rpcMigrate(
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

	// Round 3: confirm
	const confirmation: ConfirmationResponse = {
		approved: true,
		notes: "Proceed with migration",
	};
	const result = await rpcMigrate(
		projectDir,
		{
			round: 3,
			answers: [{ id: QUESTION_IDS.CONFIRMATION, data: confirmation }],
		},
		tmpDir,
	);

	expect(result.status).toBe("complete");

	return path.join(tmpDir, ".goodplan");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("migrate-events: event log generation", () => {
	it("produces events.jsonl at project scope after full migration", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			const projectEventsPath = path.join(outputDir, "events.jsonl");
			expect(fs.existsSync(projectEventsPath)).toBe(true);

			const events = parseEventsFile(projectEventsPath);
			expect(events.length).toBeGreaterThan(0);
			expect(events[0]?.type).toBe("project-initialized");
			expect(events[0]?.scope).toBe("project");
			expect(events[0]?.scopeRef).toBeNull();
		});
	});

	it("produces events.jsonl at epic scope after migration with an epic", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			const epicEventsPath = path.join(outputDir, "epics", "test-epic", "events.jsonl");
			expect(fs.existsSync(epicEventsPath)).toBe(true);

			const events = parseEventsFile(epicEventsPath);
			expect(events.length).toBeGreaterThan(0);
			expect(events[0]?.type).toBe("epic-created");
			expect(events[0]?.scope).toBe("epic");
			expect(events[0]?.scopeRef).toBe("test-epic");
		});
	});

	it("produces events.jsonl at side-quest scope after migration with quests", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			// cleanup-deps is "completed" — should have events
			const sqEventsPath = path.join(
				outputDir,
				"side-quests",
				"cleanup-deps",
				"events.jsonl",
			);
			expect(fs.existsSync(sqEventsPath)).toBe(true);

			const events = parseEventsFile(sqEventsPath);
			expect(events.length).toBeGreaterThan(0);
			expect(events[0]?.type).toBe("side-quest-created");
			expect(events[0]?.scope).toBe("side-quest");
			expect(events[0]?.scopeRef).toBe("cleanup-deps");
		});
	});
});

describe("migrate-events: schema validation", () => {
	it("every event in all logs parses via AnyEventEnvelopeSchema", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			// Collect all events.jsonl files
			const eventFiles = [
				path.join(outputDir, "events.jsonl"),
				path.join(outputDir, "epics", "test-epic", "events.jsonl"),
			];

			// Add side-quest event files if they exist
			const sqDir = path.join(outputDir, "side-quests");
			if (fs.existsSync(sqDir)) {
				for (const entry of fs.readdirSync(sqDir)) {
					const sqEventsPath = path.join(sqDir, entry, "events.jsonl");
					if (fs.existsSync(sqEventsPath)) {
						eventFiles.push(sqEventsPath);
					}
				}
			}

			for (const filePath of eventFiles) {
				expect(fs.existsSync(filePath)).toBe(true);
				const events = parseEventsFile(filePath);

				for (const event of events) {
					// Should not throw
					const parsed = AnyEventEnvelopeSchema.parse(event);
					expect(parsed.id).toBeDefined();
					expect(parsed.schemaVersion).toBe(1);
					expect(parsed.actor.kind).toBe("cli");
					expect(parsed.actor.id).toBe("gp:migrate");
				}
			}
		});
	});
});

describe("migrate-events: prevId chain integrity", () => {
	it("prevId chains are valid within each scope", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			// Collect all events.jsonl files
			const eventFiles: Array<{ path: string; label: string }> = [
				{ path: path.join(outputDir, "events.jsonl"), label: "project" },
				{
					path: path.join(outputDir, "epics", "test-epic", "events.jsonl"),
					label: "epic/test-epic",
				},
			];

			const sqDir = path.join(outputDir, "side-quests");
			if (fs.existsSync(sqDir)) {
				for (const entry of fs.readdirSync(sqDir)) {
					const sqEventsPath = path.join(sqDir, entry, "events.jsonl");
					if (fs.existsSync(sqEventsPath)) {
						eventFiles.push({
							path: sqEventsPath,
							label: `side-quest/${entry}`,
						});
					}
				}
			}

			for (const { path: filePath, label } of eventFiles) {
				const events = parseEventsFile(filePath);
				expect(events.length).toBeGreaterThan(0);

				// First event must have null prevId
				expect(events[0]?.prevId).toBeNull();

				// Each subsequent event's prevId must equal the previous event's id
				for (let i = 1; i < events.length; i++) {
					const current = events[i];
					const previous = events[i - 1];
					expect(current?.prevId).toBe(previous?.id);
				}

				// All ids must be unique within the scope
				const ids = events.map((e) => e.id);
				const uniqueIds = new Set(ids);
				expect(uniqueIds.size).toBe(ids.length);
			}
		});
	});

	it("timestamps are monotonically increasing within each scope", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			const epicEventsPath = path.join(
				outputDir,
				"epics",
				"test-epic",
				"events.jsonl",
			);
			const events = parseEventsFile(epicEventsPath);

			for (let i = 1; i < events.length; i++) {
				const current = new Date(events[i]!.ts).getTime();
				const previous = new Date(events[i - 1]!.ts).getTime();
				expect(current).toBeGreaterThanOrEqual(previous);
			}
		});
	});
});

describe("migrate-events: derived state correctness", () => {
	it("computeDerivedState on project events produces initialized project", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			const projectEventsPath = path.join(outputDir, "events.jsonl");
			const events = parseEventsFile(projectEventsPath);
			const state = computeDerivedState(events);

			expect(state.project.initialized).toBe(true);
			expect(state.project.name).toBe("test-project");
		});
	});

	it("computeDerivedState on epic events produces correct phases for completed epic", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			const epicEventsPath = path.join(
				outputDir,
				"epics",
				"test-epic",
				"events.jsonl",
			);
			const events = parseEventsFile(epicEventsPath);
			const state = computeDerivedState(events);

			// The completed epic should exist and be completed
			const epicState = state.epics.get("test-epic");
			expect(epicState).toBeDefined();
			expect(epicState?.completed).toBe(true);

			// Completed epic: epic-created + epic-goal-committed + epic-activated + epic-completed
			// Completed epic: goal set, no longer active (epic-completed sets active=false)
			expect(epicState?.goal).not.toBeNull();
			expect(epicState?.active).toBe(false);

			// Completed slices should have slice-landed phase (P12)
			const firstSlice = epicState?.slices.get("first-slice");
			expect(firstSlice).toBeDefined();
			expect(firstSlice?.phase).toBe("P12");

			const secondSlice = epicState?.slices.get("second-slice");
			expect(secondSlice).toBeDefined();
			expect(secondSlice?.phase).toBe("P12");
		});
	});

	it("computeDerivedState on side-quest events produces correct phases", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			// cleanup-deps is completed
			const sqCompletedPath = path.join(
				outputDir,
				"side-quests",
				"cleanup-deps",
				"events.jsonl",
			);
			if (fs.existsSync(sqCompletedPath)) {
				const events = parseEventsFile(sqCompletedPath);
				const state = computeDerivedState(events);
				const sqState = state.sideQuests.get("cleanup-deps");
				expect(sqState).toBeDefined();
				expect(sqState?.landed).toBe(true);
				expect(sqState?.phase).toBe("S3");
			}

			// fix-typos is created — should have S0 phase
			const sqCreatedPath = path.join(
				outputDir,
				"side-quests",
				"fix-typos",
				"events.jsonl",
			);
			if (fs.existsSync(sqCreatedPath)) {
				const events = parseEventsFile(sqCreatedPath);
				const state = computeDerivedState(events);
				const sqState = state.sideQuests.get("fix-typos");
				expect(sqState).toBeDefined();
				expect(sqState?.phase).toBe("S0");
			}
		});
	});
});

describe("migrate-events: idempotency", () => {
	it("detectVersion returns v2 or partial after migration (events.jsonl present)", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			await runFullMigration(tmpDir, projectDir);

			// detectVersion scans from cwd
			const detection = detectVersion(tmpDir);

			// After migration, events.jsonl exists alongside v1 entity files
			// So it should be "partial" (both v1 indicators and v2 indicator present)
			// or "v2" if only v2 indicators are found
			expect(["v2", "partial"]).toContain(detection.version);
			expect(detection.indicators).toContain("events.jsonl");
		});
	});
});

describe("migrate-events: post-migration appendEvent compatibility", () => {
	it("appendEvent succeeds after migration and chains to last migration event", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			const epicEventsPath = path.join(
				outputDir,
				"epics",
				"test-epic",
				"events.jsonl",
			);

			// Read the migration events to get the last event's id
			const migrationEvents = parseEventsFile(epicEventsPath);
			const lastMigrationEvent = migrationEvents[migrationEvents.length - 1];
			expect(lastMigrationEvent).toBeDefined();

			// Append a new event using the standard appendEvent pipeline
			const result = await appendEvent({
				eventsPath: epicEventsPath,
				scope: "epic",
				scopeRef: "test-epic",
				actor: { kind: "cli", id: "gp:test" },
				branch: "test-branch",
				commitHint: null,
				domain: "entity-lifecycle",
				type: "slice-created",
				payload: {
					sliceRef: "post-migration-slice",
					directory: "post-migration-slice",
				},
			});

			// The new event should exist and be valid
			expect(result.event).toBeDefined();
			AnyEventEnvelopeSchema.parse(result.event);

			// The new event's prevId must reference the last migration event
			expect(result.event.prevId).toBe(lastMigrationEvent?.id);

			// Re-read the file and verify the full chain is intact
			const allEvents = parseEventsFile(epicEventsPath);
			expect(allEvents.length).toBe(migrationEvents.length + 1);

			// Verify the entire prevId chain
			expect(allEvents[0]?.prevId).toBeNull();
			for (let i = 1; i < allEvents.length; i++) {
				expect(allEvents[i]?.prevId).toBe(allEvents[i - 1]?.id);
			}
		});
	});
});

describe("migrate-events: event sequence correctness", () => {
	it("completed epic produces expected event type sequence", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			const epicEventsPath = path.join(
				outputDir,
				"epics",
				"test-epic",
				"events.jsonl",
			);
			const events = parseEventsFile(epicEventsPath);
			const types = events.map((e) => e.type);

			// Completed epic with completed slices should have:
			// epic-created, epic-goal-committed, epic-activated, epic-completed
			// Then for each slice: slice-created, slice-plan-drafted,
			//   plan-shape-checkpoint-auto-shaped, slice-plan-committed,
			//   slice-implementation-started, slice-code-refinement-started,
			//   code-refinement-converged, slice-landed
			expect(types).toContain("epic-created");
			expect(types).toContain("epic-goal-committed");
			expect(types).toContain("epic-activated");
			expect(types).toContain("epic-completed");

			// Slice events for completed slices
			expect(types).toContain("slice-created");
			expect(types).toContain("slice-plan-drafted");
			expect(types).toContain("plan-shape-checkpoint-auto-shaped");
			expect(types).toContain("slice-plan-committed");
			expect(types).toContain("slice-implementation-started");
			expect(types).toContain("slice-code-refinement-started");
			expect(types).toContain("code-refinement-converged");
			expect(types).toContain("slice-landed");

			// Epic-level events come before slice events
			const epicCreatedIdx = types.indexOf("epic-created");
			const firstSliceCreatedIdx = types.indexOf("slice-created");
			expect(epicCreatedIdx).toBeLessThan(firstSliceCreatedIdx);
		});
	});

	it("created quest produces only side-quest-created event", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			const sqPath = path.join(
				outputDir,
				"side-quests",
				"fix-typos",
				"events.jsonl",
			);
			if (fs.existsSync(sqPath)) {
				const events = parseEventsFile(sqPath);
				const types = events.map((e) => e.type);

				// "created" status only gets side-quest-created
				expect(types).toEqual(["side-quest-created"]);
			}
		});
	});

	it("completed quest produces full side-quest lifecycle events", async () => {
		await withMigrateFixture(async (tmpDir, projectDir) => {
			const outputDir = await runFullMigration(tmpDir, projectDir);

			const sqPath = path.join(
				outputDir,
				"side-quests",
				"cleanup-deps",
				"events.jsonl",
			);
			if (fs.existsSync(sqPath)) {
				const events = parseEventsFile(sqPath);
				const types = events.map((e) => e.type);

				expect(types).toContain("side-quest-created");
				expect(types).toContain("side-quest-goal-committed");
				expect(types).toContain("side-quest-plan-committed");
				expect(types).toContain("side-quest-implementation-started");
				expect(types).toContain("side-quest-landed");
			}
		});
	});
});
