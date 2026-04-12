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
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-submit-cmd-"));
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

/**
 * Advance epic through the full phase chain to a given target status.
 * Returns the projectDir for chaining.
 */
function advanceEpicTo(
	target:
		| "exploring"
		| "explored"
		| "defining-architecture"
		| "architecture-defined"
		| "refining-architecture"
		| "architecture-refined"
		| "defining-slices"
		| "slices-defined"
		| "refining-slices"
		| "slices-refined"
		| "activated",
) {
	const epicTarget = { type: "epic" as const, name: "e1" };

	begin(projectDir, "create", epicTarget, { name: "e1", goal: "G" });
	if (target === "exploring") {
		begin(projectDir, "explore", epicTarget, {});
		return;
	}

	begin(projectDir, "explore", epicTarget, {});
	submit(projectDir, "explore", epicTarget, { phase: "explore" });
	if (target === "explored") return;

	begin(projectDir, "define-architecture", epicTarget, {});
	if (target === "defining-architecture") return;

	submit(projectDir, "architecture", epicTarget, { phase: "architecture" });
	if (target === "architecture-defined") return;

	begin(projectDir, "refine-architecture", epicTarget, {});
	if (target === "refining-architecture") return;

	submit(projectDir, "refine-architecture", epicTarget, {
		phase: "refine-architecture",
		scores: { q: 10 },
	});
	if (target === "architecture-refined") return;

	begin(projectDir, "define-slices", epicTarget, {});
	if (target === "defining-slices") return;

	submit(projectDir, "slices", epicTarget, { phase: "slices" });
	if (target === "slices-defined") return;

	begin(projectDir, "refine-slices", epicTarget, {});
	if (target === "refining-slices") return;

	submit(projectDir, "refine-slices", epicTarget, { phase: "refine-slices", scores: { q: 10 } });
	if (target === "slices-refined") return;

	// activated
	const v: Verification = {
		description: "Works",
		status: "pending",
		addedDuring: "defining-slices",
		modifiedDuring: null,
	};
	begin(projectDir, "add-verification", epicTarget, { verification: v });
	begin(projectDir, "activate", epicTarget, {});
}

// ── Command runners ──────────────────────────────────────────

