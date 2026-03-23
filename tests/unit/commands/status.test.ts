import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildStatusResult,
	formatStatusHuman,
} from "../../../src/commands/global/status.js";
import { applyQuery } from "../../../src/util/query.js";
import { statusResultSchema } from "../../../src/schemas/commands/status.js";
import { deterministicStringify } from "../../../src/util/json.js";

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

const NOW = "2026-03-22T00:00:00.000Z";

/** Helper: create a minimal .project/ with project.json */
function createProject(
	name: string,
	overrides?: Partial<{
		activeEpic: string | null;
		activeSlice: string | null;
		activeQuest: string | null;
	}>,
) {
	const projectDir = path.join(tmpDir, ".project");
	fs.mkdirSync(projectDir, { recursive: true });
	const project = {
		version: "1.0.0",
		name,
		activeEpic: overrides?.activeEpic ?? null,
		activeSlice: overrides?.activeSlice ?? null,
		activeQuest: overrides?.activeQuest ?? null,
		created: NOW,
		updated: NOW,
	};
	fs.writeFileSync(
		path.join(projectDir, "project.json"),
		`${deterministicStringify(project)}\n`,
	);
	return projectDir;
}

/** Helper: write a JSON file in the project dir */
function writeJson(projectDir: string, relPath: string, data: unknown) {
	const abs = path.join(projectDir, relPath);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, `${deterministicStringify(data)}\n`);
}

/** Helper: write a JSONL file in the project dir */
function writeJsonl(projectDir: string, relPath: string, entries: unknown[]) {
	const abs = path.join(projectDir, relPath);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	const content = entries.map((e) => JSON.stringify(e)).join("\n");
	fs.writeFileSync(abs, content.length > 0 ? `${content}\n` : "");
}

/** Helper: write a markdown file */
function writeMarkdown(projectDir: string, relPath: string, content: string) {
	const abs = path.join(projectDir, relPath);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, content);
}

