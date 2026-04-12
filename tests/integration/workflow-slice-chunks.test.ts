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
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-slice-chunks-"));
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
  - id: chunk-2
    description: "Implement feature B"
    expectation: "Feature B works"
    redTest: "test that feature B fails before implementation"
    verificationType: "manual"
chunkDependencies: []
affectedSubsystems:
  - "core"
rollbackPath: "Revert the commit"
\`\`\`
`;

/**
 * Helper: set up a slice with a committed plan, ready for implementation.
 * Returns the stdout capture object.
 */
async function setupSliceWithPlan(epicName: string, sliceName: string) {
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
		{ name: sliceName, goal: "Chunk test" },
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

	return { chunks, restore };
}

describe("slice implementation & chunk workflow (v2)", () => {
	it("full TDD chunk cycle: implement-start -> chunk-start -> red-written -> red-failed -> green -> verify", async () => {
		initProject();
		const { chunks, restore } = await setupSliceWithPlan("test-epic", "slice-01");

		// implement-start
		await runCommand("../../src/commands/slice/implement-start.js", "sliceImplementStartCommand", {
			epic: "test-epic",
			slice: "slice-01",
			json: true,
		});
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-01");
		// Verify contextBundle is present
		expect(parsed).toHaveProperty("contextBundle");
		chunks.length = 0;

		// chunk-start
		await runCommand(
			"../../src/commands/slice/chunk-start.js",
			"sliceChunkStartCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ description: "Implement feature A" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-01:chunk-1");
		chunks.length = 0;

		// chunk-red-written
		await runCommand(
			"../../src/commands/slice/chunk-red-written.js",
			"sliceChunkRedWrittenCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ testRef: "test('feature A should fail', () => { expect(false).toBe(true); })" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// chunk-red-failed
		await runCommand(
			"../../src/commands/slice/chunk-red-failed.js",
			"sliceChunkRedFailedCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ evidence: "Test failed as expected: AssertionError" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// chunk-green
		await runCommand(
			"../../src/commands/slice/chunk-green.js",
			"sliceChunkGreenCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ evidence: "All tests pass after implementation" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// chunk-verify
		await runCommand(
			"../../src/commands/slice/chunk-verify.js",
			"sliceChunkVerifyCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ evidence: "Manual verification: feature A works as expected" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Verify all events in order
		const events = readEvents("test-epic");
		const types = events.map((e: { type: string }) => e.type);
		expect(types).toContain("slice-implementation-started");
		expect(types).toContain("slice-implementation-chunk-started");
		expect(types).toContain("chunk-red-test-written");
		expect(types).toContain("chunk-red-test-failed");
		expect(types).toContain("chunk-green-achieved");
		expect(types).toContain("chunk-verified");

		// Verify chunk events have correct payloads
		const chunkStartEvent = events.find(
			(e: { type: string }) => e.type === "slice-implementation-chunk-started",
		);
		expect(chunkStartEvent.payload.sliceRef).toBe("slice-01");
		expect(chunkStartEvent.payload.chunkId).toBe("chunk-1");
		expect(chunkStartEvent.payload.description).toBe("Implement feature A");
		expect(chunkStartEvent.domain).toBe("entity-lifecycle");

		restore();
	});

	it("unverifiable path: chunk-start -> red-written -> red-failed -> green -> unverifiable -> decide", async () => {
		initProject();
		const { chunks, restore } = await setupSliceWithPlan("test-epic", "slice-01");

		// implement-start
		await runCommand("../../src/commands/slice/implement-start.js", "sliceImplementStartCommand", {
			epic: "test-epic",
			slice: "slice-01",
			json: true,
		});
		chunks.length = 0;

		// chunk-start
		await runCommand(
			"../../src/commands/slice/chunk-start.js",
			"sliceChunkStartCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-2", json: true },
			{ description: "Implement feature B" },
		);
		chunks.length = 0;

		// red-written
		await runCommand(
			"../../src/commands/slice/chunk-red-written.js",
			"sliceChunkRedWrittenCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-2", json: true },
			{ testRef: "test content" },
		);
		chunks.length = 0;

		// red-failed
		await runCommand(
			"../../src/commands/slice/chunk-red-failed.js",
			"sliceChunkRedFailedCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-2", json: true },
			{ evidence: "Red failed as expected" },
		);
		chunks.length = 0;

		// green
		await runCommand(
			"../../src/commands/slice/chunk-green.js",
			"sliceChunkGreenCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-2", json: true },
			{ evidence: "Tests pass" },
		);
		chunks.length = 0;

		// unverifiable
		await runCommand(
			"../../src/commands/slice/chunk-unverifiable.js",
			"sliceChunkUnverifiableCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-2", json: true },
			{ reason: "Requires external service not available in CI" },
		);
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// decide
		await runCommand(
			"../../src/commands/slice/chunk-decide.js",
			"sliceChunkDecideCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-2", json: true },
			{ decision: "accept", reason: "Covered by integration test in staging" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Verify events
		const events = readEvents("test-epic");
		const types = events.map((e: { type: string }) => e.type);
		expect(types).toContain("chunk-unverifiable");
		expect(types).toContain("chunk-unverifiable-decided");

		const decideEvent = events.find(
			(e: { type: string }) => e.type === "chunk-unverifiable-decided",
		);
		expect(decideEvent.payload.decision).toBe("accept");
		expect(decideEvent.payload.reason).toBe("Covered by integration test in staging");

		restore();
	});

	it("chunk-green without red-failed triggers INVARIANT_FAILED", async () => {
		initProject();
		const { chunks, restore } = await setupSliceWithPlan("test-epic", "slice-01");

		// implement-start
		await runCommand("../../src/commands/slice/implement-start.js", "sliceImplementStartCommand", {
			epic: "test-epic",
			slice: "slice-01",
			json: true,
		});
		chunks.length = 0;

		// chunk-start
		await runCommand(
			"../../src/commands/slice/chunk-start.js",
			"sliceChunkStartCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ description: "Feature A" },
		);
		chunks.length = 0;

		// red-written (needed to have chunk in progress)
		await runCommand(
			"../../src/commands/slice/chunk-red-written.js",
			"sliceChunkRedWrittenCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ testRef: "test content" },
		);
		chunks.length = 0;

		// Skip red-failed -> try green directly
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			runCommand(
				"../../src/commands/slice/chunk-green.js",
				"sliceChunkGreenCommand",
				{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
				{ evidence: "Tests pass" },
			),
		).rejects.toThrow("process.exit called");

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(false);
		expect(parsed.code).toBe("chunk.red-test-failed-before-green");

		exitSpy.mockRestore();
		restore();
	});

	it("red-failed on chunk-A does not satisfy green on chunk-B (cross-chunk scoping)", async () => {
		initProject();
		const { chunks, restore } = await setupSliceWithPlan("test-epic", "slice-01");

		// implement-start
		await runCommand("../../src/commands/slice/implement-start.js", "sliceImplementStartCommand", {
			epic: "test-epic",
			slice: "slice-01",
			json: true,
		});
		chunks.length = 0;

		// Start chunk-A and go through red cycle
		await runCommand(
			"../../src/commands/slice/chunk-start.js",
			"sliceChunkStartCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-A", json: true },
			{ description: "Feature A" },
		);
		chunks.length = 0;

		await runCommand(
			"../../src/commands/slice/chunk-red-written.js",
			"sliceChunkRedWrittenCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-A", json: true },
			{ testRef: "test A" },
		);
		chunks.length = 0;

		await runCommand(
			"../../src/commands/slice/chunk-red-failed.js",
			"sliceChunkRedFailedCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-A", json: true },
			{ evidence: "Failed as expected" },
		);
		chunks.length = 0;

		// Start chunk-B — try green without its own red-failed
		await runCommand(
			"../../src/commands/slice/chunk-start.js",
			"sliceChunkStartCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-B", json: true },
			{ description: "Feature B" },
		);
		chunks.length = 0;

		await runCommand(
			"../../src/commands/slice/chunk-red-written.js",
			"sliceChunkRedWrittenCommand",
			{ epic: "test-epic", slice: "slice-01", chunk: "chunk-B", json: true },
			{ testRef: "test B" },
		);
		chunks.length = 0;

		// chunk-B green should fail — chunk-A's red-failed doesn't count for chunk-B
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			runCommand(
				"../../src/commands/slice/chunk-green.js",
				"sliceChunkGreenCommand",
				{ epic: "test-epic", slice: "slice-01", chunk: "chunk-B", json: true },
				{ evidence: "Tests pass" },
			),
		).rejects.toThrow("process.exit called");

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(false);
		expect(parsed.code).toBe("chunk.red-test-failed-before-green");

		exitSpy.mockRestore();
		restore();
	});

	it("chunk-start before implement-start triggers INVARIANT_FAILED", async () => {
		initProject();
		const { chunks, restore } = await setupSliceWithPlan("test-epic", "slice-01");

		// Skip implement-start -> try chunk-start directly
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			runCommand(
				"../../src/commands/slice/chunk-start.js",
				"sliceChunkStartCommand",
				{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
				{ description: "Feature A" },
			),
		).rejects.toThrow("process.exit called");

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(false);
		expect(parsed.code).toBe("slice.implementation-started-before-chunk");

		exitSpy.mockRestore();
		restore();
	});

	it("chunk-decide validates decision enum", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		// Create epic
		await runCommand(
			"../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "test-epic" },
		);
		chunks.length = 0;

		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		// Try invalid decision value
		await expect(
			runCommand(
				"../../src/commands/slice/chunk-decide.js",
				"sliceChunkDecideCommand",
				{ epic: "test-epic", slice: "slice-01", chunk: "chunk-1", json: true },
				{ decision: "invalid-value", reason: "test" },
			),
		).rejects.toThrow("process.exit called");

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(false);
		expect(parsed.code).toBe("VALIDATION_INVALID_INPUT");

		exitSpy.mockRestore();
		restore();
	});
});
