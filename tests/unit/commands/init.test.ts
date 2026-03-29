import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectSchema } from "../../../src/schemas/entities/project.js";

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-init-test-"));
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

/**
 * Helper: dynamically import initCommand fresh each test to avoid module caching issues.
 * We run the command's setup + run by calling its run function directly.
 */
async function runInit(args: {
	name?: string;
	json?: boolean;
	quiet?: boolean;
	verbose?: boolean;
}) {
	const { initCommand } = await import("../../../src/commands/global/init.js");
	const def = await initCommand;
	if (def.run) {
		await def.run({
			args: {
				name: args.name ?? "",
				json: args.json ?? false,
				quiet: args.quiet ?? false,
				verbose: args.verbose ?? false,
			},
			rawArgs: [],
			cmd: def,
		});
	}
}

describe("init command", () => {
	it("creates .goodplan/ with valid project.json", async () => {
		// Capture stdout
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({ name: "test-project" });

		const projectJsonPath = path.join(tmpDir, ".goodplan", "project.json");
		expect(fs.existsSync(projectJsonPath)).toBe(true);

		const raw = fs.readFileSync(projectJsonPath, "utf-8");
		const data = JSON.parse(raw);
		const result = projectSchema.safeParse(data);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("test-project");
			expect(result.data.version).toBe("1.0.0");
			expect(result.data.activeEpic).toBeNull();
			expect(result.data.activeSlice).toBeNull();
			expect(result.data.activeQuest).toBeNull();
		}

		writeSpy.mockRestore();
	});

	it("creates overview files and collection directories", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({ name: "full-tree" });

		const projectDir = path.join(tmpDir, ".goodplan");

		// Overview files
		expect(fs.existsSync(path.join(projectDir, "epics", "overview.json"))).toBe(true);
		expect(fs.existsSync(path.join(projectDir, "quests", "overview.json"))).toBe(true);

		// JSONL files
		expect(fs.existsSync(path.join(projectDir, "activity-log.jsonl"))).toBe(true);
		expect(fs.existsSync(path.join(projectDir, "decisions.jsonl"))).toBe(true);
		expect(fs.existsSync(path.join(projectDir, "learnings.jsonl"))).toBe(true);

		// Activity log has init entry
		const activityLog = fs.readFileSync(path.join(projectDir, "activity-log.jsonl"), "utf-8");
		const lines = activityLog.trim().split("\n");
		expect(lines).toHaveLength(1);
		const entry = JSON.parse(lines[0]!);
		expect(entry.phase).toBe("init");
		expect(entry.scope).toBe("project");
		expect(entry.status).toBe("complete");
		expect(entry.summary).toContain("full-tree");

		// Empty JSONL files
		const decisions = fs.readFileSync(path.join(projectDir, "decisions.jsonl"), "utf-8");
		expect(decisions.trim()).toBe("");
		const learnings = fs.readFileSync(path.join(projectDir, "learnings.jsonl"), "utf-8");
		expect(learnings.trim()).toBe("");

		writeSpy.mockRestore();
	});

	it("defaults --name to path.basename(cwd)", async () => {
		// Create a subdirectory with a known name and chdir into it
		const namedDir = path.join(tmpDir, "my-cool-project");
		fs.mkdirSync(namedDir);
		process.chdir(namedDir);

		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({});

		const projectJsonPath = path.join(namedDir, ".goodplan", "project.json");
		const data = JSON.parse(fs.readFileSync(projectJsonPath, "utf-8"));
		expect(data.name).toBe("my-cool-project");

		writeSpy.mockRestore();
	});

	it("throws STATE_ALREADY_INITIALIZED if .goodplan/ already exists", async () => {
		fs.mkdirSync(path.join(tmpDir, ".goodplan"));

		await expect(runInit({ name: "test" })).rejects.toThrow("already initialized");
	});

	it("does NOT detect parent .goodplan/ (only checks cwd)", async () => {
		// Create .goodplan/ in parent
		fs.mkdirSync(path.join(tmpDir, ".goodplan"));

		// Create a child directory and chdir into it
		const childDir = path.join(tmpDir, "child");
		fs.mkdirSync(childDir);
		process.chdir(childDir);

		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		// Should succeed — init only checks cwd, not parents
		await runInit({ name: "child-project" });

		const projectJsonPath = path.join(childDir, ".goodplan", "project.json");
		expect(fs.existsSync(projectJsonPath)).toBe(true);

		writeSpy.mockRestore();
	});

	it("outputs JSON when --json flag is set", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runInit({ name: "json-test", json: true });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.name).toBe("json-test");
		expect(parsed.version).toBe("1.0.0");
	});

	it("outputs human-readable message when --json is not set", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runInit({ name: "human-test" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("human-test");
		expect(outputStr).toContain("Initialized");
	});

	it("suppresses output with --quiet", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runInit({ name: "quiet-test", quiet: true });

		// No output should be produced
		expect(chunks.join("")).toBe("");

		// But project should still be created
		expect(fs.existsSync(path.join(tmpDir, ".goodplan", "project.json"))).toBe(true);
	});
});
