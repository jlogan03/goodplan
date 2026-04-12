import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../src/core/rpc/init.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-slice-completion-"));
	projectDir = path.join(tmpDir, ".goodplan");
	originalCwd = process.cwd();
	process.chdir(tmpDir);
	// git init needed for storeContentRef (git hash-object)
	spawnSync("git", ["init"], { cwd: tmpDir, stdio: "pipe" });
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

async function runCommand(
	importPath: string,
	exportName: string,
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const mod = await import(importPath);
	const def = await mod[exportName];
	if (def.run) {
		await def.run({
			args: { json: true, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

function readEvents(epicName: string) {
	const eventsPath = path.join(projectDir, "epics", epicName, "events.jsonl");
	const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
	return lines.map((l) => JSON.parse(l));
}

// Valid plan content with yaml extract block
const validPlanContent = `---
title: Test Plan
---

# Plan

\`\`\`yaml extract
chunks:
  - id: chunk-1
    description: "Implement feature A"
    expectation: "Feature A works"
    redTest: "test that feature A fails before implementation"
    verificationType: "automated"
chunkDependencies: []
affectedSubsystems:
  - "core"
rollbackPath: "Revert the commit"
\`\`\`
`;

/**
 * Helper: set up a slice with implementation complete (all chunks verified).
 * Returns the stdout capture object.
 */
async function setupSliceReadyForCodeRefine(epicName: string, sliceName: string) {
	const { chunks, restore } = captureStdout();

	// Create epic
	await runCommand(
		"../../src/commands/epic/create.js",
		"epicCreateCommand",
		{ json: true },
		{ name: epicName },
	);
	chunks.length = 0;

	// Create slice
	await runCommand(
		"../../src/commands/slice/create.js",
		"sliceCreateCommand",
		{ epic: epicName, json: true },
		{ name: sliceName, goal: "Completion test" },
	);
	chunks.length = 0;

	// Draft plan
	await runCommand(
		"../../src/commands/slice/plan-draft.js",
		"slicePlanDraftCommand",
		{ epic: epicName, slice: sliceName, json: true },
		{ content: "# Draft plan" },
	);
	chunks.length = 0;

	// Shape start
	await runCommand("../../src/commands/slice/plan-shape-start.js", "slicePlanShapeStartCommand", {
		epic: epicName,
		slice: sliceName,
		json: true,
	});
	chunks.length = 0;

	// Shape approve
	await runCommand(
		"../../src/commands/slice/plan-shape-approve.js",
		"slicePlanShapeApproveCommand",
		{ epic: epicName, slice: sliceName, json: true },
	);
	chunks.length = 0;

	// Plan commit
	await runCommand(
		"../../src/commands/slice/plan-commit.js",
		"slicePlanCommitCommand",
		{ epic: epicName, slice: sliceName, json: true },
		{ content: validPlanContent },
	);
	chunks.length = 0;

	// implement-start
	await runCommand("../../src/commands/slice/implement-start.js", "sliceImplementStartCommand", {
		epic: epicName,
		slice: sliceName,
		json: true,
	});
	chunks.length = 0;

	// TDD cycle for chunk-1
	await runCommand(
		"../../src/commands/slice/chunk-start.js",
		"sliceChunkStartCommand",
		{ epic: epicName, slice: sliceName, chunk: "chunk-1", json: true },
		{ description: "Implement feature A" },
	);
	chunks.length = 0;

	await runCommand(
		"../../src/commands/slice/chunk-red-written.js",
		"sliceChunkRedWrittenCommand",
		{ epic: epicName, slice: sliceName, chunk: "chunk-1", json: true },
		{ testRef: "test('feature A should fail', () => { expect(false).toBe(true); })" },
	);
	chunks.length = 0;

	await runCommand(
		"../../src/commands/slice/chunk-red-failed.js",
		"sliceChunkRedFailedCommand",
		{ epic: epicName, slice: sliceName, chunk: "chunk-1", json: true },
		{ evidence: "Test failed as expected" },
	);
	chunks.length = 0;

	await runCommand(
		"../../src/commands/slice/chunk-green.js",
		"sliceChunkGreenCommand",
		{ epic: epicName, slice: sliceName, chunk: "chunk-1", json: true },
		{ evidence: "All tests pass" },
	);
	chunks.length = 0;

	await runCommand(
		"../../src/commands/slice/chunk-verify.js",
		"sliceChunkVerifyCommand",
		{ epic: epicName, slice: sliceName, chunk: "chunk-1", json: true },
		{ evidence: "Manual verification passed" },
	);
	chunks.length = 0;

	return { chunks, restore };
}

describe("slice code refinement & landing workflow (v2)", () => {
	it("full completion cycle: code-refine-start -> code-refine-commit -> land", async () => {
		initProject();
		const { chunks, restore } = await setupSliceReadyForCodeRefine("test-epic", "slice-01");

		// code-refine-start
		await runCommand(
			"../../src/commands/slice/code-refine-start.js",
			"sliceCodeRefineStartCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
		);
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-01");
		// Verify contextBundle is present (phase-starting command)
		expect(parsed).toHaveProperty("contextBundle");
		chunks.length = 0;

		// code-refine-commit
		await runCommand(
			"../../src/commands/slice/code-refine-commit.js",
			"sliceCodeRefineCommitCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-01");
		chunks.length = 0;

		// land with full payload
		await runCommand(
			"../../src/commands/slice/land.js",
			"sliceLandCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
			{
				deferred: [
					{ type: "task", title: "Fix edge case" },
					{ type: "slice", title: "Handle caching", epic: "other-epic" },
				],
				learnings: [
					{
						category: "worked",
						summary: "TDD caught regressions",
						detail: "Red-green cycle found 3 bugs early",
						tags: ["tdd"],
						rollupTo: ["epic"],
					},
				],
				architectureDelta: [{ subsystem: "cli", change: "Added landing commands" }],
			},
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-01");
		chunks.length = 0;

		// Verify all events in order
		const events = readEvents("test-epic");
		const types = events.map((e: { type: string }) => e.type);
		expect(types).toContain("slice-code-refinement-started");
		expect(types).toContain("code-refinement-converged");
		expect(types).toContain("slice-landed");

		// Verify slice-landed event payload
		const landEvent = events.find((e: { type: string }) => e.type === "slice-landed");
		expect(landEvent.payload.sliceRef).toBe("slice-01");
		expect(landEvent.payload.deferred).toHaveLength(2);
		expect(landEvent.payload.deferred[0].type).toBe("task");
		expect(landEvent.payload.deferred[0].title).toBe("Fix edge case");
		expect(landEvent.payload.deferred[1].epic).toBe("other-epic");
		expect(landEvent.payload.learnings).toHaveLength(1);
		expect(landEvent.payload.learnings[0].category).toBe("worked");
		expect(landEvent.payload.architectureDelta).toHaveLength(1);
		expect(landEvent.payload.architectureDelta[0].subsystem).toBe("cli");
		expect(landEvent.domain).toBe("entity-lifecycle");

		restore();
	});

	it("land with minimal payload (no deferred/learnings/delta)", async () => {
		initProject();
		const { chunks, restore } = await setupSliceReadyForCodeRefine("test-epic", "slice-01");

		// code-refine-start
		await runCommand(
			"../../src/commands/slice/code-refine-start.js",
			"sliceCodeRefineStartCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
		);
		chunks.length = 0;

		// code-refine-commit
		await runCommand(
			"../../src/commands/slice/code-refine-commit.js",
			"sliceCodeRefineCommitCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
		);
		chunks.length = 0;

		// land with empty stdin
		await runCommand("../../src/commands/slice/land.js", "sliceLandCommand", {
			epic: "test-epic",
			slice: "slice-01",
			json: true,
		});
		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Verify slice-landed event has only sliceRef
		const events = readEvents("test-epic");
		const landEvent = events.find((e: { type: string }) => e.type === "slice-landed");
		expect(landEvent.payload.sliceRef).toBe("slice-01");
		expect(landEvent.payload.deferred).toBeUndefined();
		expect(landEvent.payload.learnings).toBeUndefined();
		expect(landEvent.payload.architectureDelta).toBeUndefined();

		restore();
	});

	it("land before code-refine-commit triggers INVARIANT_FAILED", async () => {
		initProject();
		const { chunks, restore } = await setupSliceReadyForCodeRefine("test-epic", "slice-01");

		// code-refine-start (but skip code-refine-commit)
		await runCommand(
			"../../src/commands/slice/code-refine-start.js",
			"sliceCodeRefineStartCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
		);
		chunks.length = 0;

		// Try to land without code-refine-commit
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			runCommand("../../src/commands/slice/land.js", "sliceLandCommand", {
				epic: "test-epic",
				slice: "slice-01",
				json: true,
			}),
		).rejects.toThrow("process.exit called");

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(false);
		expect(parsed.code).toBe("slice.code-refinement-converged-before-land");

		exitSpy.mockRestore();
		restore();
	});

	it("code-refine-commit before code-refine-start triggers INVARIANT_FAILED", async () => {
		initProject();
		const { chunks, restore } = await setupSliceReadyForCodeRefine("test-epic", "slice-01");

		// Try code-refine-commit without code-refine-start
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			runCommand("../../src/commands/slice/code-refine-commit.js", "sliceCodeRefineCommitCommand", {
				epic: "test-epic",
				slice: "slice-01",
				json: true,
			}),
		).rejects.toThrow("process.exit called");

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(false);
		expect(parsed.code).toBe("slice.code-refinement-started-before-converged");

		exitSpy.mockRestore();
		restore();
	});

	it("code-refine-start with undecided chunks triggers INVARIANT_FAILED", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		// Create epic + slice with plan
		await runCommand(
			"../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "test-epic" },
		);
		chunks.length = 0;

		await runCommand(
			"../../src/commands/slice/create.js",
			"sliceCreateCommand",
			{ epic: "test-epic", json: true },
			{ name: "slice-01", goal: "Test" },
		);
		chunks.length = 0;

		await runCommand(
			"../../src/commands/slice/plan-draft.js",
			"slicePlanDraftCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
			{ content: "# Draft" },
		);
		chunks.length = 0;

		await runCommand("../../src/commands/slice/plan-shape-start.js", "slicePlanShapeStartCommand", {
			epic: "test-epic",
			slice: "slice-01",
			json: true,
		});
		chunks.length = 0;

		await runCommand(
			"../../src/commands/slice/plan-shape-approve.js",
			"slicePlanShapeApproveCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
		);
		chunks.length = 0;

		await runCommand(
			"../../src/commands/slice/plan-commit.js",
			"slicePlanCommitCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
			{ content: validPlanContent },
		);
		chunks.length = 0;

		await runCommand("../../src/commands/slice/implement-start.js", "sliceImplementStartCommand", {
			epic: "test-epic",
			slice: "slice-01",
			json: true,
		});
		chunks.length = 0;

		// Start chunk but don't verify it
		await runCommand(
			"../../src/commands/slice/chunk-start.js",
			"sliceChunkStartCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ description: "Feature A" },
		);
		chunks.length = 0;

		// Try code-refine-start with undecided chunk
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			runCommand("../../src/commands/slice/code-refine-start.js", "sliceCodeRefineStartCommand", {
				epic: "test-epic",
				slice: "slice-01",
				json: true,
			}),
		).rejects.toThrow("process.exit called");

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(false);
		expect(parsed.code).toBe("slice.chunks-all-decided-before-code-refine");

		exitSpy.mockRestore();
		restore();
	});
});
