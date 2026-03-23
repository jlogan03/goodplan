import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { begin } from "../../../../src/core/rpc/begin.js";
import { complete } from "../../../../src/core/rpc/complete.js";
import { rpcInit } from "../../../../src/core/rpc/init.js";
import { submit } from "../../../../src/core/rpc/submit.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-learning-cmd-"));
	projectDir = path.join(tmpDir, ".project");
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

function initProject(name = "test") {
	rpcInit(projectDir, name);
}

function captureStdout(): { chunks: string[]; restore: () => void } {
	const chunks: string[] = [];
	const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
		chunks.push(String(chunk));
		return true;
	});
	return { chunks, restore: () => spy.mockRestore() };
}

/** Write content files for slice state machine guards, then invalidate cache. */
function writeSliceContent(sliceName: string, ...files: string[]) {
	const dir = path.join(projectDir, "slices", sliceName);
	fs.mkdirSync(dir, { recursive: true });
	for (const f of files) {
		fs.writeFileSync(path.join(dir, f), `# ${f}\nContent.`);
	}
	const cachePath = path.join(projectDir, ".state-cache.json");
	if (fs.existsSync(cachePath)) {
		fs.unlinkSync(cachePath);
	}
}

/**
 * Set up an epic + slice and complete the slice with learnings that have rollupTo.
 * Uses the full epic lifecycle: create -> explore -> architecture -> refine-architecture ->
 * slices -> refine-slices -> add-verification -> activate.
 */
function setupSliceWithLearnings() {
	begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "Test" });
	begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
	submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
	begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
	submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
	submit(
		projectDir,
		"refine-architecture",
		{ type: "epic", name: "e1" },
		{ phase: "refine-architecture", scores: {} },
	);
	begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
	submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
	submit(
		projectDir,
		"refine-slices",
		{ type: "epic", name: "e1" },
		{ phase: "refine-slices", scores: {} },
	);
	const v = {
		description: "Works",
		status: "pending" as const,
		addedDuring: "defining-slices",
		modifiedDuring: null,
	};
	begin(projectDir, "add-verification", { type: "epic", name: "e1" }, { verification: v });
	begin(projectDir, "activate", { type: "epic", name: "e1" }, {});

	// Create and advance slice
	begin(
		projectDir,
		"create",
		{ type: "slice", name: "s1" },
		{ name: "s1", epic: "e1", goal: "Slice goal" },
	);
	begin(projectDir, "plan", { type: "slice", name: "s1" }, {});
	writeSliceContent("s1", "plan.md");
	submit(projectDir, "plan", { type: "slice", name: "s1" }, { phase: "plan" });
	submit(
		projectDir,
		"refinement",
		{ type: "slice", name: "s1" },
		{ phase: "refinement", scores: {} },
	);
	writeSliceContent("s1", "plan-refined.md");
	begin(projectDir, "implement", { type: "slice", name: "s1" }, {});
	submit(
		projectDir,
		"implementation",
		{ type: "slice", name: "s1" },
		{ phase: "implementation" },
	);

	// Complete slice with learnings that roll up to project
	complete(projectDir, { type: "slice", name: "s1" }, {
		type: "slice",
		verificationPassed: true,
		deferred: [],
		learnings: [
			{
				category: "worked",
				summary: "Approach X worked",
				detail: "Details about approach X",
				tags: ["testing"],
				rollupTo: ["project"],
			},
			{
				category: "domain",
				summary: "Domain insight",
				detail: "Domain detail",
				tags: ["domain"],
				rollupTo: [],
			},
		],
		architectureDelta: [],
	});
}

// ── Command runners ──────────────────────────────────────────

async function runLearningList(args: Record<string, unknown>) {
	const { learningListCommand } = await import("../../../../src/commands/learning/list.js");
	const def = await learningListCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runLearningRollup(args: Record<string, unknown>) {
	const { learningRollupCommand } = await import("../../../../src/commands/learning/rollup.js");
	const def = await learningRollupCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

// ── Tests ────────────────────────────────────────────────────

describe("learning:list", () => {
	it("returns empty items when no learnings at project level", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runLearningList({ json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.items).toEqual([]);
	});

	it("shows 'No learnings found.' when empty", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runLearningList({});
		restore();
		expect(chunks.join("")).toContain("No learnings found.");
	});

	it("lists learnings at slice scope with --source", async () => {
		initProject();
		setupSliceWithLearnings();

		const { chunks, restore } = captureStdout();
		await runLearningList({ source: "slices/s1", json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		// Slice has learnings (those not yet rolled up + the one without rollup)
		expect(out.items.length).toBeGreaterThanOrEqual(1);
	});

	it("shows human-readable list with source info", async () => {
		initProject();
		setupSliceWithLearnings();

		const { chunks, restore } = captureStdout();
		await runLearningList({ source: "slices/s1" });
		restore();
		const text = chunks.join("");
		expect(text).toContain("worked");
	});

	it("lists project-level learnings after rollup from slice completion", async () => {
		initProject();
		setupSliceWithLearnings();

		// COMPLETE_SLICE already rolled up learnings with rollupTo: ["project"]
		const { chunks, restore } = captureStdout();
		await runLearningList({ json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		// The learning with rollupTo: ["project"] should have been rolled up to project level
		expect(out.items.length).toBeGreaterThanOrEqual(1);
		expect(out.items.some((l: { summary: string }) => l.summary === "Approach X worked")).toBe(true);
	});
});

describe("learning:rollup", () => {
	it("rolls up eligible learnings from source to target", async () => {
		initProject();
		setupSliceWithLearnings();

		// At this point, COMPLETE_SLICE already rolled up to project. But
		// let's test the manual rollup command works by checking it doesn't error.
		// Remaining learnings at slice level that target "project" have already been rolled up.
		const { chunks, restore } = captureStdout();
		await runLearningRollup({ from: "slices/s1", to: "project", json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.rolledUp).toBeDefined();
		expect(typeof out.rolledUp).toBe("number");
	});

	it("shows human-readable rollup output", async () => {
		initProject();
		setupSliceWithLearnings();

		const { chunks, restore } = captureStdout();
		await runLearningRollup({ from: "slices/s1", to: "project" });
		restore();
		const text = chunks.join("");
		expect(text).toContain("Rolled up");
		expect(text).toContain("slices/s1");
		expect(text).toContain("project");
	});
});
