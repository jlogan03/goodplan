import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../../../src/core/rpc/init.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-epic-cmd-"));
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

// ── Helper to run commands ───────────────────────────────────

async function runEpicCreate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	// Mock readStdin to return our data
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { epicCreateCommand } = await import("../../../../src/commands/epic/create.js");
	const def = await epicCreateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicList(args: Record<string, unknown>) {
	const { epicListCommand } = await import("../../../../src/commands/epic/list.js");
	const def = await epicListCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicShow(args: Record<string, unknown>) {
	const { epicShowCommand } = await import("../../../../src/commands/epic/show.js");
	const def = await epicShowCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicAbandon(args: Record<string, unknown>) {
	const { epicAbandonCommand } = await import("../../../../src/commands/epic/abandon.js");
	const def = await epicAbandonCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

// ── epic:create (v2) ─────────────────────────────────────────

describe("epic:create", () => {
	it("creates epic and returns JSON result", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runEpicCreate({ json: true }, { name: "my-epic", goal: "Build something" });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("epic:my-epic");
		expect(parsed.event).toBeTruthy();

		// Verify events.jsonl on disk (v2 stores events, not epic.json)
		const eventsJsonl = path.join(projectDir, "epics", "my-epic", "events.jsonl");
		expect(fs.existsSync(eventsJsonl)).toBe(true);

		restore();
	});

	it("shows human-readable output by default", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runEpicCreate({}, { name: "my-epic", goal: "Build" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("my-epic");
		expect(outputStr).toContain("Created");

		restore();
	});

	it("suppresses output in quiet mode", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runEpicCreate({ quiet: true }, { name: "my-epic", goal: "Build" });

		expect(chunks.join("")).toBe("");

		// But epic events should still be created
		const eventsJsonl = path.join(projectDir, "epics", "my-epic", "events.jsonl");
		expect(fs.existsSync(eventsJsonl)).toBe(true);

		restore();
	});

	it("rejects missing name via process.exit", async () => {
		initProject();
		const { restore } = captureStdout();

		// v2 epic:create calls process.exit(1) for missing name
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(runEpicCreate({ json: true }, { goal: "No name" })).rejects.toThrow(
			"process.exit called",
		);

		exitSpy.mockRestore();
		restore();
	});
});

// ── epic:list (v2) ───────────────────────────────────────────

describe("epic:list", () => {
	it("returns empty items when no epics exist", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runEpicList({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toEqual([]);
		expect(parsed.total).toBe(0);

		restore();
	});

	it("returns epic items after creation", async () => {
		initProject();
		// Create epic via v2 command (event engine)
		await runEpicCreate({ json: true }, { name: "e1" });

		const { chunks, restore } = captureStdout();
		await runEpicList({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].name).toBe("e1");
		expect(parsed.items[0].phase).toBe("P0");

		restore();
	});

	it("shows human-readable list", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runEpicList({});

		const outputStr = chunks.join("");
		expect(outputStr).toContain("No epics found");

		restore();
	});
});

// ── epic:show (v2) ───────────────────────────────────────────

describe("epic:show", () => {
	it("returns full epic state as JSON", async () => {
		initProject();
		// Create epic via v2 command
		await runEpicCreate({ json: true }, { name: "e1" });

		const { chunks, restore } = captureStdout();
		await runEpicShow({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.dir).toBe("e1");
		expect(parsed.phase).toBe("P0");
		expect(parsed.active).toBe(false);
		expect(parsed.abandoned).toBe(false);

		restore();
	});

	it("exits with error for nonexistent epic", async () => {
		initProject();
		const { restore } = captureStdout();

		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(runEpicShow({ epic: "nonexistent", json: true })).rejects.toThrow(
			"process.exit called",
		);

		exitSpy.mockRestore();
		restore();
	});

	it("shows human-readable epic details", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });

		const { chunks, restore } = captureStdout();
		await runEpicShow({ epic: "e1" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("e1");
		expect(outputStr).toContain("P0");

		restore();
	});
});

// ── epic:abandon (v2) ────────────────────────────────────────

describe("epic:abandon", () => {
	it("abandons epic and returns JSON result", async () => {
		initProject();
		// Create epic via v2 command
		await runEpicCreate({ json: true }, { name: "e1" });

		const { chunks, restore } = captureStdout();
		await runEpicAbandon({ epic: "e1", reason: "Not needed", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("epic:e1");

		restore();
	});
});

// ── v2 lifecycle walkthrough ───────────────────────────────���─

describe("v2 epic lifecycle via CLI commands", () => {
	it("create -> show -> list -> abandon -> list (v2 event engine)", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		// Create first epic
		await runEpicCreate({ json: true }, { name: "e1" });
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("epic:e1");
		chunks.length = 0;

		// Show epic
		await runEpicShow({ epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.phase).toBe("P0");
		chunks.length = 0;

		// Create second epic
		await runEpicCreate({ json: true }, { name: "e2" });
		chunks.length = 0;

		// List should show both
		await runEpicList({ json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(2);
		expect(parsed.total).toBe(2);
		chunks.length = 0;

		// Abandon second epic
		await runEpicAbandon({ epic: "e2", reason: "Changed plans", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("epic:e2");
		chunks.length = 0;

		// Show abandoned epic
		await runEpicShow({ epic: "e2", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.abandoned).toBe(true);

		restore();
	});
});
