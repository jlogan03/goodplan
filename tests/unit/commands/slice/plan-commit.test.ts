import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../../../src/core/rpc/init.js";
import { slicePlanCommittedPayloadSchema } from "../../../../src/schemas/events/slice.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-plan-commit-"));
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
	const stdinModule = await import("../../../../src/util/stdin.js");
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

// Valid plan content with yaml extract block for the extractor
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

describe("slice:plan-commit (v2)", () => {
	it("emits slice-plan-committed with extract in payload", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		// Create epic
		await runCommand(
			"../../../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "e1" },
		);
		chunks.length = 0;

		// Create slice
		await runCommand(
			"../../../../src/commands/slice/create.js",
			"sliceCreateCommand",
			{ epic: "e1", json: true },
			{ name: "s1" },
		);
		chunks.length = 0;

		// Draft plan first (required by invariant)
		await runCommand(
			"../../../../src/commands/slice/plan-draft.js",
			"slicePlanDraftCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ content: validPlanContent },
		);
		chunks.length = 0;

		// Shape start
		await runCommand(
			"../../../../src/commands/slice/plan-shape-start.js",
			"slicePlanShapeStartCommand",
			{ epic: "e1", slice: "s1", json: true },
		);
		chunks.length = 0;

		// Shape approve
		await runCommand(
			"../../../../src/commands/slice/plan-shape-approve.js",
			"slicePlanShapeApproveCommand",
			{ epic: "e1", slice: "s1", json: true },
		);
		chunks.length = 0;

		// Commit plan
		await runCommand(
			"../../../../src/commands/slice/plan-commit.js",
			"slicePlanCommitCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ content: validPlanContent },
		);

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:s1");

		// Verify the event payload matches the schema
		const eventsPath = path.join(projectDir, "epics", "e1", "events.jsonl");
		const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
		const events = lines.map((l) => JSON.parse(l));
		const commitEvent = events.find((e: { type: string }) => e.type === "slice-plan-committed");
		expect(commitEvent).toBeDefined();
		expect(commitEvent.domain).toBe("entity-lifecycle");

		const payloadResult = slicePlanCommittedPayloadSchema.safeParse(commitEvent.payload);
		expect(payloadResult.success).toBe(true);
		if (payloadResult.success) {
			expect(payloadResult.data.sliceRef).toBe("s1");
			expect(payloadResult.data.plan.sha).toBeTruthy();
			expect(payloadResult.data.extract.chunks).toHaveLength(1);
			expect(payloadResult.data.extract.chunks[0]?.id).toBe("chunk-1");
		}

		restore();
	});

	it("rejects invalid plan content that fails extraction", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runCommand(
			"../../../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "e1" },
		);
		chunks.length = 0;

		await runCommand(
			"../../../../src/commands/slice/create.js",
			"sliceCreateCommand",
			{ epic: "e1", json: true },
			{ name: "s1" },
		);
		chunks.length = 0;

		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		// Try to commit without valid yaml extract block
		await expect(
			runCommand(
				"../../../../src/commands/slice/plan-commit.js",
				"slicePlanCommitCommand",
				{ epic: "e1", slice: "s1", json: true },
				{ content: "# Just a plain plan\nNo extract block here." },
			),
		).rejects.toThrow("process.exit called");

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.ok).toBe(false);
		expect(parsed.code).toBe("EXTRACTION_FAILED");

		exitSpy.mockRestore();
		restore();
	});

	it("returns MutatingCommandOutput shape", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runCommand(
			"../../../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "e1" },
		);
		chunks.length = 0;

		await runCommand(
			"../../../../src/commands/slice/create.js",
			"sliceCreateCommand",
			{ epic: "e1", json: true },
			{ name: "s1" },
		);
		chunks.length = 0;

		await runCommand(
			"../../../../src/commands/slice/plan-draft.js",
			"slicePlanDraftCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ content: validPlanContent },
		);
		chunks.length = 0;

		await runCommand(
			"../../../../src/commands/slice/plan-shape-start.js",
			"slicePlanShapeStartCommand",
			{ epic: "e1", slice: "s1", json: true },
		);
		chunks.length = 0;

		await runCommand(
			"../../../../src/commands/slice/plan-shape-approve.js",
			"slicePlanShapeApproveCommand",
			{ epic: "e1", slice: "s1", json: true },
		);
		chunks.length = 0;

		await runCommand(
			"../../../../src/commands/slice/plan-commit.js",
			"slicePlanCommitCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ content: validPlanContent },
		);

		const parsed = JSON.parse(chunks.join(""));
		// MutatingCommandOutput: { ok: true, event: string, entity: string }
		expect(parsed).toMatchObject({
			ok: true,
			event: expect.any(String),
			entity: "slice:s1",
		});

		restore();
	});
});
