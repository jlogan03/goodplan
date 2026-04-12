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
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-slice-planning-"));
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

describe("slice planning workflow (v2)", () => {
	it("full flow: create -> plan-draft -> plan-shape-start -> plan-shape-approve -> plan-commit", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		// Create epic
		await runCommand(
			"../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "test-epic" },
		);
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Create slice
		await runCommand(
			"../../src/commands/slice/create.js",
			"sliceCreateCommand",
			{ epic: "test-epic", json: true },
			{ name: "slice-01", goal: "Planning test" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Draft plan
		await runCommand(
			"../../src/commands/slice/plan-draft.js",
			"slicePlanDraftCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
			{ content: "# Initial Draft\nThis is the initial plan." },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-01");
		// Verify contextBundle is present in plan-draft output
		expect(parsed).toHaveProperty("contextBundle");
		chunks.length = 0;

		// Verify slice-plan-drafted event exists
		let events = readEvents("test-epic");
		const draftEvent = events.find((e: { type: string }) => e.type === "slice-plan-drafted");
		expect(draftEvent).toBeDefined();
		expect(draftEvent.domain).toBe("entity-lifecycle");
		expect(draftEvent.payload.sliceRef).toBe("slice-01");
		expect(draftEvent.payload.plan).toBeDefined();
		expect(draftEvent.payload.plan.sha).toBeTruthy();

		// Plan shape start
		await runCommand("../../src/commands/slice/plan-shape-start.js", "slicePlanShapeStartCommand", {
			epic: "test-epic",
			slice: "slice-01",
			json: true,
		});
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Verify plan-shape-checkpoint-reached event
		events = readEvents("test-epic");
		const shapeStartEvent = events.find(
			(e: { type: string }) => e.type === "plan-shape-checkpoint-reached",
		);
		expect(shapeStartEvent).toBeDefined();
		expect(shapeStartEvent.payload.sliceRef).toBe("slice-01");

		// Plan shape approve
		await runCommand(
			"../../src/commands/slice/plan-shape-approve.js",
			"slicePlanShapeApproveCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Plan commit
		await runCommand(
			"../../src/commands/slice/plan-commit.js",
			"slicePlanCommitCommand",
			{ epic: "test-epic", slice: "slice-01", json: true },
			{ content: validPlanContent },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Verify all events in order
		events = readEvents("test-epic");
		const types = events.map((e: { type: string }) => e.type);
		expect(types).toContain("epic-created");
		expect(types).toContain("slice-created");
		expect(types).toContain("slice-plan-drafted");
		expect(types).toContain("plan-shape-checkpoint-reached");
		expect(types).toContain("plan-shape-approved");
		expect(types).toContain("slice-plan-committed");

		// Verify prevId chain
		for (let i = 1; i < events.length; i++) {
			expect(events[i].prevId).toBe(events[i - 1]?.id);
		}

		restore();
	});

	it("plan-commit before plan-draft fails with INVARIANT_FAILED", async () => {
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

		// Try plan-commit without drafting first
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

		exitSpy.mockRestore();
		restore();
	});

	it("plan-shape-approve without shape-start fails with invariant", async () => {
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

		await runCommand(
			"../../src/commands/slice/plan-draft.js",
			"slicePlanDraftCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ content: "# Draft" },
		);
		chunks.length = 0;

		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		// Try to approve without starting shape checkpoint
		await expect(
			runCommand("../../src/commands/slice/plan-shape-approve.js", "slicePlanShapeApproveCommand", {
				epic: "e1",
				slice: "s1",
				json: true,
			}),
		).rejects.toThrow("process.exit called");

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(false);

		exitSpy.mockRestore();
		restore();
	});

	it("plan-shape-revise stores full content and revision prose", async () => {
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

		await runCommand(
			"../../src/commands/slice/plan-draft.js",
			"slicePlanDraftCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ content: "# Initial plan" },
		);
		chunks.length = 0;

		await runCommand("../../src/commands/slice/plan-shape-start.js", "slicePlanShapeStartCommand", {
			epic: "e1",
			slice: "s1",
			json: true,
		});
		chunks.length = 0;

		// Revise
		await runCommand(
			"../../src/commands/slice/plan-shape-revise.js",
			"slicePlanShapeReviseCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ content: "# Revised plan\nWith improvements.", revision: "Added improvements section" },
		);
		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);

		// Verify event payload
		const events = readEvents("e1");
		const reviseEvent = events.find(
			(e: { type: string }) => e.type === "plan-shape-revision-proposed",
		);
		expect(reviseEvent).toBeDefined();
		expect(reviseEvent.payload.sliceRef).toBe("s1");
		expect(reviseEvent.payload.plan.sha).toBeTruthy();
		expect(reviseEvent.payload.revision).toBe("Added improvements section");

		restore();
	});

	it("plan-shape-auto with auto-shape resolves checkpoint", async () => {
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

		await runCommand(
			"../../src/commands/slice/plan-draft.js",
			"slicePlanDraftCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ content: "# Draft" },
		);
		chunks.length = 0;

		await runCommand("../../src/commands/slice/plan-shape-start.js", "slicePlanShapeStartCommand", {
			epic: "e1",
			slice: "s1",
			json: true,
		});
		chunks.length = 0;

		// Auto-shape
		await runCommand(
			"../../src/commands/slice/plan-shape-auto.js",
			"slicePlanShapeAutoCommand",
			{ epic: "e1", slice: "s1", json: true },
			{},
		);
		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Now plan-commit should work (auto-shape satisfies shape approval requirement)
		await runCommand(
			"../../src/commands/slice/plan-commit.js",
			"slicePlanCommitCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ content: validPlanContent },
		);
		const commitParsed = JSON.parse(chunks.join(""));
		expect(commitParsed.ok).toBe(true);

		restore();
	});
});
