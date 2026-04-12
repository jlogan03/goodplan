/**
 * Full lifecycle integration test for the slice command surface.
 *
 * Exercises the ENTIRE lifecycle in a single test:
 *   init -> epic:create -> epic:activate -> slice:create -> plan-draft ->
 *   plan-shape-start -> plan-shape-approve -> plan-commit -> implement-start ->
 *   chunk-start -> chunk-red-written -> chunk-red-failed -> chunk-green ->
 *   chunk-verify -> code-refine-start -> code-refine-commit -> land
 *
 * Also includes negative invariant tests verifying that out-of-order
 * transitions produce INVARIANT_FAILED errors.
 */
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
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-slice-lifecycle-"));
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

// Valid plan content with yaml extract block (single chunk for lifecycle test)
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

describe("slice full lifecycle integration (v2)", () => {
	it("walks the ENTIRE lifecycle from init through landing", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		// 1. epic:create
		await runCommand(
			"../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "lifecycle-epic" },
		);
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 2. slice:create
		await runCommand(
			"../../src/commands/slice/create.js",
			"sliceCreateCommand",
			{ epic: "lifecycle-epic", json: true },
			{ name: "slice-01", goal: "Full lifecycle test" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-01");
		chunks.length = 0;

		// 4. slice:plan-draft
		await runCommand(
			"../../src/commands/slice/plan-draft.js",
			"slicePlanDraftCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", json: true },
			{ content: "# Initial Draft\nThis is the initial plan." },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed).toHaveProperty("contextBundle");
		chunks.length = 0;

		// 5. slice:plan-shape-start
		await runCommand("../../src/commands/slice/plan-shape-start.js", "slicePlanShapeStartCommand", {
			epic: "lifecycle-epic",
			slice: "slice-01",
			json: true,
		});
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 6. slice:plan-shape-approve
		await runCommand(
			"../../src/commands/slice/plan-shape-approve.js",
			"slicePlanShapeApproveCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", json: true },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 7. slice:plan-commit
		await runCommand(
			"../../src/commands/slice/plan-commit.js",
			"slicePlanCommitCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", json: true },
			{ content: validPlanContent },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 8. slice:implement-start
		await runCommand("../../src/commands/slice/implement-start.js", "sliceImplementStartCommand", {
			epic: "lifecycle-epic",
			slice: "slice-01",
			json: true,
		});
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed).toHaveProperty("contextBundle");
		chunks.length = 0;

		// 9. slice:chunk-start
		await runCommand(
			"../../src/commands/slice/chunk-start.js",
			"sliceChunkStartCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ description: "Implement feature A" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 10. slice:chunk-red-written
		await runCommand(
			"../../src/commands/slice/chunk-red-written.js",
			"sliceChunkRedWrittenCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ testRef: "test('feature A should fail', () => { expect(false).toBe(true); })" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 11. slice:chunk-red-failed
		await runCommand(
			"../../src/commands/slice/chunk-red-failed.js",
			"sliceChunkRedFailedCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ evidence: "Test failed as expected: AssertionError" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 12. slice:chunk-green
		await runCommand(
			"../../src/commands/slice/chunk-green.js",
			"sliceChunkGreenCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ evidence: "All tests pass after implementation" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 13. slice:chunk-verify
		await runCommand(
			"../../src/commands/slice/chunk-verify.js",
			"sliceChunkVerifyCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", chunk: "chunk-1", json: true },
			{ evidence: "Manual verification: feature A works as expected" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 14. slice:code-refine-start
		await runCommand(
			"../../src/commands/slice/code-refine-start.js",
			"sliceCodeRefineStartCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", json: true },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed).toHaveProperty("contextBundle");
		chunks.length = 0;

		// 15. slice:code-refine-commit
		await runCommand(
			"../../src/commands/slice/code-refine-commit.js",
			"sliceCodeRefineCommitCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", json: true },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// 16. slice:land
		await runCommand(
			"../../src/commands/slice/land.js",
			"sliceLandCommand",
			{ epic: "lifecycle-epic", slice: "slice-01", json: true },
			{
				deferred: [{ type: "task", title: "Follow-up cleanup" }],
				learnings: [
					{
						category: "worked",
						summary: "TDD caught bugs early",
						detail: "Red-green cycle found issues",
						tags: ["tdd"],
						rollupTo: ["epic"],
					},
				],
				architectureDelta: [{ subsystem: "cli", change: "Added lifecycle commands" }],
			},
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-01");
		chunks.length = 0;

		// --- Post-landing verification ---

		// Verify slice:show returns landed state
		await runCommand("../../src/commands/slice/show.js", "sliceShowCommand", {
			epic: "lifecycle-epic",
			slice: "slice-01",
			json: true,
		});
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		// P12 is the landed phase in the slice state machine
		expect(parsed.phase).toBe("P12");
		expect(parsed.abandoned).toBe(false);
		chunks.length = 0;

		// Verify event log contains all expected events in correct order
		const events = readEvents("lifecycle-epic");
		const types = events.map((e: { type: string }) => e.type);

		const expectedEventOrder = [
			"epic-created",
			"slice-created",
			"slice-plan-drafted",
			"plan-shape-checkpoint-reached",
			"plan-shape-approved",
			"slice-plan-committed",
			"slice-implementation-started",
			"slice-implementation-chunk-started",
			"chunk-red-test-written",
			"chunk-red-test-failed",
			"chunk-green-achieved",
			"chunk-verified",
			"slice-code-refinement-started",
			"code-refinement-converged",
			"slice-landed",
		];

		// All expected events must be present
		for (const expectedType of expectedEventOrder) {
			expect(types, `Missing event: ${expectedType}`).toContain(expectedType);
		}

		// Events must appear in the correct relative order
		for (let i = 0; i < expectedEventOrder.length - 1; i++) {
			const current = expectedEventOrder[i];
			const next = expectedEventOrder[i + 1];
			const currentIdx = types.indexOf(current);
			const nextIdx = types.indexOf(next);
			expect(currentIdx, `${current} should appear before ${next}`).toBeLessThan(nextIdx);
		}

		// Verify prevId chain integrity
		for (let i = 1; i < events.length; i++) {
			expect(events[i].prevId).toBe(events[i - 1]?.id);
		}

		restore();
	});

	describe("negative invariant tests", () => {
		it("plan-commit without plan-draft -> INVARIANT_FAILED", async () => {
			initProject();
			const { chunks, restore } = captureStdout();

			await runCommand(
				"../../src/commands/epic/create.js",
				"epicCreateCommand",
				{ json: true },
				{ name: "e1" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/create.js",
				"sliceCreateCommand",
				{ epic: "e1", json: true },
				{ name: "s1" },
			);
			chunks.length = 0;

			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(
				runCommand(
					"../../src/commands/slice/plan-commit.js",
					"slicePlanCommitCommand",
					{ epic: "e1", slice: "s1", json: true },
					{ content: validPlanContent },
				),
			).rejects.toThrow("process.exit called");

			const parsed = JSON.parse(chunks.join(""));
			expect(parsed.ok).toBe(false);
			expect(parsed.code).toBe("slice.plan-drafted-before-commit");

			exitSpy.mockRestore();
			restore();
		});

		it("implement-start without plan-commit -> INVARIANT_FAILED", async () => {
			initProject();
			const { chunks, restore } = captureStdout();

			await runCommand(
				"../../src/commands/epic/create.js",
				"epicCreateCommand",
				{ json: true },
				{ name: "e1" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/create.js",
				"sliceCreateCommand",
				{ epic: "e1", json: true },
				{ name: "s1" },
			);
			chunks.length = 0;

			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(
				runCommand("../../src/commands/slice/implement-start.js", "sliceImplementStartCommand", {
					epic: "e1",
					slice: "s1",
					json: true,
				}),
			).rejects.toThrow("process.exit called");

			const parsed = JSON.parse(chunks.join(""));
			expect(parsed.ok).toBe(false);
			expect(parsed.code).toBe("slice.plan-converged-before-implement");

			exitSpy.mockRestore();
			restore();
		});

		it("chunk-green without chunk-red-failed -> INVARIANT_FAILED", async () => {
			initProject();
			const { chunks, restore } = captureStdout();

			// Setup through implement-start
			await runCommand(
				"../../src/commands/epic/create.js",
				"epicCreateCommand",
				{ json: true },
				{ name: "e1" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/create.js",
				"sliceCreateCommand",
				{ epic: "e1", json: true },
				{ name: "s1", goal: "Test" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-draft.js",
				"slicePlanDraftCommand",
				{ epic: "e1", slice: "s1", json: true },
				{ content: "# Draft" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-shape-start.js",
				"slicePlanShapeStartCommand",
				{
					epic: "e1",
					slice: "s1",
					json: true,
				},
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-shape-approve.js",
				"slicePlanShapeApproveCommand",
				{ epic: "e1", slice: "s1", json: true },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-commit.js",
				"slicePlanCommitCommand",
				{ epic: "e1", slice: "s1", json: true },
				{ content: validPlanContent },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/implement-start.js",
				"sliceImplementStartCommand",
				{
					epic: "e1",
					slice: "s1",
					json: true,
				},
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/chunk-start.js",
				"sliceChunkStartCommand",
				{ epic: "e1", slice: "s1", chunk: "chunk-1", json: true },
				{ description: "Feature A" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/chunk-red-written.js",
				"sliceChunkRedWrittenCommand",
				{ epic: "e1", slice: "s1", chunk: "chunk-1", json: true },
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
					{ epic: "e1", slice: "s1", chunk: "chunk-1", json: true },
					{ evidence: "Tests pass" },
				),
			).rejects.toThrow("process.exit called");

			const parsed = JSON.parse(chunks.join(""));
			expect(parsed.ok).toBe(false);
			expect(parsed.code).toBe("chunk.red-test-failed-before-green");

			exitSpy.mockRestore();
			restore();
		});

		it("code-refine-start with undecided chunks -> INVARIANT_FAILED", async () => {
			initProject();
			const { chunks, restore } = captureStdout();

			await runCommand(
				"../../src/commands/epic/create.js",
				"epicCreateCommand",
				{ json: true },
				{ name: "e1" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/create.js",
				"sliceCreateCommand",
				{ epic: "e1", json: true },
				{ name: "s1", goal: "Test" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-draft.js",
				"slicePlanDraftCommand",
				{ epic: "e1", slice: "s1", json: true },
				{ content: "# Draft" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-shape-start.js",
				"slicePlanShapeStartCommand",
				{
					epic: "e1",
					slice: "s1",
					json: true,
				},
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-shape-approve.js",
				"slicePlanShapeApproveCommand",
				{ epic: "e1", slice: "s1", json: true },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-commit.js",
				"slicePlanCommitCommand",
				{ epic: "e1", slice: "s1", json: true },
				{ content: validPlanContent },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/implement-start.js",
				"sliceImplementStartCommand",
				{
					epic: "e1",
					slice: "s1",
					json: true,
				},
			);
			chunks.length = 0;

			// Start chunk but don't complete TDD cycle
			await runCommand(
				"../../src/commands/slice/chunk-start.js",
				"sliceChunkStartCommand",
				{ epic: "e1", slice: "s1", chunk: "chunk-1", json: true },
				{ description: "Feature A" },
			);
			chunks.length = 0;

			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(
				runCommand("../../src/commands/slice/code-refine-start.js", "sliceCodeRefineStartCommand", {
					epic: "e1",
					slice: "s1",
					json: true,
				}),
			).rejects.toThrow("process.exit called");

			const parsed = JSON.parse(chunks.join(""));
			expect(parsed.ok).toBe(false);
			expect(parsed.code).toBe("slice.chunks-all-decided-before-code-refine");

			exitSpy.mockRestore();
			restore();
		});

		it("land without code-refinement-converged -> INVARIANT_FAILED", async () => {
			initProject();
			const { chunks, restore } = captureStdout();

			// Setup through code-refine-start (but skip code-refine-commit)
			await runCommand(
				"../../src/commands/epic/create.js",
				"epicCreateCommand",
				{ json: true },
				{ name: "e1" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/create.js",
				"sliceCreateCommand",
				{ epic: "e1", json: true },
				{ name: "s1", goal: "Test" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-draft.js",
				"slicePlanDraftCommand",
				{ epic: "e1", slice: "s1", json: true },
				{ content: "# Draft" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-shape-start.js",
				"slicePlanShapeStartCommand",
				{
					epic: "e1",
					slice: "s1",
					json: true,
				},
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-shape-approve.js",
				"slicePlanShapeApproveCommand",
				{ epic: "e1", slice: "s1", json: true },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/plan-commit.js",
				"slicePlanCommitCommand",
				{ epic: "e1", slice: "s1", json: true },
				{ content: validPlanContent },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/implement-start.js",
				"sliceImplementStartCommand",
				{
					epic: "e1",
					slice: "s1",
					json: true,
				},
			);
			chunks.length = 0;

			// Complete chunk TDD cycle
			await runCommand(
				"../../src/commands/slice/chunk-start.js",
				"sliceChunkStartCommand",
				{ epic: "e1", slice: "s1", chunk: "chunk-1", json: true },
				{ description: "Feature A" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/chunk-red-written.js",
				"sliceChunkRedWrittenCommand",
				{ epic: "e1", slice: "s1", chunk: "chunk-1", json: true },
				{ testRef: "test content" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/chunk-red-failed.js",
				"sliceChunkRedFailedCommand",
				{ epic: "e1", slice: "s1", chunk: "chunk-1", json: true },
				{ evidence: "Failed as expected" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/chunk-green.js",
				"sliceChunkGreenCommand",
				{ epic: "e1", slice: "s1", chunk: "chunk-1", json: true },
				{ evidence: "Tests pass" },
			);
			chunks.length = 0;

			await runCommand(
				"../../src/commands/slice/chunk-verify.js",
				"sliceChunkVerifyCommand",
				{ epic: "e1", slice: "s1", chunk: "chunk-1", json: true },
				{ evidence: "Verified" },
			);
			chunks.length = 0;

			// code-refine-start but skip code-refine-commit
			await runCommand(
				"../../src/commands/slice/code-refine-start.js",
				"sliceCodeRefineStartCommand",
				{ epic: "e1", slice: "s1", json: true },
			);
			chunks.length = 0;

			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(
				runCommand("../../src/commands/slice/land.js", "sliceLandCommand", {
					epic: "e1",
					slice: "s1",
					json: true,
				}),
			).rejects.toThrow("process.exit called");

			const parsed = JSON.parse(chunks.join(""));
			expect(parsed.ok).toBe(false);
			expect(parsed.code).toBe("slice.code-refinement-converged-before-land");

			exitSpy.mockRestore();
			restore();
		});
	});
});