async function runSubmitExplore(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { submitExploreCommand } = await import(
		"../../../../src/commands/subagent/submit-explore.js"
	);
	const def = await submitExploreCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSubmitArchitecture(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { submitArchitectureCommand } = await import(
		"../../../../src/commands/subagent/submit-architecture.js"
	);
	const def = await submitArchitectureCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSubmitRefineArchitecture(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { submitRefineArchitectureCommand } = await import(
		"../../../../src/commands/subagent/submit-refine-architecture.js"
	);
	const def = await submitRefineArchitectureCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSubmitSlices(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { submitSlicesCommand } = await import(
		"../../../../src/commands/subagent/submit-slices.js"
	);
	const def = await submitSlicesCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSubmitRefineSlices(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { submitRefineSlicesCommand } = await import(
		"../../../../src/commands/subagent/submit-refine-slices.js"
	);
	const def = await submitRefineSlicesCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSubmitPlan(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { submitPlanCommand } = await import("../../../../src/commands/subagent/submit-plan.js");
	const def = await submitPlanCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSubmitRefinement(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { submitRefinementCommand } = await import(
		"../../../../src/commands/subagent/submit-refinement.js"
	);
	const def = await submitRefinementCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSubmitImplementation(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { submitImplementationCommand } = await import(
		"../../../../src/commands/subagent/submit-implementation.js"
	);
	const def = await submitImplementationCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

// ── submit-explore ───────────────────────────────────────────

describe("submit-explore", () => {
	it("transitions exploring -> explored via CLI", async () => {
		initProject();
		advanceEpicTo("exploring");

		const { chunks, restore } = captureStdout();
		await runSubmitExplore({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.entity).toBe("e1");
		expect(parsed.phase).toBe("explore");
		expect(parsed.previousStatus).toBe("exploring");
		expect(parsed.newStatus).toBe("explored");
		expect(parsed.advanced).toBe(true);

		restore();
	});

	it("shows human-readable output by default", async () => {
		initProject();
		advanceEpicTo("exploring");

		const { chunks, restore } = captureStdout();
		await runSubmitExplore({ epic: "e1" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("e1");
		expect(outputStr).toContain("->");

		restore();
	});

	it("rejects when epic flag is missing", async () => {
		initProject();

		await expect(runSubmitExplore({})).rejects.toThrow();
	});
});

// ── submit-architecture ──────────────────────────────────────

describe("submit-architecture", () => {
	it("transitions defining-architecture -> architecture-defined via CLI", async () => {
		initProject();
		advanceEpicTo("defining-architecture");

		const { chunks, restore } = captureStdout();
		await runSubmitArchitecture({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("defining-architecture");
		expect(parsed.newStatus).toBe("architecture-defined");

		restore();
	});
});

// ── submit-refine-architecture ───────────────────────────────

describe("submit-refine-architecture", () => {
	it("advances with high scores", async () => {
		initProject();
		advanceEpicTo("refining-architecture");

		const { chunks, restore } = captureStdout();
		await runSubmitRefineArchitecture(
			{ epic: "e1", json: true },
			{ scores: { quality: 10, completeness: 10 } },
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("refining-architecture");
		expect(parsed.newStatus).toBe("architecture-refined");
		expect(parsed.advanced).toBe(true);

		restore();
	});

	it("stays in refining with low scores", async () => {
		initProject();
		advanceEpicTo("refining-architecture");

		const { chunks, restore } = captureStdout();
		await runSubmitRefineArchitecture(
			{ epic: "e1", json: true },
			{ scores: { quality: 3, completeness: 3 } },
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("refining-architecture");
		expect(parsed.newStatus).toBe("refining-architecture");
		expect(parsed.advanced).toBe(false);

		restore();
	});

	it("bypasses threshold with --override", async () => {
		initProject();
		advanceEpicTo("refining-architecture");

		const { chunks, restore } = captureStdout();
		await runSubmitRefineArchitecture(
			{ epic: "e1", json: true, override: true },
			{ scores: { quality: 3, completeness: 3 } },
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("architecture-refined");
		expect(parsed.advanced).toBe(true);

		restore();
	});

	it("rejects when scores are missing from stdin", async () => {
		initProject();
		advanceEpicTo("refining-architecture");

		await expect(runSubmitRefineArchitecture({ epic: "e1", json: true })).rejects.toThrow();
	});
});

// ── submit-slices ────────────────────────────────────────────

describe("submit-slices", () => {
	it("transitions defining-slices -> slices-defined via CLI", async () => {
		initProject();
		advanceEpicTo("defining-slices");

		const { chunks, restore } = captureStdout();
		await runSubmitSlices({ epic: "e1", json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("defining-slices");
		expect(parsed.newStatus).toBe("slices-defined");

		restore();
	});
});

// ── submit-refine-slices ─────────────────────────────────────

describe("submit-refine-slices", () => {
	it("advances with high scores", async () => {
		initProject();
		advanceEpicTo("refining-slices");

		const { chunks, restore } = captureStdout();
		await runSubmitRefineSlices(
			{ epic: "e1", json: true },
			{ scores: { completeness: 9, clarity: 9, testability: 9 } },
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("refining-slices");
		expect(parsed.newStatus).toBe("slices-refined");
		expect(parsed.advanced).toBe(true);

		restore();
	});

	it("stays in refining with low scores", async () => {
		initProject();
		advanceEpicTo("refining-slices");

		const { chunks, restore } = captureStdout();
		await runSubmitRefineSlices(
			{ epic: "e1", json: true },
			{ scores: { completeness: 3, clarity: 3 } },
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.previousStatus).toBe("refining-slices");
		expect(parsed.newStatus).toBe("refining-slices");
		expect(parsed.advanced).toBe(false);

		restore();
	});

	it("bypasses threshold with --override", async () => {
		initProject();
		advanceEpicTo("refining-slices");

		const { chunks, restore } = captureStdout();
		await runSubmitRefineSlices(
			{ epic: "e1", json: true, override: true },
			{ scores: { completeness: 3 } },
		);

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("slices-refined");

		restore();
	});
});

// ── submit-plan (slice target) ───────────────────────────────
// Note: slice/quest entities are not yet implemented in the state machine
// (that's slices 04-05). These tests verify the command layer wiring —
// validation, target resolution, and error propagation.

describe("submit-plan", () => {
	it("rejects when neither --slice nor --quest provided", async () => {
		initProject();

		await expect(runSubmitPlan({ json: true })).rejects.toThrow();
	});

	it("rejects when both --slice and --quest provided", async () => {
		initProject();

		await expect(runSubmitPlan({ slice: "s1", quest: "q1", json: true })).rejects.toThrow();
	});

	it("propagates state machine error for nonexistent slice", async () => {
		initProject();

		// The state machine will reject because no such slice exists
		await expect(runSubmitPlan({ slice: "nonexistent", json: true })).rejects.toThrow();
	});
});

// ── submit-refinement (slice target) ─────────────────────────

describe("submit-refinement", () => {
	it("rejects when neither --slice nor --quest provided", async () => {
		initProject();

		await expect(runSubmitRefinement({ json: true }, { scores: { q: 9 } })).rejects.toThrow();
	});

	it("rejects when scores are missing", async () => {
		initProject();

		await expect(runSubmitRefinement({ slice: "s1", json: true })).rejects.toThrow();
	});
});

// ── submit-implementation (slice target) ─────────────────────

describe("submit-implementation", () => {
	it("rejects when neither --slice nor --quest provided", async () => {
		initProject();

		await expect(runSubmitImplementation({ json: true })).rejects.toThrow();
	});
});

// ── Full epic phase chain via submit CLI commands ────────────

describe("full epic lifecycle via submit commands", () => {
	it("explore -> architecture -> refine-arch -> slices -> refine-slices", async () => {
		initProject();
		const epicTarget = { type: "epic" as const, name: "e1" };
		begin(projectDir, "create", epicTarget, { name: "e1", goal: "G" });

		const { chunks, restore } = captureStdout();

		// explore
		begin(projectDir, "explore", epicTarget, {});
		await runSubmitExplore({ epic: "e1", json: true });
		let parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("explored");
		chunks.length = 0;

		// define-architecture
		begin(projectDir, "define-architecture", epicTarget, {});
		await runSubmitArchitecture({ epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("architecture-defined");
		chunks.length = 0;

		// refine-architecture (with override to skip low scores)
		begin(projectDir, "refine-architecture", epicTarget, {});
		await runSubmitRefineArchitecture(
			{ epic: "e1", json: true, override: true },
			{ scores: { q: 5 } },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("architecture-refined");
		chunks.length = 0;

		// define-slices
		begin(projectDir, "define-slices", epicTarget, {});
		await runSubmitSlices({ epic: "e1", json: true });
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("slices-defined");
		chunks.length = 0;

		// refine-slices
		begin(projectDir, "refine-slices", epicTarget, {});
		await runSubmitRefineSlices(
			{ epic: "e1", json: true },
			{ scores: { completeness: 9, clarity: 9, testability: 9 } },
		);
		parsed = JSON.parse(chunks.join(""));
		expect(parsed.newStatus).toBe("slices-refined");
		chunks.length = 0;

		restore();
	});
});
