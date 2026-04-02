import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assembleState } from "../../src/core/data/assemble.js";
import { commitState } from "../../src/core/data/commit.js";
import { verifyStateTree } from "../../src/core/data/hmac.js";
import { migrateOverviewConsolidation } from "../../src/core/rpc/migrate.js";
import type { ProjectState } from "../../src/core/tree.js";
import { ZERO_STATE } from "../../src/core/tree.js";
import { deterministicStringify } from "../../src/util/json.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;
let projectDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-overview-migrate-"));
	projectDir = path.join(tmpDir, ".goodplan");
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Create a minimal valid project with old-style separate overview files.
 * Builds state via commitState to ensure HMAC is valid, then manually
 * creates the old overview files.
 */
function setupOldStyleProject(opts?: {
	epics?: Array<{ name: string; status: string; slices?: Array<{ name: string; status: string }> }>;
	quests?: Array<{ name: string; status: string }>;
	tasks?: Array<{ name: string; status: string }>;
	includeSlicesOverview?: boolean;
}): void {
	const ts = "2026-01-01T00:00:00.000Z";
	const epics = opts?.epics ?? [];
	const quests = opts?.quests ?? [];
	const tasks = opts?.tasks ?? [];

	// Build a state with unified overview (as current code expects)
	const epicOverviewItems = epics.map((e) => ({
		name: e.name,
		status: e.status,
		created: ts,
		completed: null,
		slices: (e.slices ?? []).map((s) => ({
			name: s.name,
			status: s.status,
			created: ts,
			completed: null,
		})),
	}));

	const questOverviewItems = quests.map((q) => ({
		name: q.name,
		status: q.status,
		created: ts,
		completed: null,
	}));

	const taskOverviewItems = tasks.map((t) => ({
		name: t.name,
		status: t.status,
		created: ts,
		completed: null,
	}));

	const state: ProjectState = {
		type: "directory",
		contents: {
			"project.json": {
				type: "json",
				content: {
					version: "1.0.0",
					name: "test-project",
					activeEpic: null,
					activeSlice: null,
					activeQuest: null,
					created: ts,
					updated: ts,
				},
			},
			"overview.json": {
				type: "json",
				content: {
					epics: epicOverviewItems,
					quests: questOverviewItems,
					tasks: taskOverviewItems,
				},
			},
			"activity-log.jsonl": { type: "jsonl", content: [] },
			"decisions.jsonl": { type: "jsonl", content: [] },
			"learnings.jsonl": { type: "jsonl", content: [] },
		},
	};

	// Commit the valid state
	commitState(projectDir, ZERO_STATE, state, { force: true });

	// Now delete the unified overview and create old-style separate files
	fs.unlinkSync(path.join(projectDir, "overview.json"));

	// Create epics/overview.json with old format
	if (epics.length > 0 || true) {
		const epicsDir = path.join(projectDir, "epics");
		fs.mkdirSync(epicsDir, { recursive: true });
		const oldEpicOverview = { items: epicOverviewItems };
		fs.writeFileSync(
			path.join(epicsDir, "overview.json"),
			`${deterministicStringify(oldEpicOverview)}\n`,
			"utf-8",
		);
	}

	// Create quests/overview.json with old format
	if (quests.length > 0 || true) {
		const questsDir = path.join(projectDir, "quests");
		fs.mkdirSync(questsDir, { recursive: true });
		const oldQuestOverview = { items: questOverviewItems };
		fs.writeFileSync(
			path.join(questsDir, "overview.json"),
			`${deterministicStringify(oldQuestOverview)}\n`,
			"utf-8",
		);
	}

	// Create tasks/overview.json with old format
	if (tasks.length > 0 || true) {
		const tasksDir = path.join(projectDir, "tasks");
		fs.mkdirSync(tasksDir, { recursive: true });
		const oldTaskOverview = { items: taskOverviewItems };
		fs.writeFileSync(
			path.join(tasksDir, "overview.json"),
			`${deterministicStringify(oldTaskOverview)}\n`,
			"utf-8",
		);
	}

	// Optionally create slices/overview.json (legacy artifact)
	if (opts?.includeSlicesOverview === true) {
		const slicesDir = path.join(projectDir, "slices");
		fs.mkdirSync(slicesDir, { recursive: true });
		fs.writeFileSync(
			path.join(slicesDir, "overview.json"),
			'{"items":[]}\n',
			"utf-8",
		);
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("migrateOverviewConsolidation", () => {
	it("consolidates old-style separate overview files into unified overview.json", () => {
		setupOldStyleProject({
			epics: [
				{
					name: "my-epic",
					status: "activated",
					slices: [{ name: "slice-1", status: "planning" }],
				},
			],
			quests: [{ name: "fix-bug", status: "created" }],
			tasks: [{ name: "cleanup", status: "created" }],
		});

		// Verify old files exist
		expect(fs.existsSync(path.join(projectDir, "epics", "overview.json"))).toBe(true);
		expect(fs.existsSync(path.join(projectDir, "quests", "overview.json"))).toBe(true);
		expect(fs.existsSync(path.join(projectDir, "tasks", "overview.json"))).toBe(true);
		expect(fs.existsSync(path.join(projectDir, "overview.json"))).toBe(false);

		const result = migrateOverviewConsolidation(projectDir);
		expect(result).toBe(true);

		// Verify unified overview.json created
		expect(fs.existsSync(path.join(projectDir, "overview.json"))).toBe(true);

		// Verify old files removed
		expect(fs.existsSync(path.join(projectDir, "epics", "overview.json"))).toBe(false);
		expect(fs.existsSync(path.join(projectDir, "quests", "overview.json"))).toBe(false);
		expect(fs.existsSync(path.join(projectDir, "tasks", "overview.json"))).toBe(false);

		// Verify unified overview content
		const overview = JSON.parse(
			fs.readFileSync(path.join(projectDir, "overview.json"), "utf-8"),
		) as { epics: unknown[]; quests: unknown[]; tasks: unknown[] };
		expect(overview.epics).toHaveLength(1);
		expect(overview.quests).toHaveLength(1);
		expect(overview.tasks).toHaveLength(1);

		// Verify HMAC is valid after migration
		const state = assembleState(projectDir);
		const projectEntry = state.contents["project.json"];
		expect(projectEntry).toBeDefined();
		if (projectEntry?.type === "json") {
			const project = projectEntry.content as { stateSignature?: string };
			if (project.stateSignature !== undefined) {
				expect(verifyStateTree(state, project.stateSignature)).toBe(true);
			}
		}
	});

	it("is idempotent — second run is a no-op", () => {
		setupOldStyleProject({
			quests: [{ name: "fix-bug", status: "created" }],
		});

		// First run
		const result1 = migrateOverviewConsolidation(projectDir);
		expect(result1).toBe(true);

		// Capture overview content
		const overviewAfterFirst = fs.readFileSync(
			path.join(projectDir, "overview.json"),
			"utf-8",
		);

		// Second run — no-op
		const result2 = migrateOverviewConsolidation(projectDir);
		expect(result2).toBe(false);

		// Content unchanged
		const overviewAfterSecond = fs.readFileSync(
			path.join(projectDir, "overview.json"),
			"utf-8",
		);
		expect(overviewAfterSecond).toBe(overviewAfterFirst);
	});

	it("handles interrupted migration — old + new files both present", () => {
		setupOldStyleProject({
			epics: [{ name: "epic-1", status: "activated" }],
			quests: [{ name: "quest-1", status: "created" }],
			tasks: [{ name: "task-1", status: "created" }],
		});

		// Simulate interrupted migration: create overview.json but leave old files
		const partialOverview = { epics: [], quests: [], tasks: [] };
		fs.writeFileSync(
			path.join(projectDir, "overview.json"),
			`${deterministicStringify(partialOverview)}\n`,
			"utf-8",
		);

		// Old files still exist (simulating crash after write, before cleanup)
		expect(fs.existsSync(path.join(projectDir, "epics", "overview.json"))).toBe(true);

		const result = migrateOverviewConsolidation(projectDir);
		expect(result).toBe(true);

		// Verify old files cleaned up
		expect(fs.existsSync(path.join(projectDir, "epics", "overview.json"))).toBe(false);
		expect(fs.existsSync(path.join(projectDir, "quests", "overview.json"))).toBe(false);
		expect(fs.existsSync(path.join(projectDir, "tasks", "overview.json"))).toBe(false);

		// Verify unified overview has data from old files (not the partial one)
		const overview = JSON.parse(
			fs.readFileSync(path.join(projectDir, "overview.json"), "utf-8"),
		) as { epics: unknown[]; quests: unknown[]; tasks: unknown[] };
		expect(overview.epics).toHaveLength(1);
		expect(overview.quests).toHaveLength(1);
		expect(overview.tasks).toHaveLength(1);
	});

	it("removes slices/overview.json legacy artifact", () => {
		setupOldStyleProject({
			includeSlicesOverview: true,
		});

		expect(fs.existsSync(path.join(projectDir, "slices", "overview.json"))).toBe(true);

		const result = migrateOverviewConsolidation(projectDir);
		expect(result).toBe(true);

		// Legacy slices overview removed
		expect(fs.existsSync(path.join(projectDir, "slices", "overview.json"))).toBe(false);
	});

	it("skips when already clean — unified exists, no old files", () => {
		setupOldStyleProject();

		// Run migration first to consolidate
		migrateOverviewConsolidation(projectDir);

		// Now it should be clean
		const result = migrateOverviewConsolidation(projectDir);
		expect(result).toBe(false);
	});

	it("handles empty old overview files gracefully", () => {
		setupOldStyleProject();

		// Overwrite old files with empty items arrays
		fs.writeFileSync(
			path.join(projectDir, "epics", "overview.json"),
			'{"items":[]}\n',
			"utf-8",
		);
		fs.writeFileSync(
			path.join(projectDir, "quests", "overview.json"),
			'{"items":[]}\n',
			"utf-8",
		);
		fs.writeFileSync(
			path.join(projectDir, "tasks", "overview.json"),
			'{"items":[]}\n',
			"utf-8",
		);
		// Remove the unified to force re-migration
		if (fs.existsSync(path.join(projectDir, "overview.json"))) {
			fs.unlinkSync(path.join(projectDir, "overview.json"));
		}

		const result = migrateOverviewConsolidation(projectDir);
		expect(result).toBe(true);

		const overview = JSON.parse(
			fs.readFileSync(path.join(projectDir, "overview.json"), "utf-8"),
		) as { epics: unknown[]; quests: unknown[]; tasks: unknown[] };
		expect(overview.epics).toHaveLength(0);
		expect(overview.quests).toHaveLength(0);
		expect(overview.tasks).toHaveLength(0);
	});

	it("handles partial old files — only quests/overview.json exists", () => {
		setupOldStyleProject({
			quests: [{ name: "q1", status: "created" }],
		});

		// Remove epics and tasks overview, keep only quests
		fs.unlinkSync(path.join(projectDir, "epics", "overview.json"));
		fs.unlinkSync(path.join(projectDir, "tasks", "overview.json"));
		// Also remove the unified if it exists
		if (fs.existsSync(path.join(projectDir, "overview.json"))) {
			fs.unlinkSync(path.join(projectDir, "overview.json"));
		}

		const result = migrateOverviewConsolidation(projectDir);
		expect(result).toBe(true);

		const overview = JSON.parse(
			fs.readFileSync(path.join(projectDir, "overview.json"), "utf-8"),
		) as { epics: unknown[]; quests: unknown[]; tasks: unknown[] };
		// Epics and tasks are empty (no old file), quests populated
		expect(overview.epics).toHaveLength(0);
		expect(overview.quests).toHaveLength(1);
		expect(overview.tasks).toHaveLength(0);
	});
});
