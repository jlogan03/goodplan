import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../../../src/core/rpc/init.js";
import { begin } from "../../../../src/core/rpc/begin.js";
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
	const { epicDefineArchitectureCommand } = await import("../../../../src/commands/epic/define-architecture.js");
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
	const { epicRefineArchitectureCommand } = await import("../../../../src/commands/epic/refine-architecture.js");
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
	const { epicDefineSlicesCommand } = await import("../../../../src/commands/epic/define-slices.js");
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
	const { epicRefineSlicesCommand } = await import("../../../../src/commands/epic/refine-slices.js");
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

async function runEpicAddVerification(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { epicAddVerificationCommand } = await import("../../../../src/commands/epic/add-verification.js");
	const def = await epicAddVerificationCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runEpicUpdateVerification(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { epicUpdateVerificationCommand } = await import("../../../../src/commands/epic/update-verification.js");
	const def = await epicUpdateVerificationCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

// ── epic:create ──────────────────────────────────────────────

describe("epic:create", () => {
	it("creates epic and returns JSON result", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runEpicCreate({ json: true }, { name: "my-epic", goal: "Build something" });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.entity).toBe("my-epic");
		expect(parsed.phase).toBe("create");
		expect(parsed.previousStatus).toBe("none");
		expect(parsed.newStatus).toBe("created");

		// Verify on disk
		const epicJson = path.join(projectDir, "epics", "my-epic", "epic.json");
		expect(fs.existsSync(epicJson)).toBe(true);

		restore();
	});

	it("shows human-readable output by default", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runEpicCreate({}, { name: "my-epic", goal: "Build" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("my-epic");
		expect(outputStr).toContain("->");
		expect(outputStr).toContain("created");

		restore();
	});

	it("suppresses output in quiet mode", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runEpicCreate({ quiet: true }, { name: "my-epic", goal: "Build" });

		expect(chunks.join("")).toBe("");

		// But epic should still be created
		const epicJson = path.join(projectDir, "epics", "my-epic", "epic.json");
		expect(fs.existsSync(epicJson)).toBe(true);

		restore();
	});

	it("rejects missing name", async () => {
		initProject();
		const { restore } = captureStdout();

		await expect(
			runEpicCreate({ json: true }, { goal: "No name" }),
		).rejects.toThrow();

		restore();
	});
});

// ── epic:list ────────────────────────────────────────────────

describe("epic:list", () => {
	it("returns empty items when no epics exist", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		await runEpicList({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toEqual([]);

		restore();
	});

	it("returns epic items after creation", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G1" });

		const { chunks, restore } = captureStdout();
		await runEpicList({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].name).toBe("e1");
		expect(parsed.items[0].status).toBe("created");
		expect(parsed.items[0].created).toBeDefined();
		expect(parsed.items[0].completed).toBeNull();
		// overview items do NOT include goal
		expect(parsed.items[0].goal).toBeUndefined();

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

// ── epic:show ────────────────────────────────────────────────

describe("epic:show", () => {
	it("returns full epic entity as JSON", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "Test goal" });

		const { chunks, restore } = captureStdout();
		await runEpicShow({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.name).toBe("e1");
		expect(parsed.status).toBe("created");
		expect(parsed.goal).toBe("Test goal");
		expect(parsed.verifications).toEqual([]);
		expect(parsed.refinement).toBeNull();

		restore();
	});

	it("throws for nonexistent epic", async () => {
		initProject();
		const { restore } = captureStdout();

		await expect(
			runEpicShow({ epic: "nonexistent", json: true }),
		).rejects.toThrow("not found");

		restore();
	});

	it("shows human-readable epic details", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "Test" });

		const { chunks, restore } = captureStdout();
		await runEpicShow({ epic: "e1" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("e1");
		expect(outputStr).toContain("created");
		expect(outputStr).toContain("Goal:");

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
		submit(projectDir, "refine-architecture", { type: "epic", name: "e1" }, { phase: "refine-architecture", scores: {} });

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
		submit(projectDir, "refine-architecture", { type: "epic", name: "e1" }, { phase: "refine-architecture", scores: {} });
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

// ── epic:abandon ─────────────────────────────────────────────

describe("epic:abandon", () => {
	it("transitions epic to abandoned with reason", async () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });

		const { chunks, restore } = captureStdout();
		await runEpicAbandon({ epic: "e1", reason: "Not needed", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("created");
		expect(parsed.newStatus).toBe("abandoned");

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
		submit(projectDir, "refine-architecture", { type: "epic", name: "e1" }, { phase: "refine-architecture", scores: {} });
		begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
		submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
		submit(projectDir, "refine-slices", { type: "epic", name: "e1" }, { phase: "refine-slices", scores: {} });

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
		submit(projectDir, "refine-architecture", { type: "epic", name: "e1" }, { phase: "refine-architecture", scores: {} });
		begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
		submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
		submit(projectDir, "refine-slices", { type: "epic", name: "e1" }, { phase: "refine-slices", scores: {} });

		const { restore } = captureStdout();

		await expect(
			runEpicActivate({ epic: "e1", json: true }),
		).rejects.toThrow();

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
		submit(projectDir, "refine-architecture", { type: "epic", name: "e1" }, { phase: "refine-architecture", scores: {} });
		begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
		submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
		submit(projectDir, "refine-slices", { type: "epic", name: "e1" }, { phase: "refine-slices", scores: {} });

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
				verificationResults: [
					{ index: 0, passed: true, notes: "All good" },
				],
			},
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("activated");
		expect(parsed.newStatus).toBe("completed");

		restore();
	});
});

// ── Full lifecycle walkthrough ───────────────────────────────

describe("full epic lifecycle via CLI commands", () => {
	it("init -> create -> explore -> define-architecture -> define-slices -> add-verification -> activate -> abandon (second epic)", async () => {
		initProject();
		const { chunks, restore } = captureStdout();

		// Create
		await runEpicCreate({ json: true }, { name: "e1", goal: "Build it" });
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("created");
		chunks.length = 0;

		// Explore
		await runEpicExplore({ epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("exploring");
		chunks.length = 0;

		// Submit explore (via RPC directly since submit commands are Phase 6)
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });

		// Define architecture
		await runEpicDefineArchitecture({ epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("defining-architecture");
		chunks.length = 0;

		// Submit architecture
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });

		// Skip refine-architecture
		submit(projectDir, "refine-architecture", { type: "epic", name: "e1" }, { phase: "refine-architecture", scores: {} });

		// Define slices
		await runEpicDefineSlices({ epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("defining-slices");
		chunks.length = 0;

		// Submit slices
		submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });

		// Skip refine-slices
		submit(projectDir, "refine-slices", { type: "epic", name: "e1" }, { phase: "refine-slices", scores: {} });

		// Add verification
		const v: Verification = {
			description: "It works",
			status: "pending",
			addedDuring: "defining-slices",
			modifiedDuring: null,
		};
		await runEpicAddVerification({ epic: "e1", json: true }, { verification: v });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.entity).toBe("e1");
		chunks.length = 0;

		// Activate
		await runEpicActivate({ epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("activated");
		chunks.length = 0;

		// Create second epic and abandon it
		await runEpicCreate({ json: true }, { name: "e2", goal: "Another epic" });
		chunks.length = 0;

		await runEpicAbandon({ epic: "e2", reason: "Changed plans", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("abandoned");
		chunks.length = 0;

		// List should show both epics
		await runEpicList({ json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.items).toHaveLength(2);

		restore();
	});
});
