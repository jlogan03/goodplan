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

/** Create a minimal project via commitState so it has a valid signature */
function createSignedProject(): string {
	const projectDir = path.join(tmpDir, ".goodplan");
	fs.mkdirSync(projectDir, { recursive: true });

	const newState: ProjectState = {
		type: "directory",
		contents: {
			"project.json": { type: "json", content: projectContent },
			"overview.json": {
				type: "json",
				content: { epics: [], quests: [], tasks: [] },
			},
			"activity-log.jsonl": { type: "jsonl", content: [] },
			"decisions.jsonl": { type: "jsonl", content: [] },
			"learnings.jsonl": { type: "jsonl", content: [] },
		},
	};

	commitState(projectDir, ZERO_STATE, newState);
	return projectDir;
}

/** Create a project without a signature (bootstrap scenario) */
function createUnsignedProject(): string {
	const projectDir = path.join(tmpDir, ".goodplan");
	fs.mkdirSync(projectDir, { recursive: true });
	fs.writeFileSync(
		path.join(projectDir, "project.json"),
		`${deterministicStringify(projectContent)}\n`,
	);
	fs.writeFileSync(
		path.join(projectDir, "overview.json"),
		`${deterministicStringify({ epics: [], quests: [], tasks: [] })}\n`,
	);
	fs.writeFileSync(path.join(projectDir, "activity-log.jsonl"), "");
	fs.writeFileSync(path.join(projectDir, "decisions.jsonl"), "");
	fs.writeFileSync(path.join(projectDir, "learnings.jsonl"), "");
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

describe("gp verify", () => {
	it("returns pass on valid project (JSON)", async () => {
		createSignedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runVerify({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.status).toBe("pass");
	});

	it("returns pass on valid project (human-readable)", async () => {
		createSignedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runVerify({});

		const text = chunks.join("");
		expect(text).toContain("State integrity: pass");
		expect(text).toContain("sig:");
	});

	it("throws DATA_INTEGRITY_CHECK_FAILED on tampered project (JSON)", async () => {
		const projectDir = createSignedProject();

		// Tamper with project.json
		const projectPath = path.join(projectDir, "project.json");
		const raw = JSON.parse(fs.readFileSync(projectPath, "utf-8"));
		raw.name = "tampered";
		fs.writeFileSync(projectPath, `${deterministicStringify(raw)}\n`);

		const stdoutChunks: string[] = [];
		const stderrChunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			stdoutChunks.push(String(chunk));
			return true;
		});
		vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
			stderrChunks.push(String(chunk));
			return true;
		});

		process.exitCode = 0;
		await runVerify({ json: true });

		const parsed = JSON.parse(stdoutChunks.join(""));
		expect(parsed.error).toBeDefined();
		expect(parsed.error.code).toBe("DATA_INTEGRITY_CHECK_FAILED");
		expect(process.exitCode).toBe(1);
	});

	it("throws DATA_INTEGRITY_CHECK_FAILED on tampered project (human-readable)", async () => {
		const projectDir = createSignedProject();

		const projectPath = path.join(projectDir, "project.json");
		const raw = JSON.parse(fs.readFileSync(projectPath, "utf-8"));
		raw.name = "tampered";
		fs.writeFileSync(projectPath, `${deterministicStringify(raw)}\n`);

		const stderrChunks: string[] = [];
		vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
			stderrChunks.push(String(chunk));
			return true;
		});
		vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		process.exitCode = 0;
		await runVerify({});

		const errText = stderrChunks.join("");
		expect(errText).toContain("gp verify --fix");
		expect(process.exitCode).toBe(1);
	});

	it("returns pass for bootstrap (no signature)", async () => {
		createUnsignedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runVerify({ json: true });

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.status).toBe("pass");
		expect(parsed.note).toContain("bootstrap");
	});
});

describe("gp verify --fix", () => {
	it("fixes tampered project (JSON)", async () => {
		const projectDir = createSignedProject();

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

		// Verify the fix worked: subsequent verify passes
		const chunks2: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks2.push(String(chunk));
			return true;
		});

		await runVerify({ json: true });
		const parsed2 = JSON.parse(chunks2.join(""));
		expect(parsed2.status).toBe("pass");
	});

	it("fixes tampered project (human-readable)", async () => {
		const projectDir = createSignedProject();

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

		await runVerify({ fix: true });

		const text = chunks.join("");
		expect(text).toContain("State signature recomputed.");
	});
});
