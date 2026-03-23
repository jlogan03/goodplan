import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../../../src/core/rpc/init.js";
import { begin } from "../../../../src/core/rpc/begin.js";
import { submit } from "../../../../src/core/rpc/submit.js";
import type { Verification } from "../../../../src/schemas/entities/epic.js";
import { parseInlineBudget } from "../../../../src/commands/global-args.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-start-cmd-"));
	projectDir = path.join(tmpDir, ".project");
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

function advanceEpicTo(target: "exploring" | "explored" | "defining-architecture" | "architecture-defined" | "refining-architecture" | "architecture-refined" | "defining-slices" | "slices-defined" | "refining-slices" | "slices-refined" | "activated") {
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

	submit(projectDir, "refine-architecture", epicTarget, { phase: "refine-architecture", scores: { q: 10 } });
	if (target === "architecture-refined") return;

	begin(projectDir, "define-slices", epicTarget, {});
	if (target === "defining-slices") return;

	submit(projectDir, "slices", epicTarget, { phase: "slices" });
	if (target === "slices-defined") return;

	begin(projectDir, "refine-slices", epicTarget, {});
	if (target === "refining-slices") return;

	submit(projectDir, "refine-slices", epicTarget, { phase: "refine-slices", scores: { q: 10 } });
	if (target === "slices-refined") return;

	const v: Verification = { description: "Works", status: "pending", addedDuring: "defining-slices", modifiedDuring: null };
	begin(projectDir, "add-verification", epicTarget, { verification: v });
	begin(projectDir, "activate", epicTarget, {});
}

// ── Command runners ──────────────────────────────────────────

async function runStartPlan(args: Record<string, unknown>) {
	const { startPlanCommand } = await import("../../../../src/commands/subagent/start-plan.js");
	const def = await startPlanCommand;
	if (def.run) {
		await def.run({ args: { json: false, quiet: false, verbose: false, ...args }, rawArgs: [], cmd: def });
	}
}

async function runStartExplore(args: Record<string, unknown>) {
	const { startExploreCommand } = await import("../../../../src/commands/subagent/start-explore.js");
	const def = await startExploreCommand;
	if (def.run) {
		await def.run({ args: { json: false, quiet: false, verbose: false, ...args }, rawArgs: [], cmd: def });
	}
}

async function runStartArchitecture(args: Record<string, unknown>) {
	const { startArchitectureCommand } = await import("../../../../src/commands/subagent/start-architecture.js");
	const def = await startArchitectureCommand;
	if (def.run) {
		await def.run({ args: { json: false, quiet: false, verbose: false, ...args }, rawArgs: [], cmd: def });
	}
}

async function runStartSlices(args: Record<string, unknown>) {
	const { startSlicesCommand } = await import("../../../../src/commands/subagent/start-slices.js");
	const def = await startSlicesCommand;
	if (def.run) {
		await def.run({ args: { json: false, quiet: false, verbose: false, ...args }, rawArgs: [], cmd: def });
	}
}

// ── parseInlineBudget ────────────────────────────────────────

describe("parseInlineBudget", () => {
	it("returns undefined for undefined input", () => {
		expect(parseInlineBudget(undefined)).toBeUndefined();
	});

	it("returns true for bare --inline ('true')", () => {
		expect(parseInlineBudget("true")).toBe(true);
	});

	it("returns true for empty string", () => {
		expect(parseInlineBudget("")).toBe(true);
	});

	it("returns number for numeric string", () => {
		expect(parseInlineBudget("500")).toBe(500);
	});

	it("returns number for large budget", () => {
		expect(parseInlineBudget("50000")).toBe(50000);
	});

	it("returns true for non-numeric non-true string", () => {
		expect(parseInlineBudget("abc")).toBe(true);
	});
});

// ── start-plan ───────────────────────────────────────────────

