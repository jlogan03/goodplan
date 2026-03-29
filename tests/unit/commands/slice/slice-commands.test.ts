import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { begin } from "../../../../src/core/rpc/begin.js";
import { rpcInit } from "../../../../src/core/rpc/init.js";
import { submit } from "../../../../src/core/rpc/submit.js";
import type { Verification } from "../../../../src/schemas/entities/epic.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-slice-cmd-"));
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

/**
 * Set up a fully activated epic (required before creating slices).
 * Goes through the full epic lifecycle: create -> explore -> architecture -> slices -> activate.
 */
function setupActivatedEpic(epicName = "e1") {
	begin(projectDir, "create", { type: "epic", name: epicName }, { name: epicName, goal: "G" });
	begin(projectDir, "explore", { type: "epic", name: epicName }, {});
	submit(projectDir, "explore", { type: "epic", name: epicName }, { phase: "explore" });
	begin(projectDir, "define-architecture", { type: "epic", name: epicName }, {});
	submit(projectDir, "architecture", { type: "epic", name: epicName }, { phase: "architecture" });
	submit(
		projectDir,
		"refine-architecture",
		{ type: "epic", name: epicName },
		{ phase: "refine-architecture", scores: {} },
	);
	begin(projectDir, "define-slices", { type: "epic", name: epicName }, {});
	submit(projectDir, "slices", { type: "epic", name: epicName }, { phase: "slices" });
	submit(
		projectDir,
		"refine-slices",
		{ type: "epic", name: epicName },
		{ phase: "refine-slices", scores: {} },
	);
	const v: Verification = {
		description: "Works",
		status: "pending",
		addedDuring: "defining-slices",
		modifiedDuring: null,
	};
	begin(projectDir, "add-verification", { type: "epic", name: epicName }, { verification: v });
	begin(projectDir, "activate", { type: "epic", name: epicName }, {});
}

/**
 * Advance a slice from created through to implementation-complete.
 * Requires the slice to already be in 'created' status.
 */
/** Write required content files for slice state machine guards, then invalidate cache. */
function writeSliceContent(sliceName: string, ...files: string[]) {
	const dir = path.join(projectDir, "epics", "e1", "slices", sliceName);
	fs.mkdirSync(dir, { recursive: true });
	for (const f of files) {
		fs.writeFileSync(path.join(dir, f), `# ${f}\nContent.`);
	}
	// Invalidate the state cache so loadState re-reads from disk and sees the new files
	const cachePath = path.join(projectDir, ".state-cache.json");
	if (fs.existsSync(cachePath)) {
		fs.unlinkSync(cachePath);
	}
}

function advanceSliceToImplementationComplete(sliceName: string) {
	begin(projectDir, "plan", { type: "slice", name: sliceName, epic: "e1" }, {});
	writeSliceContent(sliceName, "plan.md");
	submit(projectDir, "plan", { type: "slice", name: sliceName, epic: "e1" }, { phase: "plan" });
	// submit-refinement to skip refinement
	submit(
		projectDir,
		"refinement",
		{ type: "slice", name: sliceName, epic: "e1" },
		{ phase: "refinement", scores: {} },
	);
	writeSliceContent(sliceName, "plan-refined.md");
	begin(projectDir, "implement", { type: "slice", name: sliceName, epic: "e1" }, {});
	submit(
		projectDir,
		"implementation",
		{ type: "slice", name: sliceName, epic: "e1" },
		{ phase: "implementation" },
	);
}

// ── Command runners ──────────────────────────────────────────

