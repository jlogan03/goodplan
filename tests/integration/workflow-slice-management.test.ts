import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../src/core/rpc/init.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-slice-mgmt-"));
	projectDir = path.join(tmpDir, ".goodplan");
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

describe("slice management workflow (v2)", () => {
	it("create -> list -> show -> abandon full lifecycle", async () => {
		initProject();

		// Create epic first
		const { chunks, restore } = captureStdout();
		await runCommand(
			"../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "test-epic" },
		);
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Create first slice
		await runCommand(
			"../../src/commands/slice/create.js",
			"sliceCreateCommand",
			{ epic: "test-epic", json: true },
			{ name: "slice-01", goal: "First feature" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-01");
		chunks.length = 0;

		// Create second slice
		await runCommand(
			"../../src/commands/slice/create.js",
			"sliceCreateCommand",
			{ epic: "test-epic", json: true },
			{ name: "slice-02", goal: "Second feature" },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-02");
		chunks.length = 0;

		// List slices
		await runCommand("../../src/commands/slice/list.js", "sliceListCommand", {
			epic: "test-epic",
			json: true,
		});
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(2);
		expect(parsed.total).toBe(2);
		const sliceDirs = parsed.items.map((s: { dir: string }) => s.dir);
		expect(sliceDirs).toContain("slice-01");
		expect(sliceDirs).toContain("slice-02");
		chunks.length = 0;

		// Show a specific slice
		await runCommand("../../src/commands/slice/show.js", "sliceShowCommand", {
			epic: "test-epic",
			slice: "slice-01",
			json: true,
		});
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.dir).toBe("slice-01");
		expect(parsed.abandoned).toBe(false);
		chunks.length = 0;

		// Abandon slice-02
		await runCommand("../../src/commands/slice/abandon.js", "sliceAbandonCommand", {
			epic: "test-epic",
			slice: "slice-02",
			reason: "No longer needed",
			json: true,
		});
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:slice-02");
		chunks.length = 0;

		// Show abandoned slice
		await runCommand("../../src/commands/slice/show.js", "sliceShowCommand", {
			epic: "test-epic",
			slice: "slice-02",
			json: true,
		});
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.abandoned).toBe(true);
		chunks.length = 0;

		// List should still show both (abandoned is still listed)
		await runCommand("../../src/commands/slice/list.js", "sliceListCommand", {
			epic: "test-epic",
			json: true,
		});
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(2);
		const abandonedItem = parsed.items.find((s: { dir: string }) => s.dir === "slice-02");
		expect(abandonedItem?.abandoned).toBe(true);

		restore();
	});

	it("events are appended to the epic scope events.jsonl", async () => {
		initProject();
		const { restore } = captureStdout();

		await runCommand(
			"../../src/commands/epic/create.js",
			"epicCreateCommand",
			{ json: true },
			{ name: "e1" },
		);
		await runCommand(
			"../../src/commands/slice/create.js",
			"sliceCreateCommand",
			{ epic: "e1", json: true },
			{ name: "s1", goal: "Test" },
		);
		await runCommand("../../src/commands/slice/abandon.js", "sliceAbandonCommand", {
			epic: "e1",
			slice: "s1",
			reason: "Done",
			json: true,
		});

		const eventsPath = path.join(projectDir, "epics", "e1", "events.jsonl");
		const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
		const events = lines.map((l) => JSON.parse(l));

		const types = events.map((e) => e.type);
		expect(types).toContain("epic-created");
		expect(types).toContain("slice-created");
		expect(types).toContain("slice-abandoned");

		// Verify prevId chain
		for (let i = 1; i < events.length; i++) {
			expect(events[i].prevId).toBe(events[i - 1]?.id);
		}

		restore();
	});
});
