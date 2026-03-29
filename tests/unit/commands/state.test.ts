import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serializeStateTree } from "../../../src/core/data/serialize.js";
import type { ProjectState } from "../../../src/core/tree.js";
import { applyQuery } from "../../../src/util/query.js";
import { deterministicStringify } from "../../../src/util/json.js";

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-state-test-"));
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

const NOW = "2026-03-22T00:00:00.000Z";

/** Helper: create a minimal .goodplan/ with project.json and test data */
function createProject(name: string) {
	const projectDir = path.join(tmpDir, ".goodplan");
	fs.mkdirSync(projectDir, { recursive: true });
	const project = {
		version: "1.0.0",
		name,
		activeEpic: null,
		activeSlice: null,
		activeQuest: null,
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

/** Create a populated project with activity log entries for pagination testing */
function createPopulatedProject() {
	const projectDir = createProject("state-test");

	// Slices overview (needed for schema validation)
	writeJson(projectDir, "slices/overview.json", { items: [] });
	writeJson(projectDir, "quests/overview.json", { items: [] });
	writeJson(projectDir, "epics/overview.json", { items: [] });

	// Decisions
	writeJsonl(projectDir, "decisions.jsonl", [
		{ id: "d1", status: "active", domain: "architecture", title: "T1", summary: "S1", date: "2026-03-20", supersededBy: null },
	]);

	// Learnings
	writeJsonl(projectDir, "learnings.jsonl", [
		{ category: "worked", summary: "Zod is great", file: "learnings/zod-is-great.md", tags: ["zod"], source: "slices/01-auth", rollup: true, rollupTo: ["project"] },
	]);

	// Activity log with 5+ entries for pagination testing
	const activityEntries = [];
	for (let i = 0; i < 7; i++) {
		activityEntries.push({
			ts: `2026-03-2${i}T00:00:00.000Z`,
			phase: "begin-plan",
			scope: "slices/test",
			status: "complete",
			summary: `Entry ${i}`,
		});
	}
	writeJsonl(projectDir, "activity-log.jsonl", activityEntries);

	// Markdown file
	writeMarkdown(projectDir, "idea.md", "# Project Idea\n\nTest project.");

	// Architecture markdown
	writeMarkdown(projectDir, "architecture/_overview.md", "# Architecture Overview\n\nTest.");

	return projectDir;
}

// ── serializeStateTree tests ─────────────────────────────────

describe("serializeStateTree", () => {
	it("unwraps JsonEntry — returns content directly", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"project.json": {
					type: "json",
					content: { name: "test", version: "1.0.0" },
				},
			},
		};

		const result = serializeStateTree(state, { inline: false });
		expect(result["project.json"]).toEqual({ name: "test", version: "1.0.0" });
	});

	it("unwraps JsonlEntry — returns array directly", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"activity-log.jsonl": {
					type: "jsonl",
					content: [
						{ ts: NOW, phase: "init", scope: "project", status: "complete", summary: "Init" },
					],
				},
			},
		};

		const result = serializeStateTree(state, { inline: false });
		expect(Array.isArray(result["activity-log.jsonl"])).toBe(true);
		expect((result["activity-log.jsonl"] as unknown[]).length).toBe(1);
	});

	it("serializes MarkdownEntry as true when inline is false", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"idea.md": { type: "markdown", content: "# My Idea" },
			},
		};

		const result = serializeStateTree(state, { inline: false });
		expect(result["idea.md"]).toBe(true);
	});

	it("serializes MarkdownEntry as string when inline is true", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"idea.md": { type: "markdown", content: "# My Idea" },
			},
		};

		const result = serializeStateTree(state, { inline: true });
		expect(result["idea.md"]).toBe("# My Idea");
	});

	it("recursively serializes DirectoryEntry", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				architecture: {
					type: "directory",
					contents: {
						"_overview.md": { type: "markdown", content: "# Arch" },
					},
				},
			},
		};

		const result = serializeStateTree(state, { inline: false });
		expect(result["architecture"]).toEqual({ "_overview.md": true });
	});

	it("serializes a complex tree correctly", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"project.json": { type: "json", content: { name: "test" } },
				"activity-log.jsonl": { type: "jsonl", content: [{ ts: NOW }] },
				"idea.md": { type: "markdown", content: "# Idea" },
				slices: {
					type: "directory",
					contents: {
						"overview.json": { type: "json", content: { items: [] } },
					},
				},
			},
		};

		const result = serializeStateTree(state, { inline: false });
		expect(result["project.json"]).toEqual({ name: "test" });
		expect(result["activity-log.jsonl"]).toEqual([{ ts: NOW }]);
		expect(result["idea.md"]).toBe(true);
		expect((result["slices"] as Record<string, unknown>)["overview.json"]).toEqual({ items: [] });
	});
});

