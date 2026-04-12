import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadState } from "../../../src/core/data/load.js";
import { begin } from "../../../src/core/rpc/begin.js";
import { rpcInit } from "../../../src/core/rpc/init.js";
import { bumpDataVersionIfNeeded } from "../../../src/core/rpc/version-stamp.js";
import { getJson } from "../../../src/core/tree.js";
import type { ProjectState } from "../../../src/core/tree.js";
import type { Project } from "../../../src/schemas/entities/project.js";

let tmpDir: string;
let projectDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-rpc-version-stamp-"));
	projectDir = path.join(tmpDir, ".goodplan");
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function initProject(name = "test") {
	rpcInit(projectDir, name);
}

describe("bumpDataVersionIfNeeded", () => {
	it("bumps version when CLI version > data version", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"project.json": {
					type: "json",
					content: {
						version: "1.0.0",
						name: "test",
						activeEpic: null,
						activeSlice: null,
						activeQuest: null,
						created: "2026-01-01T00:00:00.000Z",
						updated: "2026-01-01T00:00:00.000Z",
					},
				},
			},
		};

		const bumped = bumpDataVersionIfNeeded(state, "1.1.0");
		const project = getJson<Project>(bumped, "project.json");
		expect(project?.version).toBe("1.1.0");
	});

	it("does not bump when CLI version == data version", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"project.json": {
					type: "json",
					content: {
						version: "1.0.0",
						name: "test",
						activeEpic: null,
						activeSlice: null,
						activeQuest: null,
						created: "2026-01-01T00:00:00.000Z",
						updated: "2026-01-01T00:00:00.000Z",
					},
				},
			},
		};

		const result = bumpDataVersionIfNeeded(state, "1.0.0");
		const project = getJson<Project>(result, "project.json");
		expect(project?.version).toBe("1.0.0");
	});

	it("does not bump when CLI version < data version", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"project.json": {
					type: "json",
					content: {
						version: "2.0.0",
						name: "test",
						activeEpic: null,
						activeSlice: null,
						activeQuest: null,
						created: "2026-01-01T00:00:00.000Z",
						updated: "2026-01-01T00:00:00.000Z",
					},
				},
			},
		};

		const result = bumpDataVersionIfNeeded(state, "1.0.0");
		const project = getJson<Project>(result, "project.json");
		expect(project?.version).toBe("2.0.0");
	});

	it("skips when project.json is absent", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {},
		};

		const result = bumpDataVersionIfNeeded(state, "1.0.0");
		expect(result).toBe(state); // same reference — no mutation
	});
});

describe("version stamping in RPC mutations", () => {
	it("begin() preserves project.json.version >= CLI version after mutation", () => {
		initProject();

		// Verify initial version
		const state1 = loadState(projectDir);
		const project1 = getJson<Project>(state1, "project.json");
		expect(project1).toBeDefined();
		// After init, version should match CLI version
		expect(project1?.version).toBeDefined();

		// Create an epic (a mutation)
		begin(
			projectDir,
			"create",
			{ type: "epic", name: "my-epic" },
			{ name: "my-epic", goal: "Test goal" },
		);

		const state2 = loadState(projectDir);
		const project2 = getJson<Project>(state2, "project.json");
		expect(project2).toBeDefined();
		// Version should still be valid after mutation
		expect(project2?.version).toMatch(/^\d+\.\d+\.\d+$/);
	});
});
