import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { begin } from "../../../../src/core/rpc/begin.js";
import { rpcInit } from "../../../../src/core/rpc/init.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-decision-cmd-"));
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

function createDecision(id: string, domain: string, title: string, summary: string) {
	return begin(projectDir, "create-decision", { type: "decision", id }, {
		id,
		domain,
		title,
		summary,
	});
}

// ── Command runners ──────────────────────────────────────────

async function runDecisionCreate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { decisionCreateCommand } = await import("../../../../src/commands/decision/create.js");
	const def = await decisionCreateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runDecisionUpdate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { decisionUpdateCommand } = await import("../../../../src/commands/decision/update.js");
	const def = await decisionUpdateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runDecisionList(args: Record<string, unknown>) {
	const { decisionListCommand } = await import("../../../../src/commands/decision/list.js");
	const def = await decisionListCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runDecisionShow(args: Record<string, unknown>) {
	const { decisionShowCommand } = await import("../../../../src/commands/decision/show.js");
	const def = await decisionShowCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

// ── Tests ────────────────────────────────────────────────────

describe("decision:create", () => {
	it("creates a decision via stdin JSON", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runDecisionCreate(
			{ json: true },
			{ id: "use-postgres", domain: "data", title: "Use PostgreSQL", summary: "Chosen for reliability" },
		);
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.entity).toBe("use-postgres");
		expect(out.previousStatus).toBe("none");
		expect(out.newStatus).toBe("active");
	});

	it("shows human-readable output", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runDecisionCreate(
			{},
			{ id: "use-postgres", domain: "data", title: "Use PostgreSQL", summary: "Chosen for reliability" },
		);
		restore();
		const text = chunks.join("");
		expect(text).toContain("use-postgres");
		expect(text).toContain("none");
		expect(text).toContain("active");
	});

	it("is quiet in --quiet mode", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runDecisionCreate(
			{ quiet: true },
			{ id: "use-postgres", domain: "data", title: "Use PostgreSQL", summary: "Chosen for reliability" },
		);
		restore();
		expect(chunks.join("")).toBe("");
	});
});

describe("decision:list", () => {
	it("returns empty items when no decisions", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runDecisionList({ json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.items).toEqual([]);
	});

	it("lists created decisions", async () => {
		initProject();
		createDecision("d1", "arch", "Decision 1", "Summary 1");
		createDecision("d2", "data", "Decision 2", "Summary 2");

		const { chunks, restore } = captureStdout();
		await runDecisionList({ json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.items).toHaveLength(2);
		expect(out.items[0].id).toBe("d1");
		expect(out.items[1].id).toBe("d2");
	});

	it("shows human-readable list", async () => {
		initProject();
		createDecision("d1", "arch", "Decision 1", "Summary 1");

		const { chunks, restore } = captureStdout();
		await runDecisionList({});
		restore();
		const text = chunks.join("");
		expect(text).toContain("d1");
		expect(text).toContain("active");
		expect(text).toContain("arch");
	});

	it("shows 'No decisions found.' when empty", async () => {
		initProject();
		const { chunks, restore } = captureStdout();
		await runDecisionList({});
		restore();
		expect(chunks.join("")).toContain("No decisions found.");
	});
});

describe("decision:show", () => {
	it("returns full decision entry", async () => {
		initProject();
		createDecision("d1", "arch", "My Decision", "Summary here");

		const { chunks, restore } = captureStdout();
		await runDecisionShow({ id: "d1", json: true });
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.id).toBe("d1");
		expect(out.status).toBe("active");
		expect(out.domain).toBe("arch");
		expect(out.title).toBe("My Decision");
		expect(out.summary).toBe("Summary here");
	});

	it("shows human-readable output", async () => {
		initProject();
		createDecision("d1", "arch", "My Decision", "Summary here");

		const { chunks, restore } = captureStdout();
		await runDecisionShow({ id: "d1" });
		restore();
		const text = chunks.join("");
		expect(text).toContain("d1");
		expect(text).toContain("active");
		expect(text).toContain("My Decision");
	});

	it("throws when decision not found", async () => {
		initProject();
		await expect(runDecisionShow({ id: "nope", json: true })).rejects.toThrow("not found");
	});
});

