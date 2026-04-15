import * as fs from "node:fs";
import * as path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

let bin: string;

beforeAll(() => {
	bin = buildBinary();
});

describe("workflow: init", () => {
	it("creates .goodplan/ with expected structure and exits 0", async () => {
		await withTempDir((tmpDir, env) => {
			const result = runCommand(bin, ["init", "--json"], {
				cwd: tmpDir,
				env,
				stdin: "",
			});

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const projectDir = path.join(tmpDir, ".goodplan");
			expect(fs.existsSync(projectDir)).toBe(true);
			// v2: init creates events.jsonl with project-initialized event
			expect(fs.existsSync(path.join(projectDir, "events.jsonl"))).toBe(true);
		});
	});

	it("returns JSON output with ok, event, and entity", async () => {
		await withTempDir((tmpDir, env) => {
			const result = runCommand(bin, ["init", "--json"], {
				cwd: tmpDir,
				env,
				stdin: "",
			});

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
			const json = result.json as { ok: boolean; event: string; entity: string };
			expect(json.ok).toBe(true);
			expect(json.event).toBeTruthy();
			expect(json.entity).toBe("project");
		});
	});

	it("uses --name flag for project name", async () => {
		await withTempDir((tmpDir, env) => {
			const result = runCommand(bin, ["init", "--name", "my-custom-project", "--json"], {
				cwd: tmpDir,
				env,
				stdin: "",
			});

			expect(result.exitCode).toBe(0);

			// v2: verify name via status command (reads from event log)
			const statusResult = runCommand(bin, ["status", "--json"], { cwd: tmpDir, env });
			expect(statusResult.exitCode).toBe(0);
			const status = statusResult.json as { project: { name: string } };
			expect(status.project.name).toBe("my-custom-project");
		});
	});

	it("returns STATE_ALREADY_INITIALIZED if .goodplan/ already exists", async () => {
		await withTempDir((tmpDir, env) => {
			// First init
			runCommand(bin, ["init", "--json"], {
				cwd: tmpDir,
				env,
				stdin: "",
			});

			// Second init should fail
			const result = runCommand(bin, ["init", "--json"], {
				cwd: tmpDir,
				env,
				stdin: "",
			});

			expect(result.exitCode).toBe(3);
			expect(result.json).toBeDefined();
			const json = result.json as { error: { code: string } };
			expect(json.error.code).toBe("STATE_ALREADY_INITIALIZED");
		});
	});
});
