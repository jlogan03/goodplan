import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../../../src/core/rpc/init.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-slice-cmd-"));
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

// ── Command runners (v2 CLI commands) ────────────────────────

async function runEpicCreate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
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

/**
 * Create an epic via v2 command (creates events.jsonl).
 * Returns the epic name for use in subsequent commands.
 */
async function setupEpic(epicName = "e1") {
	const { chunks, restore } = captureStdout();
	await runEpicCreate({ json: true }, { name: epicName });
	restore();
	// Clear captured output
	chunks.length = 0;
}

// ── slice:create ─────────────────────────────────────────────

describe("slice:create", () => {
	it("creates slice and returns JSON result", async () => {
		initProject();
		await setupEpic();
		const { chunks, restore } = captureStdout();

		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:01-auth");

		// Verify on disk
		const sliceDir = path.join(projectDir, "epics", "e1", "slices", "01-auth");
		expect(fs.existsSync(sliceDir)).toBe(true);

		restore();
	});

	it("shows human-readable output with epic name", async () => {
		initProject();
		await setupEpic();
		const { chunks, restore } = captureStdout();

		await runSliceCreate({ epic: "e1" }, { name: "01-auth", goal: "Auth" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("01-auth");
		expect(outputStr).toContain("e1");

		restore();
	});

	it("suppresses output in quiet mode", async () => {
		initProject();
		await setupEpic();
		const { chunks, restore } = captureStdout();

		await runSliceCreate({ epic: "e1", quiet: true }, { name: "01-auth", goal: "Auth" });

		expect(chunks.join("")).toBe("");

		// But slice should still be created
		const sliceDir = path.join(projectDir, "epics", "e1", "slices", "01-auth");
		expect(fs.existsSync(sliceDir)).toBe(true);

		restore();
	});
});

// ── slice:list ───────────────────────────────────────────────

describe("slice:list", () => {
	it("returns empty items when no slices exist", async () => {
		initProject();
		await setupEpic();
		const { chunks, restore } = captureStdout();

		await runSliceList({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toEqual([]);

		restore();
	});

	it("returns slice items after creation", async () => {
		initProject();
		await setupEpic();

		// Create slice via v2 command
		const setupChunks = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });
		setupChunks.restore();

		const { chunks, restore } = captureStdout();
		await runSliceList({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].dir).toBe("01-auth");
		expect(parsed.items[0].epic).toBe("e1");

		restore();
	});

	it("shows human-readable list when empty", async () => {
		initProject();
		await setupEpic();
		const { chunks, restore } = captureStdout();

		await runSliceList({ epic: "e1" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("No slices found");

		restore();
	});
});

// ── slice:show ───────────────────────────────────────────────

describe("slice:show", () => {
	it("returns full slice entity as JSON", async () => {
		initProject();
		await setupEpic();

		const setupChunks = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth feature" });
		setupChunks.restore();

		const { chunks, restore } = captureStdout();
		await runSliceShow({ slice: "01-auth", epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.dir).toBe("01-auth");

		restore();
	});

	it("returns error for nonexistent slice", async () => {
		initProject();
		await setupEpic();

		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		const { restore } = captureStdout();
		await expect(runSliceShow({ slice: "nonexistent", epic: "e1", json: true })).rejects.toThrow(
			"process.exit called",
		);

		exitSpy.mockRestore();
		restore();
	});

	it("shows human-readable slice details", async () => {
		initProject();
		await setupEpic();

		const setupChunks = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });
		setupChunks.restore();

		const { chunks, restore } = captureStdout();
		await runSliceShow({ slice: "01-auth", epic: "e1" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("01-auth");
		expect(outputStr).toContain("e1");

		restore();
	});
});

// ── slice:abandon ────────────────────────────────────────────

describe("slice:abandon", () => {
	it("abandons slice and returns JSON result", async () => {
		initProject();
		await setupEpic();

		const setupChunks = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });
		setupChunks.restore();

		const { chunks, restore } = captureStdout();
		await runSliceAbandon({ slice: "01-auth", epic: "e1", reason: "Not needed", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:01-auth");

		restore();
	});

	it("shows human-readable abandon output", async () => {
		initProject();
		await setupEpic();

		const setupChunks = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });
		setupChunks.restore();

		const { chunks, restore } = captureStdout();
		await runSliceAbandon({ slice: "01-auth", epic: "e1", reason: "Changed plans" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("01-auth");
		expect(outputStr).toContain("e1");

		restore();
	});
});

// ── Output mode tests ────────────────────────────────────────

describe("output modes", () => {
	it("slice:list --quiet suppresses output", async () => {
		initProject();
		await setupEpic();
		const { chunks, restore } = captureStdout();

		await runSliceList({ epic: "e1", quiet: true });

		expect(chunks.join("")).toBe("");

		restore();
	});

	it("slice:show --quiet suppresses output", async () => {
		initProject();
		await setupEpic();

		const setupChunks = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });
		setupChunks.restore();

		const { chunks, restore } = captureStdout();
		await runSliceShow({ slice: "01-auth", epic: "e1", quiet: true });

		expect(chunks.join("")).toBe("");

		restore();
	});

	it("slice:abandon --quiet suppresses output", async () => {
		initProject();
		await setupEpic();

		const setupChunks = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });
		setupChunks.restore();

		const { chunks, restore } = captureStdout();
		await runSliceAbandon({ slice: "01-auth", epic: "e1", reason: "Not needed", quiet: true });

		expect(chunks.join("")).toBe("");

		restore();
	});
});

// ── Full v2 lifecycle walkthrough ───────────────────────────

describe("full slice lifecycle via v2 CLI commands", () => {
	it("create -> list -> show -> abandon -> verify abandoned", async () => {
		initProject();
		await setupEpic();
		const { chunks, restore } = captureStdout();

		// Create
		await runSliceCreate({ epic: "e1", json: true }, { name: "01-auth", goal: "Auth" });
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:01-auth");
		chunks.length = 0;

		// List
		await runSliceList({ epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].dir).toBe("01-auth");
		chunks.length = 0;

		// Show
		await runSliceShow({ slice: "01-auth", epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.dir).toBe("01-auth");
		chunks.length = 0;

		// Abandon
		await runSliceAbandon({ slice: "01-auth", epic: "e1", reason: "Not needed", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		chunks.length = 0;

		// Show abandoned
		await runSliceShow({ slice: "01-auth", epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.abandoned).toBe(true);
		chunks.length = 0;

		// List should still show it
		await runSliceList({ epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].abandoned).toBe(true);

		restore();
	});
});
