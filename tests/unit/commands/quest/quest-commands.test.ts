import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { begin } from "../../../../src/core/rpc/begin.js";
import { complete } from "../../../../src/core/rpc/complete.js";
import { rpcInit } from "../../../../src/core/rpc/init.js";
import { submit } from "../../../../src/core/rpc/submit.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-quest-cmd-"));
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

/** Write content files for quest state machine guards, then invalidate cache. */
function writeQuestContent(questName: string, ...files: string[]) {
	const dir = path.join(projectDir, "quests", questName);
	fs.mkdirSync(dir, { recursive: true });
	for (const f of files) {
		fs.writeFileSync(path.join(dir, f), `# ${f}\nContent.`);
	}
	const cachePath = path.join(projectDir, ".state-cache.json");
	if (fs.existsSync(cachePath)) {
		fs.unlinkSync(cachePath);
	}
}

/**
 * Advance a quest from created through to implementation-complete.
 */
function advanceQuestToImplementationComplete(questName: string) {
	begin(projectDir, "plan", { type: "quest", name: questName }, {});
	writeQuestContent(questName, "plan.md");
	submit(projectDir, "plan", { type: "quest", name: questName }, { phase: "plan" });
	// submit-refinement to skip refinement
	submit(
		projectDir,
		"refinement",
		{ type: "quest", name: questName },
		{ phase: "refinement", scores: {} },
	);
	writeQuestContent(questName, "plan-refined.md");
	begin(projectDir, "implement", { type: "quest", name: questName }, {});
	submit(
		projectDir,
		"implementation",
		{ type: "quest", name: questName },
		{ phase: "implementation" },
	);
}

// ── Command runners ──────────────────────────────────────────

async function runQuestCreate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { questCreateCommand } = await import("../../../../src/commands/quest/create.js");
	const def = await questCreateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runQuestList(args: Record<string, unknown>) {
	const { questListCommand } = await import("../../../../src/commands/quest/list.js");
	const def = await questListCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runQuestShow(args: Record<string, unknown>) {
	const { questShowCommand } = await import("../../../../src/commands/quest/show.js");
	const def = await questShowCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runQuestPlan(args: Record<string, unknown>) {
	const { questPlanCommand } = await import("../../../../src/commands/quest/plan.js");
	const def = await questPlanCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runQuestRefinePlan(args: Record<string, unknown>) {
	const { questRefinePlanCommand } = await import(
		"../../../../src/commands/quest/refine-plan.js"
	);
	const def = await questRefinePlanCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runQuestImplement(args: Record<string, unknown>) {
	const { questImplementCommand } = await import(
		"../../../../src/commands/quest/implement.js"
	);
	const def = await questImplementCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runQuestComplete(
	args: Record<string, unknown>,
	stdin: Record<string, unknown> = {},
) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { questCompleteCommand } = await import("../../../../src/commands/quest/complete.js");
	const def = await questCompleteCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runQuestAbandon(args: Record<string, unknown>) {
	const { questAbandonCommand } = await import("../../../../src/commands/quest/abandon.js");
	const def = await questAbandonCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

// ── Tests ────────────────────────────────────────────────────

describe("quest:create", () => {
	it("creates a quest via stdin JSON", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runQuestCreate({ json: true }, { name: "fix-logging", goal: "Fix logging" });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.entity).toBe("fix-logging");
		expect(out.previousStatus).toBe("none");
		expect(out.newStatus).toBe("created");
	});

	it("shows human-readable output", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runQuestCreate({}, { name: "fix-logging", goal: "Fix logging" });
		restore();
		const text = chunks.join("");
		expect(text).toContain("fix-logging");
		expect(text).toContain("none");
		expect(text).toContain("created");
	});

	it("is quiet in --quiet mode", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runQuestCreate({ quiet: true }, { name: "fix-logging", goal: "Fix logging" });
		restore();
		expect(chunks.join("")).toBe("");
	});
});

describe("quest:list", () => {
	it("returns empty items when no quests", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runQuestList({ json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.items).toEqual([]);
	});

	it("lists created quests", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G1" });
		begin(projectDir, "create", { type: "quest", name: "q2" }, { name: "q2", goal: "G2" });

		const { chunks, restore } = captureStdout();
		await runQuestList({ json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.items).toHaveLength(2);
		expect(out.items[0].name).toBe("q1");
		expect(out.items[1].name).toBe("q2");
	});

	it("shows human-readable list", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G1" });

		const { chunks, restore } = captureStdout();
		await runQuestList({});
		restore();
		const text = chunks.join("");
		expect(text).toContain("q1");
		expect(text).toContain("created");
	});

	it("shows 'No quests found.' when empty", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runQuestList({});
		restore();
		expect(chunks.join("")).toContain("No quests found.");
	});
});

