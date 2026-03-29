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
			expect(fs.existsSync(path.join(projectDir, "project.json"))).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "activity-log.jsonl"))).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "epics", "overview.json"))).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "quests", "overview.json"))).toBe(true);
		});
	});

	it("returns JSON output with project name and version", async () => {
		await withTempDir((tmpDir, env) => {
			const result = runCommand(bin, ["init", "--json"], {
				cwd: tmpDir,
				env,
				stdin: "",
			});

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
			const json = result.json as Record<string, unknown>;
			expect(json.name).toBeDefined();
			expect(json.version).toBeDefined();
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

			const projectJsonPath = path.join(tmpDir, ".goodplan", "project.json");
			const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, "utf-8")) as Record<string, unknown>;
			expect(projectJson.name).toBe("my-custom-project");
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
