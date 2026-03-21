import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyQuery,
	buildStatusResult,
	formatStatusHuman,
} from "../../../src/commands/global/status.js";
import { statusResultSchema } from "../../../src/schemas/commands/status.js";

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-status-test-"));
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

/** Helper: create a minimal .project/ with project.json */
function createProject(name: string) {
	const projectDir = path.join(tmpDir, ".project");
	fs.mkdirSync(projectDir, { recursive: true });
	const now = new Date().toISOString();
	const project = {
		version: "1.0.0",
		name,
		activeEpic: null,
		activeSlice: null,
		activeQuest: null,
		created: now,
		updated: now,
	};
	fs.writeFileSync(path.join(projectDir, "project.json"), JSON.stringify(project, null, "\t"));
	return projectDir;
}

describe("buildStatusResult", () => {
	it("returns valid StatusResult for a fresh project", () => {
		const projectDir = createProject("test-project");
		const result = buildStatusResult(projectDir);

		const parsed = statusResultSchema.safeParse(result);
		expect(parsed.success).toBe(true);

		expect(result.project.name).toBe("test-project");
		expect(result.project.version).toBe("1.0.0");
		expect(result.activeEpic).toBeNull();
		expect(result.activeSlice).toBeNull();
		expect(result.activeQuest).toBeNull();
		expect(result.artifacts).toEqual({});
		expect(result.recommendations).toContain("Run epic:create to start");
		expect(result.warnings).toEqual([]);
	});

	it("uses resolveProjectDir when no projectDir given", () => {
		createProject("resolve-test");
		const result = buildStatusResult();

		expect(result.project.name).toBe("resolve-test");
	});
});

describe("formatStatusHuman", () => {
	it("shows project name and version", () => {
		const status = buildStatusResult(createProject("human-test"));
		const output = formatStatusHuman(status);

		expect(output).toContain("human-test");
		expect(output).toContain("v1.0.0");
	});

	it("shows 'No active work' when no active entities", () => {
		const status = buildStatusResult(createProject("inactive"));
		const output = formatStatusHuman(status);

		expect(output).toContain("No active work");
	});

	it("shows recommendations", () => {
		const status = buildStatusResult(createProject("rec-test"));
		const output = formatStatusHuman(status);

		expect(output).toContain("Run epic:create to start");
	});

	it("shows warnings when present", () => {
		const status = buildStatusResult(createProject("warn-test"));
		status.warnings = ["Something needs attention"];
		const output = formatStatusHuman(status);

		expect(output).toContain("Something needs attention");
	});
});

describe("applyQuery", () => {
	const sampleData = {
		project: { name: "test", version: "1.0.0" },
		activeEpic: null,
		recommendations: ["Do something", "Do another thing"],
	};

	it("extracts a nested field", () => {
		const result = applyQuery(sampleData, ".project.name");
		expect(result).toBe("test");
	});

	it("returns null when expression matches nothing", () => {
		const result = applyQuery(sampleData, ".nonexistent.field");
		expect(result).toBeNull();
	});

	it("returns array for multiple results", () => {
		const result = applyQuery(sampleData, ".recommendations[]");
		expect(result).toEqual(["Do something", "Do another thing"]);
	});

	it("throws VALIDATION_INVALID_QUERY for invalid expression", () => {
		expect(() => applyQuery(sampleData, ".[invalid!!!")).toThrow("Invalid jq expression");
	});

	it("handles identity expression", () => {
		const result = applyQuery(sampleData, ".");
		expect(result).toEqual(sampleData);
	});

	it("handles null values", () => {
		const result = applyQuery(sampleData, ".activeEpic");
		expect(result).toBeNull();
	});
});

describe("status command integration", () => {
	async function runStatus(args: {
		json?: boolean;
		query?: string;
		quiet?: boolean;
		verbose?: boolean;
	}) {
		const { statusCommand } = await import("../../../src/commands/global/status.js");
		const def = await statusCommand;
		if (def.run) {
			await def.run({
				args: {
					json: args.json ?? false,
					query: args.query ?? "",
					quiet: args.quiet ?? false,
					verbose: args.verbose ?? false,
				},
				rawArgs: [],
				cmd: def,
			});
		}
	}

	it("outputs valid JSON with --json", async () => {
		createProject("json-status");
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runStatus({ json: true });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		const result = statusResultSchema.safeParse(parsed);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.project.name).toBe("json-status");
		}
	});

	it("outputs human-readable format without --json", async () => {
		createProject("human-status");
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runStatus({});

		const outputStr = chunks.join("");
		expect(outputStr).toContain("human-status");
		expect(outputStr).toContain("No active work");
	});

	it("applies --query with --json", async () => {
		createProject("query-test");
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runStatus({ json: true, query: ".project.name" });

		const outputStr = chunks.join("").trim();
		expect(JSON.parse(outputStr)).toBe("query-test");
	});

	it("throws error when --query used without --json", async () => {
		createProject("no-json-query");

		await expect(runStatus({ query: ".project.name" })).rejects.toThrow(
			"--query requires --json flag",
		);
	});
});
