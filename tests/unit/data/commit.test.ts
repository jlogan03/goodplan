import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assembleState } from "../../../src/core/data/assemble.js";
import { commitState } from "../../../src/core/data/commit.js";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";

// ── Helpers ───────────────────────────────────────────────────

let tmpDir: string;

function projectDir(): string {
	return tmpDir;
}

function readFile(relativePath: string): string {
	return fs.readFileSync(path.join(tmpDir, relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
	return fs.existsSync(path.join(tmpDir, relativePath));
}

const ts = "2026-01-01T00:00:00.000Z";

const projectContent = {
	version: "1.0.0",
	name: "test-project",
	activeEpic: null,
	activeSlice: null,
	activeQuest: null,
	created: ts,
	updated: ts,
};

const activityEntry = {
	ts,
	phase: "init",
	scope: "project",
	status: "completed",
	summary: "Project initialized",
};

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(import.meta.dirname ?? ".", "commit-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Tests ────────────────────────────────────────────────────

describe("commitState", () => {
	it("writes new tree to filesystem", () => {
		const newState: ProjectState = {
			type: "directory",
			contents: {
				"project.json": { type: "json", content: projectContent },
				epics: {
					type: "directory",
					contents: {
						"overview.json": {
							type: "json",
							content: { items: [] },
						},
					},
				},
			},
		};

		commitState(projectDir(), ZERO_STATE, newState);

		expect(fileExists("project.json")).toBe(true);
		expect(fileExists("epics/overview.json")).toBe(true);

		const parsed = JSON.parse(readFile("project.json"));
		expect(parsed.name).toBe("test-project");
	});

	it("produces deterministic JSON key ordering", () => {
		const newState: ProjectState = {
			type: "directory",
			contents: {
				"project.json": {
					type: "json",
					content: projectContent,
				},
			},
		};

		commitState(projectDir(), ZERO_STATE, newState);

		const raw = readFile("project.json");
		const keys = Object.keys(JSON.parse(raw));
		const sorted = [...keys].sort();
		expect(keys).toEqual(sorted);
	});

	it("creates directories for new entries", () => {
		const newState: ProjectState = {
			type: "directory",
			contents: {
				epics: {
					type: "directory",
					contents: {
						"my-epic": {
							type: "directory",
							contents: {},
						},
					},
				},
			},
		};

		commitState(projectDir(), ZERO_STATE, newState);
		expect(fs.statSync(path.join(tmpDir, "epics/my-epic")).isDirectory()).toBe(true);
	});

	it("writes new JSONL files in full", () => {
		const newState: ProjectState = {
			type: "directory",
			contents: {
				"activity-log.jsonl": {
					type: "jsonl",
					content: [activityEntry],
				},
			},
		};

		commitState(projectDir(), ZERO_STATE, newState);

		expect(fileExists("activity-log.jsonl")).toBe(true);
		const raw = readFile("activity-log.jsonl");
		const lines = raw.split("\n").filter((l) => l.trim().length > 0);
		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0]!)).toEqual(expect.objectContaining({ phase: "init" }));
	});

	it("appends only new entries to existing JSONL", () => {
		// First commit: write initial JSONL
		const state1: ProjectState = {
			type: "directory",
			contents: {
				"activity-log.jsonl": {
					type: "jsonl",
					content: [activityEntry],
				},
			},
		};
		commitState(projectDir(), ZERO_STATE, state1);

		const firstWrite = readFile("activity-log.jsonl");

		// Second commit: add a new entry
		const newEntry = {
			ts: "2026-01-02T00:00:00.000Z",
			phase: "plan",
			scope: "project",
			status: "started",
			summary: "Planning started",
		};

		const state2: ProjectState = {
			type: "directory",
			contents: {
				"activity-log.jsonl": {
					type: "jsonl",
					content: [activityEntry, newEntry],
				},
			},
		};

		commitState(projectDir(), state1, state2);

		const raw = readFile("activity-log.jsonl");
		const lines = raw.split("\n").filter((l) => l.trim().length > 0);
		expect(lines).toHaveLength(2);

		// Verify first line is unchanged (same bytes — append-only)
		expect(raw.startsWith(firstWrite.trimEnd())).toBe(true);

		// Verify second entry
		expect(JSON.parse(lines[1]!)).toEqual(expect.objectContaining({ phase: "plan" }));
	});

	it("skips markdown entries (read-only)", () => {
		const newState: ProjectState = {
			type: "directory",
			contents: {
				"readme.md": { type: "markdown", content: "# Hello" },
				"project.json": { type: "json", content: projectContent },
			},
		};

		commitState(projectDir(), ZERO_STATE, newState);

		expect(fileExists("project.json")).toBe(true);
		expect(fileExists("readme.md")).toBe(false);
	});

	it("does not rewrite unchanged JSON", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"project.json": { type: "json", content: projectContent },
			},
		};

		commitState(projectDir(), ZERO_STATE, state);
		const stat1 = fs.statSync(path.join(tmpDir, "project.json"));

		// Small delay to detect mtime change
		const startMs = Date.now();
		while (Date.now() - startMs < 50) {
			// busy wait for mtime resolution
		}

		// Commit same state — should not rewrite
		commitState(projectDir(), state, state);
		const stat2 = fs.statSync(path.join(tmpDir, "project.json"));

		expect(stat2.mtimeMs).toBe(stat1.mtimeMs);
	});

	it("does not rewrite unchanged JSONL", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"activity-log.jsonl": {
					type: "jsonl",
					content: [activityEntry],
				},
			},
		};

		commitState(projectDir(), ZERO_STATE, state);

		// Commit same state — no append
		commitState(projectDir(), state, state);

		const raw = readFile("activity-log.jsonl");
		const lines = raw.split("\n").filter((l) => l.trim().length > 0);
		expect(lines).toHaveLength(1);
	});

	it("throws DATA_VALIDATION_ERROR for invalid JSON content", () => {
		const newState: ProjectState = {
			type: "directory",
			contents: {
				"project.json": {
					type: "json",
					content: { name: "" }, // invalid — missing required fields
				},
			},
		};

		expect(() => commitState(projectDir(), ZERO_STATE, newState)).toThrow(
			expect.objectContaining({ code: "DATA_VALIDATION_ERROR" }),
		);

		// File should not have been written
		expect(fileExists("project.json")).toBe(false);
	});

	it("writes empty JSONL files", () => {
		const newState: ProjectState = {
			type: "directory",
			contents: {
				"decisions.jsonl": { type: "jsonl", content: [] },
			},
		};

		commitState(projectDir(), ZERO_STATE, newState);
		expect(fileExists("decisions.jsonl")).toBe(true);
		expect(readFile("decisions.jsonl")).toBe("");
	});

	it("round-trip assembleState -> commitState produces byte-identical files", () => {
		// Initial commit
		const state1: ProjectState = {
			type: "directory",
			contents: {
				"project.json": { type: "json", content: projectContent },
				"activity-log.jsonl": {
					type: "jsonl",
					content: [activityEntry],
				},
				epics: {
					type: "directory",
					contents: {
						"overview.json": {
							type: "json",
							content: { items: [] },
						},
					},
				},
			},
		};

		commitState(projectDir(), ZERO_STATE, state1);

		// Snapshot file contents after first write
		const projectJsonBefore = readFile("project.json");
		const activityLogBefore = readFile("activity-log.jsonl");
		const overviewBefore = readFile("epics/overview.json");

		// Round-trip: assemble from disk, then commit unchanged state
		const assembled = assembleState(projectDir());
		commitState(projectDir(), assembled, assembled);

		// Files should be byte-identical (no rewrites for unchanged state)
		expect(readFile("project.json")).toBe(projectJsonBefore);
		expect(readFile("activity-log.jsonl")).toBe(activityLogBefore);
		expect(readFile("epics/overview.json")).toBe(overviewBefore);
	});
});