// ── state command output tests ───────────────────────────────

describe("state command", () => {
	async function runState(args: {
		json?: boolean;
		query?: string;
		quiet?: boolean;
		verbose?: boolean;
		inline?: string;
		offset?: string;
		limit?: string;
	}) {
		const { stateCommand } = await import("../../../src/commands/global/state.js");
		const def = stateCommand;
		if (def.run) {
			await def.run({
				args: {
					json: args.json ?? false,
					query: args.query ?? "",
					quiet: args.quiet ?? false,
					verbose: args.verbose ?? false,
					inline: args.inline ?? "",
					offset: args.offset ?? "",
					limit: args.limit ?? "",
				},
				rawArgs: [],
				cmd: def,
			});
		}
	}

	it("returns valid JSON with state tree", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runState({ json: true });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed["project.json"]).toBeDefined();
		expect(parsed["project.json"].name).toBe("state-test");
	});

	it("returns JSON even without --json flag (always JSON)", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runState({});

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed["project.json"]).toBeDefined();
	});

	it("--query filters correctly", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runState({ query: '.["project.json"].name' });

		const outputStr = chunks.join("").trim();
		expect(JSON.parse(outputStr)).toBe("state-test");
	});

	it("--offset and --limit paginate arrays", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runState({
			query: '.["activity-log.jsonl"]',
			offset: "2",
			limit: "3",
		});

		const outputStr = chunks.join("").trim();
		const result = JSON.parse(outputStr);
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBe(3);
		expect(result[0].summary).toBe("Entry 2");
	});

	it("--limit alone works", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runState({
			query: '.["activity-log.jsonl"]',
			limit: "3",
		});

		const outputStr = chunks.join("").trim();
		const result = JSON.parse(outputStr);
		expect(result.length).toBe(3);
		expect(result[0].summary).toBe("Entry 0");
	});

	it("invalid query returns error with VALIDATION_INVALID_QUERY", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runState({ query: "broken[" });

		const outputStr = chunks.join("").trim();
		const parsed = JSON.parse(outputStr);
		expect(parsed.error).toBeDefined();
		expect(parsed.error.code).toBe("VALIDATION_INVALID_QUERY");
	});

	it("offset/limit is a no-op without --query", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		// offset/limit without query emits a stderr warning but still returns full state tree
		await runState({ offset: "2", limit: "3" });

		const outputStr = chunks.join("").trim();
		const parsed = JSON.parse(outputStr);
		// Full state tree returned — activity-log should have all 7 entries
		expect(parsed["activity-log.jsonl"].length).toBe(7);
	});

	it("--quiet suppresses output", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runState({ quiet: true });

		expect(chunks.join("")).toBe("");
	});

	it("--inline includes markdown content as strings", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runState({ inline: "true" });

		const outputStr = chunks.join("").trim();
		const parsed = JSON.parse(outputStr);
		expect(typeof parsed["idea.md"]).toBe("string");
		expect(parsed["idea.md"]).toContain("# Project Idea");
	});

	it("without --inline, markdown entries are true", async () => {
		createPopulatedProject();
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runState({});

		const outputStr = chunks.join("").trim();
		const parsed = JSON.parse(outputStr);
		expect(parsed["idea.md"]).toBe(true);
	});
});