describe("quest:show", () => {
	it("returns full quest entity", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "Fix" });

		const { chunks, restore } = captureStdout();
		await runQuestShow({ quest: "q1", json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.name).toBe("q1");
		expect(out.status).toBe("created");
		expect(out.goal).toBe("Fix");
	});

	it("shows human-readable output", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "Fix" });

		const { chunks, restore } = captureStdout();
		await runQuestShow({ quest: "q1" });
		restore();
		const text = chunks.join("");
		expect(text).toContain("q1");
		expect(text).toContain("created");
		expect(text).toContain("Fix");
	});

	it("throws when quest not found", async () => {
		initProject();
		await expect(runQuestShow({ quest: "nope", json: true })).rejects.toThrow("not found");
	});
});

describe("quest:plan", () => {
	it("transitions quest to planning", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G" });

		const { chunks, restore } = captureStdout();
		await runQuestPlan({ quest: "q1", json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.previousStatus).toBe("created");
		expect(out.newStatus).toBe("planning");
	});
});

describe("quest:refine-plan", () => {
	it("transitions quest to refining", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G" });
		begin(projectDir, "plan", { type: "quest", name: "q1" }, {});
		writeQuestContent("q1", "plan.md");
		submit(projectDir, "plan", { type: "quest", name: "q1" }, { phase: "plan" });

		const { chunks, restore } = captureStdout();
		await runQuestRefinePlan({ quest: "q1", json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.previousStatus).toBe("plan-created");
		expect(out.newStatus).toBe("refining");
	});
});

describe("quest:implement", () => {
	it("transitions quest to implementing", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G" });
		begin(projectDir, "plan", { type: "quest", name: "q1" }, {});
		writeQuestContent("q1", "plan.md");
		submit(projectDir, "plan", { type: "quest", name: "q1" }, { phase: "plan" });
		submit(
			projectDir,
			"refinement",
			{ type: "quest", name: "q1" },
			{ phase: "refinement", scores: {} },
		);
		writeQuestContent("q1", "plan-refined.md");

		const { chunks, restore } = captureStdout();
		await runQuestImplement({ quest: "q1", json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.previousStatus).toBe("plan-refined");
		expect(out.newStatus).toBe("implementing");
	});
});

describe("quest:complete", () => {
	it("completes a quest with verification", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G" });
		advanceQuestToImplementationComplete("q1");

		const { chunks, restore } = captureStdout();
		await runQuestComplete({ quest: "q1", json: true }, { verificationPassed: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.previousStatus).toBe("implementation-complete");
		expect(out.newStatus).toBe("completed");
	});

	it("completes with learnings", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G" });
		advanceQuestToImplementationComplete("q1");

		const { chunks, restore } = captureStdout();
		await runQuestComplete(
			{ quest: "q1", json: true },
			{
				verificationPassed: true,
				learnings: [
					{
						category: "worked",
						summary: "Approach X worked",
						detail: "Details",
						tags: ["test"],
						rollupTo: ["project"],
					},
				],
			},
		);
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.newStatus).toBe("completed");
		expect(out.learningsRolledUp).toBeDefined();
		expect(out.learningsRolledUp.project).toBe(1);
	});

	it("completes with architecture deltas", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G" });
		advanceQuestToImplementationComplete("q1");

		const { chunks, restore } = captureStdout();
		await runQuestComplete(
			{ quest: "q1", json: true },
			{
				verificationPassed: true,
				architectureDelta: [
					{
						subsystem: "core",
						type: "modify",
						description: "Changed core API",
					},
				],
			},
		);
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.newStatus).toBe("completed");
		expect(out.architecturePaths).toBeDefined();
	});

	it("shows human-readable output with learnings", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G" });
		advanceQuestToImplementationComplete("q1");

		const { chunks, restore } = captureStdout();
		await runQuestComplete(
			{ quest: "q1" },
			{
				verificationPassed: true,
				learnings: [
					{
						category: "worked",
						summary: "X",
						detail: "D",
						tags: [],
						rollupTo: ["project"],
					},
				],
			},
		);
		restore();
		const text = chunks.join("");
		expect(text).toContain("implementation-complete");
		expect(text).toContain("completed");
		expect(text).toContain("Learnings");
	});
});