/** Helper: create a fully populated project for artifact counting */
function createPopulatedProject() {
	const projectDir = createProject("populated", {
		activeEpic: "my-epic",
		activeSlice: "01-auth",
		activeQuest: null,
	});

	// Epic
	writeJson(projectDir, "epics/overview.json", {
		items: [{ name: "my-epic", status: "activated", created: NOW, completed: null }],
	});
	writeJson(projectDir, "epics/my-epic/epic.json", {
		name: "my-epic",
		status: "activated",
		goal: "Build things",
		verifications: [],
		refinement: null,
		sliceSequence: ["01-auth", "02-api", "03-ui"],
		created: NOW,
		activated: NOW,
		updated: NOW,
	});

	// Epic-level markdown artifacts
	writeMarkdown(projectDir, "epics/my-epic/architecture/_overview.md", "# Arch");
	writeMarkdown(projectDir, "epics/my-epic/architecture/data-model.md", "# Data");
	writeMarkdown(projectDir, "epics/my-epic/research/topic.md", "# Topic");
	writeMarkdown(projectDir, "epics/my-epic/brainstorm/ideas.md", "# Ideas");

	// Slices
	writeJson(projectDir, "slices/overview.json", {
		items: [
			{ name: "01-auth", status: "implementing", epic: "my-epic", created: NOW, completed: null },
			{ name: "02-api", status: "created", epic: "my-epic", created: NOW, completed: null },
			{ name: "03-ui", status: "completed", epic: "my-epic", created: NOW, completed: NOW },
		],
	});
	writeJson(projectDir, "slices/01-auth/slice.json", {
		name: "01-auth",
		epic: "my-epic",
		status: "implementing",
		goal: "Auth slice",
		deferred: [],
		refinement: null,
		created: NOW,
		updated: NOW,
	});
	writeJsonl(projectDir, "slices/01-auth/learnings.jsonl", []);
	writeJsonl(projectDir, "slices/01-auth/architecture-deltas.jsonl", []);

	// Decisions
	writeJsonl(projectDir, "decisions.jsonl", [
		{ id: "d1", status: "active", domain: "architecture", title: "T1", summary: "S1", date: "2026-03-20", supersededBy: null },
		{ id: "d2", status: "active", domain: "testing", title: "T2", summary: "S2", date: "2026-03-21", supersededBy: null },
	]);

	// Learnings (project-level)
	writeJsonl(projectDir, "learnings.jsonl", [
		{ category: "worked", summary: "Zod is great", detail: "Detail", tags: ["zod"], source: "slices/01-auth", rollup: true, rollupTo: ["project"] },
	]);

	// Activity log
	writeJsonl(projectDir, "activity-log.jsonl", [
		{ ts: NOW, phase: "begin-implementation", scope: "slices/01-auth", status: "complete", summary: "Started impl" },
	]);

	// Quests (empty)
	writeJson(projectDir, "quests/overview.json", { items: [] });

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
		expect(result.artifacts.decisions).toBe(0);
		expect(result.artifacts.learnings).toBe(0);
		expect(result.artifacts.completedSlices).toBe(0);
		expect(result.artifacts.totalSlices).toBe(0);
		expect(result.recommendations).toContain("Run epic:create to start");
		expect(result.warnings).toEqual([]);
	});

	it("uses resolveProjectDir when no projectDir given", () => {
		createProject("resolve-test");
		const result = buildStatusResult();

		expect(result.project.name).toBe("resolve-test");
	});

	it("counts artifacts accurately for a populated project", () => {
		const projectDir = createPopulatedProject();
		const result = buildStatusResult(projectDir);

		expect(result.artifacts.architectureFiles).toBe(2); // 2 epic arch files
		expect(result.artifacts.researchFiles).toBe(1);
		expect(result.artifacts.brainstormFiles).toBe(1);
		expect(result.artifacts.prototypeFiles).toBe(0);
		expect(result.artifacts.decisions).toBe(2);
		expect(result.artifacts.learnings).toBe(1);
		expect(result.artifacts.completedSlices).toBe(1);
		expect(result.artifacts.totalSlices).toBe(3);
	});

	it("detects active epic with name and status", () => {
		const projectDir = createPopulatedProject();
		const result = buildStatusResult(projectDir);

		expect(result.activeEpic).toEqual({ name: "my-epic", status: "activated" });
	});

	it("detects active slice with name and status", () => {
		const projectDir = createPopulatedProject();
		const result = buildStatusResult(projectDir);

		expect(result.activeSlice).toEqual({ name: "01-auth", status: "implementing" });
	});

	it("returns null for active entities when no active epic/slice/quest", () => {
		const projectDir = createProject("empty-proj");
		const result = buildStatusResult(projectDir);

		expect(result.activeEpic).toBeNull();
		expect(result.activeSlice).toBeNull();
		expect(result.activeQuest).toBeNull();
	});

	it("detects active quest", () => {
		const projectDir = createProject("quest-proj", { activeQuest: "fix-logging" });
		writeJson(projectDir, "quests/overview.json", {
			items: [{ name: "fix-logging", status: "planning", created: NOW, completed: null }],
		});
		writeJson(projectDir, "quests/fix-logging/quest.json", {
			name: "fix-logging",
			status: "planning",
			goal: "Fix logging",
			refinement: null,
			created: NOW,
			updated: NOW,
		});

		const result = buildStatusResult(projectDir);
		expect(result.activeQuest).toEqual({ name: "fix-logging", status: "planning" });
	});

	it("generates slice progress recommendation", () => {
		const projectDir = createPopulatedProject();
		const result = buildStatusResult(projectDir);

		expect(result.recommendations).toEqual(
			expect.arrayContaining([
				expect.stringContaining("Epic my-epic: 1/3 slices complete"),
			]),
		);
	});

	it("generates next-action recommendation for active slice", () => {
		const projectDir = createPopulatedProject();
		const result = buildStatusResult(projectDir);

		expect(result.recommendations).toEqual(
			expect.arrayContaining([
				expect.stringContaining("Active slice 01-auth is implementing"),
			]),
		);
	});

	it("generates stale warning when entity has no recent activity", () => {
		const projectDir = createProject("stale-proj", {
			activeSlice: "01-stale",
		});
		writeJson(projectDir, "slices/overview.json", {
			items: [{ name: "01-stale", status: "implementing", epic: "e", created: NOW, completed: null }],
		});
		writeJson(projectDir, "slices/01-stale/slice.json", {
			name: "01-stale",
			epic: "my-epic",
			status: "implementing",
			goal: "Stale slice",
			deferred: [],
			refinement: null,
			created: NOW,
			updated: NOW,
		});
		writeJsonl(projectDir, "slices/01-stale/learnings.jsonl", []);
		writeJsonl(projectDir, "slices/01-stale/architecture-deltas.jsonl", []);

		// Activity log with old timestamp (10 days ago)
		const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
		writeJsonl(projectDir, "activity-log.jsonl", [
			{ ts: tenDaysAgo, phase: "begin-plan", scope: "slices/01-stale", status: "complete", summary: "Old" },
		]);

		const result = buildStatusResult(projectDir);
		expect(result.warnings).toEqual(
			expect.arrayContaining([
				expect.stringContaining("Active slice 01-stale has had no activity for"),
			]),
		);
	});

	it("validates against statusResultSchema", () => {
		const projectDir = createPopulatedProject();
		const result = buildStatusResult(projectDir);
		const parsed = statusResultSchema.safeParse(result);
		expect(parsed.success).toBe(true);
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

	it("shows active work section with entities", () => {
		const projectDir = createPopulatedProject();
		const status = buildStatusResult(projectDir);
		const output = formatStatusHuman(status);

		expect(output).toContain("Active Work");
		expect(output).toContain("my-epic");
		expect(output).toContain("01-auth");
	});

	it("shows progress section", () => {
		const projectDir = createPopulatedProject();
		const status = buildStatusResult(projectDir);
		const output = formatStatusHuman(status);

		expect(output).toContain("Progress");
		expect(output).toContain("1/3 complete");
	});

	it("shows artifacts section", () => {
		const projectDir = createPopulatedProject();
		const status = buildStatusResult(projectDir);
		const output = formatStatusHuman(status);

		expect(output).toContain("Artifacts");
		expect(output).toContain("Architecture: 2 files");
		expect(output).toContain("Decisions:    2");
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

	it("omits artifacts section when all zeros", () => {
		const status = buildStatusResult(createProject("empty-artifacts"));
		const output = formatStatusHuman(status);

		expect(output).not.toContain("Artifacts");
	});

	it("omits progress section when no slices", () => {
		const status = buildStatusResult(createProject("no-slices"));
		const output = formatStatusHuman(status);

		expect(output).not.toContain("Progress");
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

describe("--query on new StatusResult shape", () => {
	it("queries artifacts.decisions", () => {
		const projectDir = createPopulatedProject();
		const status = buildStatusResult(projectDir);
		const result = applyQuery(status, ".artifacts.decisions");
		expect(result).toBe(2);
	});

	it("queries activeEpic.name", () => {
		const projectDir = createPopulatedProject();
		const status = buildStatusResult(projectDir);
		const result = applyQuery(status, ".activeEpic.name");
		expect(result).toBe("my-epic");
	});

	it("queries completedSlices", () => {
		const projectDir = createPopulatedProject();
		const status = buildStatusResult(projectDir);
		const result = applyQuery(status, ".artifacts.completedSlices");
		expect(result).toBe(1);
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

	it("--query without --json succeeds (--query implies --json)", async () => {
		createProject("no-json-query");

		const chunks: string[] = [];
		const origWrite = process.stdout.write;
		process.stdout.write = ((chunk: string) => {
			chunks.push(chunk);
			return true;
		}) as typeof process.stdout.write;

		try {
			await runStatus({ query: ".project.name" });
		} finally {
			process.stdout.write = origWrite;
		}

		const outputStr = chunks.join("").trim();
		expect(JSON.parse(outputStr)).toBe("no-json-query");
	});

	it("--json output includes artifacts with populated project", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runStatus({ json: true });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.artifacts.decisions).toBe(2);
		expect(parsed.activeEpic.name).toBe("my-epic");
	});
});
