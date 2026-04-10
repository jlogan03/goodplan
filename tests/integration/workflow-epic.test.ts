import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand, withFixture, withTempDir } from "./helpers.js";
import { buildBinary } from "./helpers.js";

describe("workflow: epic lifecycle", () => {
	it("epic:create from fresh-init creates epic directory and events", async () => {
		await withFixture("fresh-init", ({ env, bin }) => {
			const result = runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], {
				env,
				stdin: "",
			});

			expect(result.exitCode, `create failed: ${result.stderr}`).toBe(0);
			expect(result.json).toBeDefined();
			const json = result.json as { ok: boolean; entity: string; event: string };
			expect(json.ok).toBe(true);
			expect(json.entity).toBe("epic:test-epic");

			// Verify epic directory and events.jsonl exist (v2 stores events, not epic.json)
			const epicDir = path.join(env.GOODPLAN_DIR, "epics", "test-epic");
			expect(fs.existsSync(epicDir)).toBe(true);
			expect(fs.existsSync(path.join(epicDir, "events.jsonl"))).toBe(true);
		});
	});

	it("epic:list returns epic data from temp project", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// Initialize project and create epic
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], { cwd: tmpDir });

			const result = runCommand(bin, ["epic:list", "--json"], { cwd: tmpDir });

			expect(result.exitCode, `list failed: ${result.stderr}`).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as { items: unknown[]; total: number };
			expect(json.total).toBe(1);
		});
	});

	it("epic:show returns epic details from temp project", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// Initialize project and create epic
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], { cwd: tmpDir });

			const result = runCommand(bin, ["epic:show", "--epic", "test-epic", "--json"], {
				cwd: tmpDir,
			});

			expect(result.exitCode, `show failed: ${result.stderr}`).toBe(0);
			expect(result.json).toBeDefined();
		});
	});
});
