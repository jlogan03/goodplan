import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commitState } from "../../../src/core/data/commit.js";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { deterministicStringify } from "../../../src/util/json.js";

let tmpDir: string;
let originalCwd: string;

const NOW = "2026-03-22T00:00:00.000Z";

const projectContent = {
	version: "1.0.0",
	name: "verify-test",
	activeEpic: null,
	activeSlice: null,
	activeQuest: null,
	created: NOW,
	updated: NOW,
};

/** Create a valid v2 event envelope as JSON string */
function makeEventLine(overrides: {
	id?: string;
	prevId?: string | null;
	domain?: string;
	type?: string;
	schemaVersion?: number;
	payload?: Record<string, unknown>;
}): string {
	return JSON.stringify({
		id: overrides.id ?? crypto.randomUUID(),
		schemaVersion: overrides.schemaVersion ?? 1,
		ts: NOW,
		scope: "project",
		scopeRef: null,
		actor: { kind: "cli", id: "test" },
		branch: "main",
		commitHint: null,
		domain: overrides.domain ?? "entity-lifecycle",
		type: overrides.type ?? "project-initialized",
		payload: overrides.payload ?? { name: "test" },
		prevId: overrides.prevId ?? null,
	});
}

/** Create a project with valid v2 events.jsonl */
function createV2Project(): string {
	const projectDir = path.join(tmpDir, ".goodplan");
	fs.mkdirSync(projectDir, { recursive: true });

	// Init git repo for ContentRef verification
	const { execFileSync } = require("node:child_process");
	execFileSync("git", ["init"], { cwd: tmpDir, stdio: "pipe" });
	execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "--allow-empty", "-m", "init"], { cwd: tmpDir, stdio: "pipe" });

	const event1Id = crypto.randomUUID();
	const event2Id = crypto.randomUUID();
	const events = [
		makeEventLine({ id: event1Id, prevId: null, type: "project-initialized", payload: { name: "verify-test" } }),
		makeEventLine({ id: event2Id, prevId: event1Id, domain: "entity-lifecycle", type: "project-initialized", payload: { name: "verify-test" } }),
	].join("\n") + "\n";

	fs.writeFileSync(path.join(projectDir, "events.jsonl"), events);
	fs.writeFileSync(path.join(projectDir, "project.json"), `${deterministicStringify(projectContent)}\n`);

	return projectDir;
}

/** Create a v1-only project with HMAC signature */
function createV1SignedProject(): string {
	const projectDir = path.join(tmpDir, ".goodplan");
	fs.mkdirSync(projectDir, { recursive: true });

	const newState: ProjectState = {
		type: "directory",
		contents: {
			"project.json": { type: "json", content: projectContent },
			"overview.json": { type: "json", content: { epics: [], quests: [], tasks: [] } },
			"activity-log.jsonl": { type: "jsonl", content: [] },
			"decisions.jsonl": { type: "jsonl", content: [] },
			"learnings.jsonl": { type: "jsonl", content: [] },
		},
	};

	commitState(projectDir, ZERO_STATE, newState);
	return projectDir;
}

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-verify-test-"));
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

async function runVerify(args: {
	json?: boolean;
	query?: string;
	quiet?: boolean;
	verbose?: boolean;
	fix?: boolean;
	force?: boolean;
}) {
	const { verifyCommand } = await import("../../../src/commands/global/verify.js");
	const def = verifyCommand;
	if (def.run) {
		await def.run({
			args: {
				json: args.json ?? false,
				query: args.query ?? "",
				quiet: args.quiet ?? false,
				verbose: args.verbose ?? false,
				fix: args.fix ?? false,
				force: args.force ?? false,
			},
			rawArgs: [],
			cmd: def,
		});
	}
}

describe("gp verify (v2 event log)", () => {
	it("returns pass on valid v2 event log (JSON)", async () => {
		createV2Project();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runVerify({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.status).toBe("pass");
		expect(parsed.eventsChecked).toBe(2);
		expect(parsed.scopesChecked).toBe(1);
		expect(parsed.issues).toHaveLength(0);
	});

	it("returns pass with human-readable output", async () => {
		createV2Project();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runVerify({});

		const text = chunks.join("");
		expect(text).toContain("Integrity: pass");
		expect(text).toContain("2 events");
	});

	it("detects broken prevId chain", async () => {
		const projectDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(projectDir, { recursive: true });

		// Init git
		const { execFileSync } = require("node:child_process");
		execFileSync("git", ["init"], { cwd: tmpDir, stdio: "pipe" });
		execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "--allow-empty", "-m", "init"], { cwd: tmpDir, stdio: "pipe" });

		const id1 = crypto.randomUUID();
		const id2 = crypto.randomUUID();
		const wrongPrevId = crypto.randomUUID();
		const events = [
			makeEventLine({ id: id1, prevId: null }),
			makeEventLine({ id: id2, prevId: wrongPrevId }),
		].join("\n") + "\n";

		fs.writeFileSync(path.join(projectDir, "events.jsonl"), events);

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});
		vi.spyOn(process.stderr, "write").mockImplementation(() => true);

		process.exitCode = 0;
		await runVerify({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.status).toBe("fail");
		expect(parsed.issues.length).toBeGreaterThan(0);
		expect(parsed.issues[0].issue).toContain("prevId chain broken");
		expect(process.exitCode).toBe(1);
	});

	it("detects invalid JSON in event log", async () => {
		const projectDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(projectDir, { recursive: true });

		fs.writeFileSync(path.join(projectDir, "events.jsonl"), "not json\n");

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});
		vi.spyOn(process.stderr, "write").mockImplementation(() => true);

		process.exitCode = 0;
		await runVerify({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.status).toBe("fail");
		expect(parsed.issues[0].issue).toBe("Invalid JSON");
	});

	it("returns pass with 0 events when no event logs exist", async () => {
		const projectDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(projectDir, { recursive: true });
		fs.writeFileSync(path.join(projectDir, "project.json"), `${deterministicStringify(projectContent)}\n`);

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runVerify({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.status).toBe("pass");
		expect(parsed.eventsChecked).toBe(0);
	});
});

describe("gp verify --fix (v1 HMAC)", () => {
	it("fixes tampered v1 project", async () => {
		const projectDir = createV1SignedProject();

		// Tamper
		const projectPath = path.join(projectDir, "project.json");
		const raw = JSON.parse(fs.readFileSync(projectPath, "utf-8"));
		raw.name = "tampered";
		fs.writeFileSync(projectPath, `${deterministicStringify(raw)}\n`);

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runVerify({ fix: true, json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.status).toBe("fixed");
	});
});
