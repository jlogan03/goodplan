import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withFixture } from "./helpers.js";

/**
 * Create a temp .project/ with a specific version in project.json.
 * Returns env object with GOODPLAN_DIR set.
 */
function createProjectWithVersion(tmpDir: string, version: string): Record<string, string> {
	const projectDir = path.join(tmpDir, ".project");
	fs.mkdirSync(projectDir, { recursive: true });

	const project = {
		activeEpic: null,
		activeQuest: null,
		activeSlice: null,
		created: "2026-01-01T00:00:00.000Z",
		name: "test-project",
		updated: "2026-01-01T00:00:00.000Z",
		version,
	};

	fs.writeFileSync(path.join(projectDir, "project.json"), JSON.stringify(project, null, "\t"));

	// Minimal overviews needed for status command
	const emptyOverview = JSON.stringify({ items: [] });
	fs.mkdirSync(path.join(projectDir, "epics"), { recursive: true });
	fs.mkdirSync(path.join(projectDir, "slices"), { recursive: true });
	fs.mkdirSync(path.join(projectDir, "quests"), { recursive: true });
	fs.writeFileSync(path.join(projectDir, "epics", "overview.json"), emptyOverview);
	fs.writeFileSync(path.join(projectDir, "slices", "overview.json"), emptyOverview);
	fs.writeFileSync(path.join(projectDir, "quests", "overview.json"), emptyOverview);

	// Empty JSONL files
	fs.writeFileSync(path.join(projectDir, "activity-log.jsonl"), "");
	fs.writeFileSync(path.join(projectDir, "decisions.jsonl"), "");
	fs.writeFileSync(path.join(projectDir, "learnings.jsonl"), "");

	return { GOODPLAN_DIR: projectDir };
}

describe("version compatibility checking", () => {
	it("no warning when versions match (compatible)", async () => {
		// Use CLI version 1.0.0 (bumped in this slice), data also at 1.0.0
		await withFixture("fresh-init", ({ bin, env }) => {
			const result = runCommand(bin, ["status", "--json"], { env });
			expect(result.exitCode).toBe(0);
			expect(result.stderr).toBe("");
		});
	});

	it("warns on stderr for cli-minor-behind (same major, data minor > CLI minor)", () => {
		const bin = buildBinary();
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-compat-minor-"));

		try {
			// Data version ahead of CLI (1.99.0 > 1.0.0)
			const env = createProjectWithVersion(tmpDir, "1.99.0");
			// Use human mode (no --json) so warnings are not suppressed
			const result = runCommand(bin, ["status"], { env });

			// Command should still execute
			expect(result.exitCode).toBe(0);
			// Warning on stderr
			expect(result.stderr).toContain("warning:");
			expect(result.stderr).toContain("Version mismatch");
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("warns on stderr for major-ahead (CLI major > data major)", () => {
		const bin = buildBinary();
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-compat-major-ahead-"));

		try {
			// Data at version 0.1.0, CLI at 1.0.0
			const env = createProjectWithVersion(tmpDir, "0.1.0");
			// Use human mode (no --json) so warnings are not suppressed
			const result = runCommand(bin, ["status"], { env });

			expect(result.exitCode).toBe(0);
			expect(result.stderr).toContain("warning:");
			expect(result.stderr).toContain("Version mismatch");
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("exits with VALIDATION_VERSION_MAJOR_MISMATCH for major-behind", () => {
		const bin = buildBinary();
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-compat-major-behind-"));

		try {
			// Data at version 2.0.0, CLI at 1.0.0 — major behind
			const env = createProjectWithVersion(tmpDir, "2.0.0");
			const result = runCommand(bin, ["status", "--json"], { env });

			// Exit code 2 (VALIDATION_* prefix)
			expect(result.exitCode).toBe(2);

			// JSON error output
			const parsed = JSON.parse(result.stdout);
			expect(parsed.error.code).toBe("VALIDATION_VERSION_MAJOR_MISMATCH");
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("suppresses warning in --json mode for cli-minor-behind", () => {
		const bin = buildBinary();
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-compat-json-suppress-"));

		try {
			const env = createProjectWithVersion(tmpDir, "1.99.0");
			const result = runCommand(bin, ["status", "--json"], { env });

			// --json suppresses stderr warnings
			expect(result.exitCode).toBe(0);
			expect(result.stderr).toBe("");
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("suppresses warning in --quiet mode for cli-minor-behind", () => {
		const bin = buildBinary();
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-compat-quiet-suppress-"));

		try {
			const env = createProjectWithVersion(tmpDir, "1.99.0");
			const result = runCommand(bin, ["status", "--quiet"], { env });

			expect(result.exitCode).toBe(0);
			expect(result.stderr).toBe("");
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("--version works without a project (no compat check)", () => {
		const bin = buildBinary();
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-compat-no-project-"));

		try {
			// GOODPLAN_DIR points to a non-existent directory
			const env = { GOODPLAN_DIR: path.join(tmpDir, "nonexistent") };
			const result = runCommand(bin, ["--version", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = JSON.parse(result.stdout);
			expect(data.version).toBe("1.0.0");
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});