describe("decision:update", () => {
	it("updates decision status", async () => {
		initProject();
		createDecision("d1", "arch", "Decision", "Summary");

		const { chunks, restore } = captureStdout();
		await runDecisionUpdate(
			{ id: "d1", json: true },
			{ id: "d1", changes: { status: "revisiting" } },
		);
		restore();
		const out = JSON.parse(chunks.join(""));
		expect(out.entity).toBe("d1");
		expect(out.previousStatus).toBe("active");
		expect(out.newStatus).toBe("revisiting");
	});

	it("shows human-readable update output", async () => {
		initProject();
		createDecision("d1", "arch", "Decision", "Summary");

		const { chunks, restore } = captureStdout();
		await runDecisionUpdate(
			{ id: "d1" },
			{ id: "d1", changes: { status: "revisiting" } },
		);
		restore();
		const text = chunks.join("");
		expect(text).toContain("d1");
		expect(text).toContain("active");
		expect(text).toContain("revisiting");
	});
});

describe("decision full lifecycle", () => {
	it("create -> update to revisiting -> update back to active -> supersede", async () => {
		initProject();

		// Create
		const { chunks: c1, restore: r1 } = captureStdout();
		await runDecisionCreate(
			{ json: true },
			{ id: "d1", domain: "arch", title: "Decision 1", summary: "Summary" },
		);
		r1();
		const createOut = JSON.parse(c1.join(""));
		expect(createOut.newStatus).toBe("active");

		// Update to revisiting
		const { chunks: c2, restore: r2 } = captureStdout();
		await runDecisionUpdate(
			{ id: "d1", json: true },
			{ id: "d1", changes: { status: "revisiting" } },
		);
		r2();
		const update1Out = JSON.parse(c2.join(""));
		expect(update1Out.previousStatus).toBe("active");
		expect(update1Out.newStatus).toBe("revisiting");

		// Update back to active
		const { chunks: c3, restore: r3 } = captureStdout();
		await runDecisionUpdate(
			{ id: "d1", json: true },
			{ id: "d1", changes: { status: "active" } },
		);
		r3();
		const update2Out = JSON.parse(c3.join(""));
		expect(update2Out.previousStatus).toBe("revisiting");
		expect(update2Out.newStatus).toBe("active");

		// Create another decision
		const { chunks: c4, restore: r4 } = captureStdout();
		await runDecisionCreate(
			{ json: true },
			{ id: "d2", domain: "arch", title: "Decision 2", summary: "Replaces d1" },
		);
		r4();
		expect(JSON.parse(c4.join("")).newStatus).toBe("active");

		// Supersede d1
		const { chunks: c5, restore: r5 } = captureStdout();
		await runDecisionUpdate(
			{ id: "d1", json: true },
			{ id: "d1", changes: { status: "superseded", supersededBy: "d2" } },
		);
		r5();
		const supersedeOut = JSON.parse(c5.join(""));
		expect(supersedeOut.previousStatus).toBe("active");
		expect(supersedeOut.newStatus).toBe("superseded");

		// Verify via show
		const { chunks: c6, restore: r6 } = captureStdout();
		await runDecisionShow({ id: "d1", json: true });
		r6();
		const showOut = JSON.parse(c6.join(""));
		expect(showOut.status).toBe("superseded");
		expect(showOut.supersededBy).toBe("d2");

		// List should show both
		const { chunks: c7, restore: r7 } = captureStdout();
		await runDecisionList({ json: true });
		r7();
		const listOut = JSON.parse(c7.join(""));
		expect(listOut.items).toHaveLength(2);
	});
});