async function runSliceCreate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { sliceCreateCommand } = await import("../../../../src/commands/slice/create.js");
	const def = await sliceCreateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSliceList(args: Record<string, unknown>) {
	const { sliceListCommand } = await import("../../../../src/commands/slice/list.js");
	const def = await sliceListCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSliceShow(args: Record<string, unknown>) {
	const { sliceShowCommand } = await import("../../../../src/commands/slice/show.js");
	const def = await sliceShowCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSlicePlan(args: Record<string, unknown>) {
	const { slicePlanCommand } = await import("../../../../src/commands/slice/plan.js");
	const def = await slicePlanCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSliceRefinePlan(args: Record<string, unknown>) {
	const { sliceRefinePlanCommand } = await import("../../../../src/commands/slice/refine-plan.js");
	const def = await sliceRefinePlanCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSliceImplement(args: Record<string, unknown>) {
	const { sliceImplementCommand } = await import("../../../../src/commands/slice/implement.js");
	const def = await sliceImplementCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSliceComplete(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { sliceCompleteCommand } = await import("../../../../src/commands/slice/complete.js");
	const def = await sliceCompleteCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSliceAbandon(args: Record<string, unknown>) {
	const { sliceAbandonCommand } = await import("../../../../src/commands/slice/abandon.js");
	const def = await sliceAbandonCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

// ── slice:create ─────────────────────────────────────────────

describe("slice:create", () => {
	it("creates slice and returns JSON result", async () => {
		initProject();
		setupActivatedEpic();
		const { chunks, restore } = captureStdout();

		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.entity).toBe("01-auth");
		expect(parsed.phase).toBe("create");
		expect(parsed.previousStatus).toBe("none");
		expect(parsed.newStatus).toBe("created");

		// Verify on disk
		const sliceJson = path.join(projectDir, "epics", "e1", "slices", "01-auth", "slice.json");
		expect(fs.existsSync(sliceJson)).toBe(true);

		restore();
	});

	it("shows human-readable output with epic name", async () => {
		initProject();
		setupActivatedEpic();
		const { chunks, restore } = captureStdout();

		await runSliceCreate({ epic: "e1" }, { name: "01-auth", goal: "Auth" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("01-auth");
		expect(outputStr).toContain("(epic: e1)");
		expect(outputStr).toContain("->");
		expect(outputStr).toContain("created");

		restore();
	});

	it("suppresses output in quiet mode", async () => {
		initProject();
		setupActivatedEpic();
		const { chunks, restore } = captureStdout();

		await runSliceCreate({ epic: "e1", quiet: true }, { name: "01-auth", goal: "Auth" });

		expect(chunks.join("")).toBe("");

		// But slice should still be created
		const sliceJson = path.join(projectDir, "epics", "e1", "slices", "01-auth", "slice.json");
		expect(fs.existsSync(sliceJson)).toBe(true);

		restore();
	});

	it("rejects missing name", async () => {
		initProject();
		setupActivatedEpic();
		const { restore } = captureStdout();

		await expect(runSliceCreate({ epic: "e1", json: true }, { goal: "No name" })).rejects.toThrow();

		restore();
	});

	it("rejects missing goal", async () => {
		initProject();
		setupActivatedEpic();
		const { restore } = captureStdout();

		await expect(runSliceCreate({ epic: "e1", json: true }, { name: "01-auth" })).rejects.toThrow();

		restore();
	});
});

// ── slice:list ───────────────────────────────────────────────

describe("slice:list", () => {
	it("returns empty items when no slices exist", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runSliceList({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toEqual([]);

		restore();
	});

	it("returns slice items after creation", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSliceList({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].name).toBe("01-auth");
		expect(parsed.items[0].status).toBe("created");
		expect(parsed.items[0].epic).toBe("e1");
		expect(parsed.items[0].created).toBeDefined();
		expect(parsed.items[0].completed).toBeNull();

		restore();
	});

	it("filters by --epic flag", async () => {
		initProject();
		setupActivatedEpic("e1");
		// Create two slices under the same epic — epic filter should return both
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "s1", epic: "e1" },
			{ name: "s1", goal: "G1", epic: "e1" },
		);
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "s2", epic: "e1" },
			{ name: "s2", goal: "G2", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		// Filter for e1 — should get both slices
		await runSliceList({ epic: "e1", json: true });
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(2);
		chunks.length = 0;

		// Filter for nonexistent epic — should get none
		await runSliceList({ epic: "nonexistent", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(0);

		restore();
	});

	it("shows human-readable list", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runSliceList({});

		const outputStr = chunks.join("");
		expect(outputStr).toContain("No slices found");

		restore();
	});
});

// ── slice:show ───────────────────────────────────────────────

describe("slice:show", () => {
	it("returns full slice entity as JSON", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth feature", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSliceShow({ slice: "01-auth", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.name).toBe("01-auth");
		expect(parsed.status).toBe("created");
		expect(parsed.goal).toBe("Auth feature");
		expect(parsed.epic).toBe("e1");
		expect(parsed.deferred).toEqual([]);
		expect(parsed.refinement).toBeNull();

		restore();
	});

	it("throws for nonexistent slice", async () => {
		initProject();
		setupActivatedEpic();
		const { restore } = captureStdout();

		await expect(runSliceShow({ slice: "nonexistent", json: true })).rejects.toThrow("not found");

		restore();
	});

	it("shows human-readable slice details", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSliceShow({ slice: "01-auth" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("01-auth");
		expect(outputStr).toContain("created");
		expect(outputStr).toContain("Goal:");
		expect(outputStr).toContain("(epic: e1)");

		restore();
	});
});

// ── slice:plan ───────────────────────────────────────────────

describe("slice:plan", () => {
	it("transitions slice from created to planning", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSlicePlan({ slice: "01-auth", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("created");
		expect(parsed.newStatus).toBe("planning");

		restore();
	});

	it("shows human-readable output", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSlicePlan({ slice: "01-auth" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("01-auth");
		expect(outputStr).toContain("->");
		expect(outputStr).toContain("planning");

		restore();
	});
});

// ── slice:refine-plan ────────────────────────────────────────

describe("slice:refine-plan", () => {
	it("transitions slice from plan-created to refining", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);
		begin(projectDir, "plan", { type: "slice", name: "01-auth", epic: "e1" }, {});
		writeSliceContent("01-auth", "plan.md");
		submit(projectDir, "plan", { type: "slice", name: "01-auth", epic: "e1" }, { phase: "plan" });

		const { chunks, restore } = captureStdout();
		await runSliceRefinePlan({ slice: "01-auth", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("plan-created");
		expect(parsed.newStatus).toBe("refining");

		restore();
	});
});

// ── slice:implement ──────────────────────────────────────────

describe("slice:implement", () => {
	it("transitions slice from plan-refined to implementing", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);
		begin(projectDir, "plan", { type: "slice", name: "01-auth", epic: "e1" }, {});
		writeSliceContent("01-auth", "plan.md");
		submit(projectDir, "plan", { type: "slice", name: "01-auth", epic: "e1" }, { phase: "plan" });
		// Skip refinement
		submit(
			projectDir,
			"refinement",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ phase: "refinement", scores: {} },
		);
		writeSliceContent("01-auth", "plan-refined.md");

		const { chunks, restore } = captureStdout();
		await runSliceImplement({ slice: "01-auth", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("plan-refined");
		expect(parsed.newStatus).toBe("implementing");

		restore();
	});
});

// ── slice:complete ───────────────────────────────────────────

describe("slice:complete", () => {
	it("completes a slice with verification passed", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);
		advanceSliceToImplementationComplete("01-auth");

		const { chunks, restore } = captureStdout();
		await runSliceComplete({ slice: "01-auth", json: true }, { verificationPassed: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("implementation-complete");
		expect(parsed.newStatus).toBe("completed");
		expect(parsed.epicComplete).toBe(true);

		restore();
	});

	it("completes a slice with deferred items and learnings", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "02-api", epic: "e1" },
			{ name: "02-api", goal: "API", epic: "e1" },
		);
		advanceSliceToImplementationComplete("01-auth");

		const { chunks, restore } = captureStdout();
		await runSliceComplete(
			{ slice: "01-auth", json: true },
			{
				verificationPassed: true,
				deferred: [{ description: "Add retry logic", targetSlice: "02-api" }],
				learnings: [
					{
						category: "worked",
						summary: "Zod-first approach",
						detail: "Caught 3 bugs early",
						tags: ["zod"],
						rollupTo: ["epic"],
					},
				],
				architectureDelta: [
					{ subsystem: "data-layer", type: "modify", description: "Added atomic writes" },
				],
			},
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("completed");
		expect(parsed.deferredRouted).toHaveLength(1);
		expect(parsed.learningsRolledUp).toBeDefined();
		expect(parsed.learningsRolledUp.epic).toBeGreaterThanOrEqual(1);

		restore();
	});

	it("shows multi-line human-readable output for complete", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);
		advanceSliceToImplementationComplete("01-auth");

		const { chunks, restore } = captureStdout();
		await runSliceComplete({ slice: "01-auth" }, { verificationPassed: true });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("01-auth");
		expect(outputStr).toContain("->");
		expect(outputStr).toContain("completed");
		expect(outputStr).toContain("Epic complete: yes");

		restore();
	});
});

// ── slice:abandon ────────────────────────────────────────────

describe("slice:abandon", () => {
	it("transitions slice to abandoned with reason", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSliceAbandon({ slice: "01-auth", reason: "Not needed", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("created");
		expect(parsed.newStatus).toBe("abandoned");

		restore();
	});

	it("shows human-readable abandon output", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSliceAbandon({ slice: "01-auth", reason: "Changed plans" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("01-auth");
		expect(outputStr).toContain("->");
		expect(outputStr).toContain("abandoned");

		restore();
	});
});

// ── Output mode tests ────────────────────────────────────────

describe("output modes", () => {
	it("slice:list --quiet suppresses output", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runSliceList({ quiet: true });

		expect(chunks.join("")).toBe("");

		restore();
	});

	it("slice:show --quiet suppresses output", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSliceShow({ slice: "01-auth", quiet: true });

		expect(chunks.join("")).toBe("");

		restore();
	});

	it("slice:plan --quiet suppresses output", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSlicePlan({ slice: "01-auth", quiet: true });

		expect(chunks.join("")).toBe("");

		restore();
	});

	it("slice:complete --quiet suppresses output", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);
		advanceSliceToImplementationComplete("01-auth");

		const { chunks, restore } = captureStdout();
		await runSliceComplete({ slice: "01-auth", quiet: true }, { verificationPassed: true });

		expect(chunks.join("")).toBe("");

		// But slice should still be completed
		const sliceJson = JSON.parse(
			fs.readFileSync(path.join(projectDir, "epics", "e1", "slices", "01-auth", "slice.json"), "utf-8"),
		);
		expect(sliceJson.status).toBe("completed");

		restore();
	});

	it("slice:abandon --quiet suppresses output", async () => {
		initProject();
		setupActivatedEpic();
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ name: "01-auth", goal: "Auth", epic: "e1" },
		);

		const { chunks, restore } = captureStdout();
		await runSliceAbandon({ slice: "01-auth", reason: "Not needed", quiet: true });

		expect(chunks.join("")).toBe("");

		// But slice should still be abandoned
		const sliceJson = JSON.parse(
			fs.readFileSync(path.join(projectDir, "epics", "e1", "slices", "01-auth", "slice.json"), "utf-8"),
		);
		expect(sliceJson.status).toBe("abandoned");

		restore();
	});
});