describe("quest:abandon", () => {
	it("abandons a quest", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G" });

		const { chunks, restore } = captureStdout();
		await runQuestAbandon({ quest: "q1", reason: "No longer needed", json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.previousStatus).toBe("created");
		expect(out.newStatus).toBe("abandoned");
	});

	it("shows human-readable abandon output", async () => {
		initProject();
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "G" });

		const { chunks, restore } = captureStdout();
		await runQuestAbandon({ quest: "q1", reason: "No longer needed" });
		restore();
		const text = chunks.join("");
		expect(text).toContain("q1");
		expect(text).toContain("abandoned");
	});
});

describe("quest full lifecycle", () => {
	it("walks a quest through all phases", async () => {
		initProject();

		// Create
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "Fix" });

		// List
		const { chunks: listChunks, restore: restoreList } = captureStdout();
		await runQuestList({ json: true });
		restoreList();
		const listOut = JSON.parse(listChunks.join(""));
		expect(listOut.items).toHaveLength(1);
		expect(listOut.items[0].status).toBe("created");

		// Plan
		const { chunks: planChunks, restore: restorePlan } = captureStdout();
		await runQuestPlan({ quest: "q1", json: true });
		restorePlan();
		expect(JSON.parse(planChunks.join("")).newStatus).toBe("planning");

		// Submit plan
		writeQuestContent("q1", "plan.md");
		submit(projectDir, "plan", { type: "quest", name: "q1" }, { phase: "plan" });

		// Refine plan
		const { chunks: refineChunks, restore: restoreRefine } = captureStdout();
		await runQuestRefinePlan({ quest: "q1", json: true });
		restoreRefine();
		expect(JSON.parse(refineChunks.join("")).newStatus).toBe("refining");

		// Submit refinement (skips to plan-refined)
		submit(
			projectDir,
			"refinement",
			{ type: "quest", name: "q1" },
			{ phase: "refinement", scores: {} },
		);

		// Implement
		writeQuestContent("q1", "plan-refined.md");
		const { chunks: implChunks, restore: restoreImpl } = captureStdout();
		await runQuestImplement({ quest: "q1", json: true });
		restoreImpl();
		expect(JSON.parse(implChunks.join("")).newStatus).toBe("implementing");

		// Submit implementation
		submit(
			projectDir,
			"implementation",
			{ type: "quest", name: "q1" },
			{ phase: "implementation" },
		);

		// Complete
		const { chunks: completeChunks, restore: restoreComplete } = captureStdout();
		await runQuestComplete(
			{ quest: "q1", json: true },
			{
				verificationPassed: true,
				learnings: [
					{
						category: "worked",
						summary: "Approach worked",
						detail: "Details",
						tags: ["test"],
						rollupTo: ["project"],
					},
				],
			},
		);
		restoreComplete();
		const completeOut = JSON.parse(completeChunks.join(""));
		expect(completeOut.newStatus).toBe("completed");
		expect(completeOut.learningsRolledUp.project).toBe(1);

		// Verify final state via show
		const { chunks: showChunks, restore: restoreShow } = captureStdout();
		await runQuestShow({ quest: "q1", json: true });
		restoreShow();
		const showOut = JSON.parse(showChunks.join(""));
		expect(showOut.status).toBe("completed");
	});
});
