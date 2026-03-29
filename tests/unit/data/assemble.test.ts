import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assembleState } from "../../../src/core/data/assemble.js";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type {
	DirectoryEntry,
	JsonEntry,
	JsonlEntry,
	MarkdownEntry,
} from "../../../src/core/data/tree.js";

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

const validProject = JSON.stringify({
	version: "1.0.0",
	name: "test-project",
	activeEpic: null,
	activeSlice: null,
	activeQuest: null,
	created: "2026-01-01T00:00:00.000Z",
	updated: "2026-01-01T00:00:00.000Z",
});

const validActivityEntry = JSON.stringify({
	ts: "2026-01-01T00:00:00.000Z",
	phase: "init",
	scope: "project",
	status: "completed",
	summary: "Project initialized",
});

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(import.meta.dirname ?? ".", "assemble-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Tests ────────────────────────────────────────────────────

describe("assembleState", () => {
	it("returns ZERO_STATE when projectDir is undefined", () => {
		const state = assembleState(undefined);
		expect(state).toEqual(ZERO_STATE);
	});

	it("returns ZERO_STATE when projectDir does not exist", () => {
		const state = assembleState("/nonexistent/path/.goodplan");
		expect(state).toEqual(ZERO_STATE);
	});

	it("returns empty directory for empty .goodplan/", () => {
		const state = assembleState(projectDir());
		expect(state.type).toBe("directory");
		expect(Object.keys(state.contents)).toHaveLength(0);
	});

	it("assembles project.json as JsonEntry", () => {
		writeFixture("project.json", validProject);

		const state = assembleState(projectDir());
		const entry = state.contents["project.json"];
		expect(entry).toBeDefined();
		expect(entry!.type).toBe("json");
		expect((entry as JsonEntry<unknown>).content).toEqual(
			JSON.parse(validProject),
		);
	});

	it("assembles activity-log.jsonl as JsonlEntry", () => {
		writeFixture("activity-log.jsonl", `${validActivityEntry}\n`);

		const state = assembleState(projectDir());
		const entry = state.contents["activity-log.jsonl"];
		expect(entry).toBeDefined();
		expect(entry!.type).toBe("jsonl");
		expect((entry as JsonlEntry<unknown>).content).toHaveLength(1);
	});

	it("assembles .md files as MarkdownEntry", () => {
		writeFixture("readme.md", "# Hello World");

		const state = assembleState(projectDir());
		const entry = state.contents["readme.md"];
		expect(entry).toBeDefined();
		expect(entry!.type).toBe("markdown");
		expect((entry as MarkdownEntry).content).toBe("# Hello World");
	});

	it("assembles nested directories", () => {
		writeFixture("epics/overview.json", JSON.stringify({
			items: [],
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		}));

		const state = assembleState(projectDir());
		const epicsDir = state.contents["epics"];
		expect(epicsDir).toBeDefined();
		expect(epicsDir!.type).toBe("directory");
		const overview = (epicsDir as DirectoryEntry).contents["overview.json"];
		expect(overview).toBeDefined();
		expect(overview!.type).toBe("json");
	});

	it("silently skips unregistered .json files", () => {
		writeFixture("custom-config.json", '{"foo":"bar"}');
		writeFixture("project.json", validProject);

		const state = assembleState(projectDir());
		expect(state.contents["custom-config.json"]).toBeUndefined();
		expect(state.contents["project.json"]).toBeDefined();
	});

	it("silently skips non-JSON/JSONL/MD file types", () => {
		writeFixture("project.json", validProject);
		writeFixture("some-binary.bin", "binary content");
		writeFixture("config.yaml", "key: value");

		const state = assembleState(projectDir());
		expect(state.contents["some-binary.bin"]).toBeUndefined();
		expect(state.contents["config.yaml"]).toBeUndefined();
		expect(state.contents["project.json"]).toBeDefined();
	});

	it("skips .state-cache.json", () => {
		writeFixture(".state-cache.json", '{"cached":true}');
		writeFixture("project.json", validProject);

		const state = assembleState(projectDir());
		expect(state.contents[".state-cache.json"]).toBeUndefined();
		expect(state.contents["project.json"]).toBeDefined();
	});

	it("throws DATA_VALIDATION_ERROR for malformed JSON syntax", () => {
		writeFixture("project.json", "{not valid json");

		try {
			assembleState(projectDir());
			expect.unreachable("should have thrown");
		} catch (err) {
			const e = err as { code: string; detail: Record<string, unknown> };
			expect(e.code).toBe("DATA_VALIDATION_ERROR");
			const errors = e.detail.errors as Array<{ file: string; message: string }>;
			const jsonError = errors.find((e) => e.file === "project.json");
			expect(jsonError).toBeDefined();
			expect(jsonError!.message).toContain("Invalid JSON");
		}
	});

	it("throws GoodplanError with DATA_VALIDATION_ERROR for invalid JSON content", () => {
		writeFixture("project.json", '{"name":""}'); // name must be min(1) but missing fields

		expect(() => assembleState(projectDir())).toThrow(
			expect.objectContaining({
				code: "DATA_VALIDATION_ERROR",
			}),
		);
	});

	it("includes file path in validation error detail", () => {
		writeFixture("project.json", '{"name":""}');

		try {
			assembleState(projectDir());
			expect.unreachable("should have thrown");
		} catch (err) {
			const e = err as { code: string; detail: Record<string, unknown> };
			expect(e.code).toBe("DATA_VALIDATION_ERROR");
			expect(e.detail).toBeDefined();
			const errors = e.detail.errors as Array<{ file: string }>;
			expect(errors.some((err) => err.file === "project.json")).toBe(true);
		}
	});

	it("collects multiple validation errors into single throw", () => {
		writeFixture("project.json", '{"name":""}');
		writeFixture("activity-log.jsonl", '{"bad":"entry"}\n');

		try {
			assembleState(projectDir());
			expect.unreachable("should have thrown");
		} catch (err) {
			const e = err as { code: string; detail: Record<string, unknown> };
			expect(e.code).toBe("DATA_VALIDATION_ERROR");
			const errors = e.detail.errors as Array<{ file: string }>;
			expect(errors.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("includes line number for JSONL validation errors", () => {
		const validLine = validActivityEntry;
		const invalidLine = '{"bad":"entry"}';
		writeFixture("activity-log.jsonl", `${validLine}\n${invalidLine}\n`);

		try {
			assembleState(projectDir());
			expect.unreachable("should have thrown");
		} catch (err) {
			const e = err as { code: string; detail: Record<string, unknown> };
			expect(e.code).toBe("DATA_VALIDATION_ERROR");
			const errors = e.detail.errors as Array<{ file: string; message: string }>;
			const jsonlError = errors.find((e) => e.file === "activity-log.jsonl");
			expect(jsonlError).toBeDefined();
			expect(jsonlError!.message).toContain("line 2");
		}
	});

	it("handles JSONL with invalid JSON on a line", () => {
		writeFixture("activity-log.jsonl", `${validActivityEntry}\nnot-json\n`);

		try {
			assembleState(projectDir());
			expect.unreachable("should have thrown");
		} catch (err) {
			const e = err as { code: string; detail: Record<string, unknown> };
			expect(e.code).toBe("DATA_VALIDATION_ERROR");
			const errors = e.detail.errors as Array<{ file: string; message: string }>;
			const jsonlError = errors.find((e) => e.file === "activity-log.jsonl");
			expect(jsonlError).toBeDefined();
			expect(jsonlError!.message).toContain("line 2");
		}
	});

	it("full fixture tree matches expected structure", () => {
		writeFixture("project.json", validProject);
		writeFixture("activity-log.jsonl", `${validActivityEntry}\n`);
		writeFixture("decisions.jsonl", "");
		writeFixture("learnings.jsonl", "");
		writeFixture("epics/overview.json", JSON.stringify({
			items: [],
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
		}));
		writeFixture("notes.md", "# Notes");

		const state = assembleState(projectDir());

		expect(state.type).toBe("directory");
		expect(state.contents["project.json"]?.type).toBe("json");
		expect(state.contents["activity-log.jsonl"]?.type).toBe("jsonl");
		expect(state.contents["decisions.jsonl"]?.type).toBe("jsonl");
		expect(state.contents["learnings.jsonl"]?.type).toBe("jsonl");
		expect(state.contents["notes.md"]?.type).toBe("markdown");

		const epics = state.contents["epics"] as DirectoryEntry;
		expect(epics.type).toBe("directory");
		expect(epics.contents["overview.json"]?.type).toBe("json");
	});
});