// ── Full lifecycle walkthrough ───────────────────────────────

describe("full slice lifecycle via CLI commands", () => {
	it("create -> plan -> refine-plan -> implement -> complete", async () => {
		initProject();
		setupActivatedEpic();
		const { chunks, restore } = captureStdout();

		// Create
		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("created");
		chunks.length = 0;

		// Plan
		await runSlicePlan({ slice: "01-auth", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("planning");
		chunks.length = 0;

		// Write plan.md (state machine guards its existence) then submit plan
		writeSliceContent("01-auth", "plan.md");
		submit(projectDir, "plan", { type: "slice", name: "01-auth", epic: "e1" }, { phase: "plan" });

		// Refine plan
		await runSliceRefinePlan({ slice: "01-auth", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("refining");
		chunks.length = 0;

		// Submit refinement (skip via scores)
		submit(
			projectDir,
			"refinement",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ phase: "refinement", scores: {} },
		);

		// Write plan-refined.md (state machine guards its existence) then implement
		writeSliceContent("01-auth", "plan-refined.md");
		await runSliceImplement({ slice: "01-auth", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("implementing");
		chunks.length = 0;

		// Submit implementation
		submit(
			projectDir,
			"implementation",
			{ type: "slice", name: "01-auth", epic: "e1" },
			{ phase: "implementation" },
		);

		// Complete
		await runSliceComplete({ slice: "01-auth", json: true }, { verificationPassed: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("completed");
		expect(parsed.epicComplete).toBe(true);
		chunks.length = 0;

		// List should show the completed slice
		await runSliceList({ json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].status).toBe("completed");

		restore();
	});
});
