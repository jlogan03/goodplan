import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assembleState } from "../../../src/core/data/assemble.js";
import { commitState } from "../../../src/core/data/commit.js";
import { loadState } from "../../../src/core/data/load.js";
import type { StateCache } from "../../../src/core/data/load.js";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { GoodplanError } from "../../../src/util/errors.js";

// ── Helpers ───────────────────────────────────────────────────

let tmpDir: string;

function projectDir(): string {
	return tmpDir;
}

function writeFixture(relativePath: string, content: string): void {
	const absPath = path.join(tmpDir, relativePath);
	fs.mkdirSync(path.dirname(absPath), { recursive: true });
	fs.writeFileSync(absPath, content, "utf-8");
}

function readFile(relativePath: string): string {
	return fs.readFileSync(path.join(tmpDir, relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
	return fs.existsSync(path.join(tmpDir, relativePath));
}

const ts = "2026-01-01T00:00:00.000Z";

const validProject = JSON.stringify({
	version: "1.0.0",
	name: "test-project",
	activeEpic: null,
	activeSlice: null,
	activeQuest: null,
	created: ts,
	updated: ts,
});

const projectContent = JSON.parse(validProject);

const activityEntry = {
	ts,
	phase: "init",
	scope: "project",
	status: "completed",
	summary: "Project initialized",
};

const validActivityEntry = JSON.stringify(activityEntry);

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(import.meta.dirname ?? ".", "load-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Tests ────────────────────────────────────────────────────

describe("loadState", () => {
	it("returns ZERO_STATE when projectDir is undefined", () => {
		const state = loadState(undefined);
		expect(state).toEqual(ZERO_STATE);
	});

	it("returns ZERO_STATE when projectDir does not exist", () => {
		const state = loadState("/nonexistent/path/.goodplan");
		expect(state).toEqual(ZERO_STATE);
	});

	it("falls back to assembleState on cache miss", () => {
		writeFixture("project.json", validProject);

		const state = loadState(projectDir());
		const assembled = assembleState(projectDir());

		expect(state).toEqual(assembled);
	});

	it("returns cached state when directory mtimes are unchanged", () => {
		// Set up a project and commit to produce a cache
		writeFixture("project.json", validProject);
		const oldState = assembleState(projectDir());
		const newState: ProjectState = {
			type: "directory",
			contents: {
				...oldState.contents,
				"activity-log.jsonl": {
					type: "jsonl",
					content: [activityEntry],
				},
			},
		};

		commitState(projectDir(), oldState, newState);
		expect(fileExists(".state-cache.json")).toBe(true);

		// loadState should return cached state.
		// The cached state includes stateSignature in project.json (injected by
		// commitState's embedStateSignature), so compare against assembleState
		// which also reads the signed project.json from disk.
		const loaded = loadState(projectDir());
		const expected = assembleState(projectDir());
		expect(loaded).toEqual(expected);
	});

	it("falls back to assembleState on stale cache version", () => {
		writeFixture("project.json", validProject);

		// Write a cache with wrong version
		const cache: StateCache = {
			version: 999,
			writtenAt: new Date().toISOString(),
			dirMtimes: {},
			state: ZERO_STATE,
		};
		writeFixture(".state-cache.json", JSON.stringify(cache));

		const state = loadState(projectDir());
		const assembled = assembleState(projectDir());

		// Should fall back to assembleState and get the real project.json
		expect(state).toEqual(assembled);
		expect(state.contents["project.json"]).toBeDefined();
	});

	it("falls back gracefully on corrupt cache", () => {
		writeFixture("project.json", validProject);
		writeFixture(".state-cache.json", "not valid json at all {{{");

		const state = loadState(projectDir());
		const assembled = assembleState(projectDir());

		expect(state).toEqual(assembled);
	});

	it("detects new LLM-written file and fully reads it", () => {
		// Create initial state and commit (produces cache)
		writeFixture("project.json", validProject);
		const initialState = assembleState(projectDir());
		commitState(projectDir(), ZERO_STATE, initialState);

		expect(fileExists(".state-cache.json")).toBe(true);

		// Simulate LLM writing a new markdown file
		writeFixture("notes.md", "# New Notes\nSome content here.");

		// Force directory mtime to be in the future so cache detects the change
		const futureTime = Date.now() + 5000;
		fs.utimesSync(tmpDir, futureTime / 1000, futureTime / 1000);

		// loadState should detect the changed directory mtime and pick up the new file
		const state = loadState(projectDir());
		expect(state.contents["notes.md"]).toBeDefined();
		expect(state.contents["notes.md"]!.type).toBe("markdown");
	});

	it("detects removed file and updates tree", () => {
		// Create initial state with two files
		writeFixture("project.json", validProject);
		writeFixture("notes.md", "# Notes");
		const initialState = assembleState(projectDir());
		commitState(projectDir(), ZERO_STATE, initialState);

		// Remove the markdown file
		fs.unlinkSync(path.join(tmpDir, "notes.md"));

		// Force directory mtime to be in the future so cache detects the change
		const futureTime = Date.now() + 5000;
		fs.utimesSync(tmpDir, futureTime / 1000, futureTime / 1000);

		const state = loadState(projectDir());
		expect(state.contents["notes.md"]).toBeUndefined();
		expect(state.contents["project.json"]).toBeDefined();
	});

	it("cache is written by commitState", () => {
		const newState: ProjectState = {
			type: "directory",
			contents: {
				"project.json": { type: "json", content: projectContent },
			},
		};

		commitState(projectDir(), ZERO_STATE, newState);

		expect(fileExists(".state-cache.json")).toBe(true);

		const cacheRaw = readFile(".state-cache.json");
		const cache = JSON.parse(cacheRaw) as StateCache;
		expect(cache.version).toBe(1);
		expect(cache.writtenAt).toBeDefined();
		expect(cache.dirMtimes).toBeDefined();
		expect(cache.state).toBeDefined();
	});

	it("cache is not included in assembled state", () => {
		const newState: ProjectState = {
			type: "directory",
			contents: {
				"project.json": { type: "json", content: projectContent },
			},
		};

		commitState(projectDir(), ZERO_STATE, newState);
		expect(fileExists(".state-cache.json")).toBe(true);

		// assembleState should skip the cache file
		const assembled = assembleState(projectDir());
		expect(assembled.contents[".state-cache.json"]).toBeUndefined();
	});

	// ── HMAC verification tests ─────────────────────────────────

	it("loads state with valid signature successfully", () => {
		// commitState embeds a valid signature
		writeFixture("project.json", validProject);
		const oldState = assembleState(projectDir());
		commitState(projectDir(), ZERO_STATE, oldState);

		// Delete cache to force assembleState fallback path (which verifies HMAC)
		fs.unlinkSync(path.join(tmpDir, ".state-cache.json"));

		const state = loadState(projectDir());
		expect(state.contents["project.json"]).toBeDefined();
	});

	it("throws DATA_INTEGRITY_CHECK_FAILED on tampered state", () => {
		// Set up a project with a valid signature
		writeFixture("project.json", validProject);
		const oldState = assembleState(projectDir());
		commitState(projectDir(), ZERO_STATE, oldState);

		// Read the project.json, tamper with the name, but keep the old signature
		const projectPath = path.join(tmpDir, "project.json");
		const projectData = JSON.parse(fs.readFileSync(projectPath, "utf-8"));
		projectData.name = "tampered";
		fs.writeFileSync(projectPath, JSON.stringify(projectData), "utf-8");

		// Delete cache to force assembleState fallback path
		fs.unlinkSync(path.join(tmpDir, ".state-cache.json"));

		try {
			loadState(projectDir());
			expect.unreachable("loadState should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(GoodplanError);
			const gpErr = err as GoodplanError;
			expect(gpErr.code).toBe("DATA_INTEGRITY_CHECK_FAILED");
			expect(gpErr.message).toContain("gp verify --fix");
		}
	});

	it("loads state with missing signature (bootstrap) without error", () => {
		// Write a project.json without stateSignature (pre-HMAC repo)
		writeFixture("project.json", validProject);

		// No cache, no signature — should load fine (bootstrap exception)
		const state = loadState(projectDir());
		expect(state.contents["project.json"]).toBeDefined();
	});
});
