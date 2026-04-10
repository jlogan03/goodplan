import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-migrate-v2-test-"));
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

/**
 * Helper: dynamically import migrateCommand fresh each test to avoid module caching.
 */
async function runMigrate(args: {
	json?: boolean;
	quiet?: boolean;
	query?: string;
	verbose?: boolean;
}) {
	const { migrateCommand } = await import("../../../src/commands/global/migrate.js");
	const def = await migrateCommand;
	if (def.run) {
		await def.run({
			args: {
				json: args.json ?? false,
				quiet: args.quiet ?? false,
				verbose: args.verbose ?? false,
				force: false,
				...(args.query !== undefined ? { query: args.query } : {}),
			},
			rawArgs: [],
			cmd: def,
		});
	}
}

describe("migrate command (v2 detection-only)", () => {
	it("detects v1 project with state-cache.json", async () => {
		const gpDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(gpDir);
		fs.writeFileSync(path.join(gpDir, "state-cache.json"), "{}");
		fs.writeFileSync(path.join(gpDir, "project.json"), "{}");

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({ json: true });

		const output = JSON.parse(chunks.join(""));
		expect(output.version).toBe("v1");
		expect(output.indicators).toContain("state-cache.json");
		expect(output.indicators).toContain("project.json");
		expect(output.message).toContain("v1 project detected");
	});

	it("detects v2 project with events.jsonl", async () => {
		const gpDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(gpDir);
		fs.writeFileSync(path.join(gpDir, "events.jsonl"), "");

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({ json: true });

		const output = JSON.parse(chunks.join(""));
		expect(output.version).toBe("v2");
		expect(output.indicators).toContain("events.jsonl");
		expect(output.message).toContain("Already a v2 project");
	});

	it("detects partial migration (both v1 and v2 indicators)", async () => {
		const gpDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(gpDir);
		fs.writeFileSync(path.join(gpDir, "state-cache.json"), "{}");
		fs.writeFileSync(path.join(gpDir, "events.jsonl"), "");

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({ json: true });

		const output = JSON.parse(chunks.join(""));
		expect(output.version).toBe("partial");
		expect(output.indicators).toContain("state-cache.json");
		expect(output.indicators).toContain("events.jsonl");
		expect(output.message).toContain("Partially migrated");
	});

	it("reports no project when no .goodplan/ or .project/ exists", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({ json: true });

		const output = JSON.parse(chunks.join(""));
		expect(output.version).toBe("none");
		expect(output.indicators).toHaveLength(0);
		expect(output.message).toContain("No project found");
	});

	it("detects legacy .project/ directory as v1 indicator", async () => {
		const legacyDir = path.join(tmpDir, ".project");
		fs.mkdirSync(legacyDir);
		fs.writeFileSync(path.join(legacyDir, "project.json"), "{}");

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({ json: true });

		const output = JSON.parse(chunks.join(""));
		expect(output.version).toBe("v1");
		expect(output.indicators).toContain(".project");
		expect(output.indicators).toContain("project.json");
	});

	it("detects v1 with state.json indicator", async () => {
		const gpDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(gpDir);
		fs.writeFileSync(path.join(gpDir, "state.json"), "{}");

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({ json: true });

		const output = JSON.parse(chunks.join(""));
		expect(output.version).toBe("v1");
		expect(output.indicators).toContain("state.json");
	});

	it("outputs human-readable message when --json is not set", async () => {
		const gpDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(gpDir);
		fs.writeFileSync(path.join(gpDir, "events.jsonl"), "");

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({});

		const outputStr = chunks.join("");
		expect(outputStr).toContain("Already a v2 project");
	});

	it("suppresses output with --quiet", async () => {
		const gpDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(gpDir);
		fs.writeFileSync(path.join(gpDir, "events.jsonl"), "");

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({ quiet: true });

		expect(chunks.join("")).toBe("");
	});

	it("supports --query for jq-style filtering", async () => {
		const gpDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(gpDir);
		fs.writeFileSync(path.join(gpDir, "events.jsonl"), "");

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({ query: ".version" });

		const output = JSON.parse(chunks.join("").trim());
		expect(output).toBe("v2");
	});

	it("detects .goodplan/ with no recognizable indicators as none", async () => {
		// .goodplan/ exists but is empty — no v1 or v2 indicators
		const gpDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(gpDir);

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runMigrate({ json: true });

		const output = JSON.parse(chunks.join(""));
		expect(output.version).toBe("none");
		expect(output.message).toContain("No project found");
	});
});
