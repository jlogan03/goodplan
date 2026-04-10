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

async function runEpicExplore(args: Record<string, unknown>) {
	const { epicExploreCommand } = await import("../../../../src/commands/epic/explore.js");
	const def = await epicExploreCommand;
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

async function runEpicDefineArchitecture(args: Record<string, unknown>) {
	const { epicDefineArchitectureCommand } = await import(
		"../../../../src/commands/epic/define-architecture.js"
	);
	const def = await epicDefineArchitectureCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicRefineArchitecture(args: Record<string, unknown>) {
	const { epicRefineArchitectureCommand } = await import(
		"../../../../src/commands/epic/refine-architecture.js"
	);
	const def = await epicRefineArchitectureCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicDefineSlices(args: Record<string, unknown>) {
	const { epicDefineSlicesCommand } = await import(
		"../../../../src/commands/epic/define-slices.js"
	);
	const def = await epicDefineSlicesCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicRefineSlices(args: Record<string, unknown>) {
	const { epicRefineSlicesCommand } = await import(
		"../../../../src/commands/epic/refine-slices.js"
	);
	const def = await epicRefineSlicesCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicActivate(args: Record<string, unknown>) {
	const { epicActivateCommand } = await import("../../../../src/commands/epic/activate.js");
	const def = await epicActivateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicComplete(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { epicCompleteCommand } = await import("../../../../src/commands/epic/complete.js");
	const def = await epicCompleteCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicAddVerification(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { epicAddVerificationCommand } = await import(
		"../../../../src/commands/epic/add-verification.js"
	);
	const def = await epicAddVerificationCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicUpdateVerification(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { epicUpdateVerificationCommand } = await import(
		"../../../../src/commands/epic/update-verification.js"
	);
	const def = await epicUpdateVerificationCommand;
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

// ── epic:explore ─────────────────────────────────────────────

describe("epic:explore", () => {
	it("transitions epic from created to exploring", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });

		const { chunks, restore } = captureStdout();
		await runEpicExplore({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("created");
		expect(parsed.newStatus).toBe("exploring");

		restore();
	});
});

// ── epic:define-architecture ─────────────────────────────────

describe("epic:define-architecture", () => {
	it("transitions epic from explored to defining-architecture", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });

		const { chunks, restore } = captureStdout();
		await runEpicDefineArchitecture({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("explored");
		expect(parsed.newStatus).toBe("defining-architecture");

		restore();
	});
});

// ── epic:refine-architecture ─────────────────────────────────

describe("epic:refine-architecture", () => {
	it("transitions epic from architecture-defined to refining-architecture", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });

		const { chunks, restore } = captureStdout();
		await runEpicRefineArchitecture({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("architecture-defined");
		expect(parsed.newStatus).toBe("refining-architecture");

		restore();
	});
});

// ── epic:define-slices ───────────────────────────────────────

describe("epic:define-slices", () => {
	it("transitions epic from architecture-refined to defining-slices", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
		// Skip refine-architecture via COMPLETE_REFINE_ARCHITECTURE from architecture-defined
		submit(
			projectDir,
			"refine-architecture",
			{ type: "epic", name: "e1" },
			{ phase: "refine-architecture", scores: {} },
		);

		const { chunks, restore } = captureStdout();
		await runEpicDefineSlices({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("architecture-refined");
		expect(parsed.newStatus).toBe("defining-slices");

		restore();
	});
});

// ── epic:refine-slices ───────────────────────────────────────

describe("epic:refine-slices", () => {
	it("transitions epic from slices-defined to refining-slices", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
		submit(
			projectDir,
			"refine-architecture",
			{ type: "epic", name: "e1" },
			{ phase: "refine-architecture", scores: {} },
		);
		begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
		submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });

		const { chunks, restore } = captureStdout();
		await runEpicRefineSlices({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("slices-defined");
		expect(parsed.newStatus).toBe("refining-slices");

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

// ── epic:add-verification ────────────────────────────────────

describe("epic:add-verification", () => {
	it("adds verification to epic", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });

		const verification: Verification = {
			description: "CLI works",
			status: "pending",
			addedDuring: "created",
			modifiedDuring: null,
		};

		const { chunks, restore } = captureStdout();
		await runEpicAddVerification({ epic: "e1", json: true }, { verification });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.entity).toBe("e1");
		expect(parsed.phase).toBe("add-verification");

		// Verify on disk
		const epicJson = path.join(projectDir, "epics", "e1", "epic.json");
		const epic = JSON.parse(fs.readFileSync(epicJson, "utf-8"));
		expect(epic.verifications).toHaveLength(1);
		expect(epic.verifications[0].description).toBe("CLI works");

		restore();
	});
});

// ── epic:update-verification ─────────────────────────────────

describe("epic:update-verification", () => {
	it("updates an existing verification", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });

		const v1: Verification = {
			description: "Original",
			status: "pending",
			addedDuring: "created",
			modifiedDuring: null,
		};
		begin(projectDir, "add-verification", { type: "epic", name: "e1" }, { verification: v1 });

		const v2: Verification = {
			description: "Updated",
			status: "passed",
			addedDuring: "created",
			modifiedDuring: "exploring",
		};

		const { chunks, restore } = captureStdout();
		await runEpicUpdateVerification({ epic: "e1", index: "0", json: true }, { verification: v2 });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.entity).toBe("e1");
		expect(parsed.phase).toBe("update-verification");

		// Verify on disk
		const epicJson = path.join(projectDir, "epics", "e1", "epic.json");
		const epic = JSON.parse(fs.readFileSync(epicJson, "utf-8"));
		expect(epic.verifications[0].description).toBe("Updated");
		expect(epic.verifications[0].status).toBe("passed");

		restore();
	});
});

// ── epic:activate ────────────────────────────────────────────

describe("epic:activate", () => {
	it("activates an epic at slices-refined with verifications", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
		submit(
			projectDir,
			"refine-architecture",
			{ type: "epic", name: "e1" },
			{ phase: "refine-architecture", scores: {} },
		);
		begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
		submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
		submit(
			projectDir,
			"refine-slices",
			{ type: "epic", name: "e1" },
			{ phase: "refine-slices", scores: {} },
		);

		// Add verification (required for activation)
		const v: Verification = {
			description: "It works",
			status: "pending",
			addedDuring: "defining-slices",
			modifiedDuring: null,
		};
		begin(projectDir, "add-verification", { type: "epic", name: "e1" }, { verification: v });

		const { chunks, restore } = captureStdout();
		await runEpicActivate({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("slices-refined");
		expect(parsed.newStatus).toBe("activated");

		restore();
	});

	it("rejects activation without verifications", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
		submit(
			projectDir,
			"refine-architecture",
			{ type: "epic", name: "e1" },
			{ phase: "refine-architecture", scores: {} },
		);
		begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
		submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
		submit(
			projectDir,
			"refine-slices",
			{ type: "epic", name: "e1" },
			{ phase: "refine-slices", scores: {} },
		);

		const { restore } = captureStdout();

		await expect(runEpicActivate({ epic: "e1", json: true })).rejects.toThrow();

		restore();
	});
});

// ── epic:complete ────────────────────────────────────────────

describe("epic:complete", () => {
	it("completes an activated epic with passing verifications", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
		submit(
			projectDir,
			"refine-architecture",
			{ type: "epic", name: "e1" },
			{ phase: "refine-architecture", scores: {} },
		);
		begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
		submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
		submit(
			projectDir,
			"refine-slices",
			{ type: "epic", name: "e1" },
			{ phase: "refine-slices", scores: {} },
		);

		const v: Verification = {
			description: "It works",
			status: "pending",
			addedDuring: "defining-slices",
			modifiedDuring: null,
		};
		begin(projectDir, "add-verification", { type: "epic", name: "e1" }, { verification: v });
		begin(projectDir, "activate", { type: "epic", name: "e1" }, {});

		const { chunks, restore } = captureStdout();
		await runEpicComplete(
			{ epic: "e1", json: true },
			{
				verificationResults: [{ index: 0, passed: true, notes: "All good" }],
			},
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("activated");
		expect(parsed.newStatus).toBe("completed");

		restore();
	});
});

// ── v2 lifecycle walkthrough ─────────────────────────────────

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
