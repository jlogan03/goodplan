import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../../../src/core/rpc/init.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-plan-shape-auto-"));
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

describe("slice:plan-shape-auto (v2)", () => {
	it("defaults preference to best-guess-and-flag", async () => {
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
			{ content: "# Draft plan" },
		);
		chunks.length = 0;

		await runCommand(
			"../../../../src/commands/slice/plan-shape-start.js",
			"slicePlanShapeStartCommand",
			{ epic: "e1", slice: "s1", json: true },
		);
		chunks.length = 0;

		// Auto-shape with no preference (defaults to best-guess-and-flag)
		await runCommand(
			"../../../../src/commands/slice/plan-shape-auto.js",
			"slicePlanShapeAutoCommand",
			{ epic: "e1", slice: "s1", json: true },
			{},
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);

		// Verify event payload
		const eventsPath = path.join(projectDir, "epics", "e1", "events.jsonl");
		const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
		const events = lines.map((l) => JSON.parse(l));
		const autoEvent = events.find(
			(e: { type: string }) => e.type === "plan-shape-checkpoint-auto-shaped",
		);
		expect(autoEvent).toBeDefined();
		expect(autoEvent.payload.preference).toBe("best-guess-and-flag");
		expect(autoEvent.payload.sliceRef).toBe("s1");

		restore();
	});

	it("accepts explicit preference", async () => {
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
			{ content: "# Draft plan" },
		);
		chunks.length = 0;

		await runCommand(
			"../../../../src/commands/slice/plan-shape-start.js",
			"slicePlanShapeStartCommand",
			{ epic: "e1", slice: "s1", json: true },
		);
		chunks.length = 0;

		await runCommand(
			"../../../../src/commands/slice/plan-shape-auto.js",
			"slicePlanShapeAutoCommand",
			{ epic: "e1", slice: "s1", json: true },
			{ preference: "always-consult" },
		);

		const eventsPath = path.join(projectDir, "epics", "e1", "events.jsonl");
		const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
		const events = lines.map((l) => JSON.parse(l));
		const autoEvent = events.find(
			(e: { type: string }) => e.type === "plan-shape-checkpoint-auto-shaped",
		);
		expect(autoEvent.payload.preference).toBe("always-consult");

		restore();
	});

	it("rejects invalid preference", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runCommand(
			"../../../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "e1" },
		);
		chunks.length = 0;

		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			runCommand(
				"../../../../src/commands/slice/plan-shape-auto.js",
				"slicePlanShapeAutoCommand",
				{ epic: "e1", slice: "s1", json: true },
				{ preference: "invalid-preference" },
			),
		).rejects.toThrow("process.exit called");

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(false);
		expect(parsed.code).toBe("VALIDATION_INVALID_INPUT");

		exitSpy.mockRestore();
		restore();
	});
});