describe("start-plan", () => {
	it("returns ContextBundle with references when no --inline", async () => {
		initProject();
		advanceEpicTo("activated");
		// Create a slice
		begin(projectDir, "create", { type: "slice", name: "s1" }, { name: "s1", goal: "Slice goal", epic: "e1" });

		const { chunks, restore } = captureStdout();
		await runStartPlan({ slice: "s1" });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.inline).toEqual({});
		expect(parsed.references).toBeDefined();
		expect(Array.isArray(parsed.references)).toBe(true);
		expect(parsed.decisions).toBeDefined();
		expect(parsed.learnings).toBeDefined();

		restore();
	});

	it("returns ContextBundle with inlined content when --inline is set", async () => {
		initProject();
		advanceEpicTo("activated");
		begin(projectDir, "create", { type: "slice", name: "s1" }, { name: "s1", goal: "Slice goal", epic: "e1" });

		const { chunks, restore } = captureStdout();
		await runStartPlan({ slice: "s1", inline: "true" });

		const parsed = JSON.parse(chunks.join(""));
		expect(Object.keys(parsed.inline).length).toBeGreaterThan(0);
		// Entity goal should be inlined first
		expect(parsed.inline["slices/s1/slice.json"]).toBe("Slice goal");

		restore();
	});

	it("respects custom budget with --inline=500", async () => {
		initProject();
		advanceEpicTo("activated");
		begin(projectDir, "create", { type: "slice", name: "s1" }, { name: "s1", goal: "Slice goal", epic: "e1" });

		const { chunks, restore } = captureStdout();
		await runStartPlan({ slice: "s1", inline: "500" });

		const parsed = JSON.parse(chunks.join(""));
		// With a 500 byte budget, some content should be inlined
		expect(Object.keys(parsed.inline).length).toBeGreaterThan(0);

		restore();
	});

	it("rejects when neither --slice nor --quest provided", async () => {
		initProject();
		await expect(runStartPlan({})).rejects.toThrow("Exactly one of --slice or --quest");
	});

	it("rejects when both --slice and --quest provided", async () => {
		initProject();
		await expect(runStartPlan({ slice: "s1", quest: "q1" })).rejects.toThrow();
	});

	it("always outputs JSON even without --json flag", async () => {
		initProject();
		advanceEpicTo("activated");
		begin(projectDir, "create", { type: "slice", name: "s1" }, { name: "s1", goal: "Slice goal", epic: "e1" });

		const { chunks, restore } = captureStdout();
		// Note: json: false — but output should still be JSON
		await runStartPlan({ slice: "s1", json: false });

		const outputStr = chunks.join("");
		// Should be valid JSON
		expect(() => JSON.parse(outputStr)).not.toThrow();

		restore();
	});
});

// ── start-explore ────────────────────────────────────────────

describe("start-explore", () => {
	it("returns ContextBundle for epic target", async () => {
		initProject();
		advanceEpicTo("activated");

		const { chunks, restore } = captureStdout();
		await runStartExplore({ epic: "e1", inline: "true" });

		const parsed = JSON.parse(chunks.join(""));
		expect(Object.keys(parsed.inline).length).toBeGreaterThan(0);
		// Epic goal should be inlined
		expect(parsed.inline["epics/e1/epic.json"]).toBe("G");

		restore();
	});

	it("returns references without --inline", async () => {
		initProject();
		advanceEpicTo("activated");

		const { chunks, restore } = captureStdout();
		await runStartExplore({ epic: "e1" });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.inline).toEqual({});
		expect(parsed.references.length).toBeGreaterThan(0);

		restore();
	});
});

// ── start-architecture ───────────────────────────────────────

describe("start-architecture", () => {
	it("returns ContextBundle with inlined content for epic target", async () => {
		initProject();
		advanceEpicTo("activated");

		const { chunks, restore } = captureStdout();
		await runStartArchitecture({ epic: "e1", inline: "true" });

		const parsed = JSON.parse(chunks.join(""));
		expect(Object.keys(parsed.inline).length).toBeGreaterThan(0);
		expect(parsed.inline["epics/e1/epic.json"]).toBe("G");

		restore();
	});

	it("returns references without --inline", async () => {
		initProject();
		advanceEpicTo("activated");

		const { chunks, restore } = captureStdout();
		await runStartArchitecture({ epic: "e1" });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.inline).toEqual({});
		expect(parsed.references.length).toBeGreaterThan(0);

		restore();
	});
});

// ── start-slices ─────────────────────────────────────────────

describe("start-slices", () => {
	it("returns ContextBundle with inlined content for epic target", async () => {
		initProject();
		advanceEpicTo("activated");

		const { chunks, restore } = captureStdout();
		await runStartSlices({ epic: "e1", inline: "true" });

		const parsed = JSON.parse(chunks.join(""));
		expect(Object.keys(parsed.inline).length).toBeGreaterThan(0);
		expect(parsed.inline["epics/e1/epic.json"]).toBe("G");

		restore();
	});

	it("returns references without --inline", async () => {
		initProject();
		advanceEpicTo("activated");

		const { chunks, restore } = captureStdout();
		await runStartSlices({ epic: "e1" });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.inline).toEqual({});
		expect(parsed.references.length).toBeGreaterThan(0);

		restore();
	});
});
