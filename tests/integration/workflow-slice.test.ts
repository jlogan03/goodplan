import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

describe("workflow: slice lifecycle (v2)", () => {
	it("slice:create, list, show, abandon lifecycle via binary", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// Initialize project
			const initResult = runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });
			expect(initResult.exitCode).toBe(0);

			// Create epic
			const createEpicResult = runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(createEpicResult.exitCode).toBe(0);

			// Verify events.jsonl created for epic
			const eventsPath = path.join(tmpDir, ".goodplan", "epics", "test-epic", "events.jsonl");
			expect(fs.existsSync(eventsPath)).toBe(true);

			// Create slice
			const createResult = runCommand(bin, ["slice:create", "--epic", "test-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ name: "test-slice", goal: "Test goal" }),
			});
			expect(createResult.exitCode).toBe(0);
			const createJson = createResult.json as { ok: boolean; entity: string };
			expect(createJson.ok).toBe(true);
			expect(createJson.entity).toBe("slice:test-slice");

			// Verify slice directory was created
			const sliceDir = path.join(tmpDir, ".goodplan", "epics", "test-epic", "slices", "test-slice");
			expect(fs.existsSync(sliceDir)).toBe(true);

			// List slices
			const listResult = runCommand(bin, ["slice:list", "--epic", "test-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(listResult.exitCode).toBe(0);
			const listJson = listResult.json as { items: Array<{ dir: string }>; total: number };
			expect(listJson.items).toHaveLength(1);
			expect(listJson.total).toBe(1);

			// Show slice
			const showResult = runCommand(
				bin,
				["slice:show", "--epic", "test-epic", "--slice", "test-slice", "--json"],
				{ cwd: tmpDir },
			);
			expect(showResult.exitCode).toBe(0);
			const showJson = showResult.json as { ok: boolean; dir: string };
			expect(showJson.ok).toBe(true);
			expect(showJson.dir).toBe("test-slice");

			// Abandon slice
			const abandonResult = runCommand(
				bin,
				[
					"slice:abandon",
					"--epic",
					"test-epic",
					"--slice",
					"test-slice",
					"--reason",
					"No longer needed",
					"--json",
				],
				{ cwd: tmpDir },
			);
			expect(abandonResult.exitCode).toBe(0);
			const abandonJson = abandonResult.json as { ok: boolean; entity: string };
			expect(abandonJson.ok).toBe(true);
			expect(abandonJson.entity).toBe("slice:test-slice");

			// Show abandoned slice
			const showAbandoned = runCommand(
				bin,
				["slice:show", "--epic", "test-epic", "--slice", "test-slice", "--json"],
				{ cwd: tmpDir },
			);
			expect(showAbandoned.exitCode).toBe(0);
			const showAbandonedJson = showAbandoned.json as { ok: boolean; abandoned: boolean };
			expect(showAbandonedJson.ok).toBe(true);
			expect(showAbandonedJson.abandoned).toBe(true);
		});
	});

	it("slice:list --all returns slices across all epics", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "epic-a", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "epic-b", "--json"], { cwd: tmpDir });

			runCommand(bin, ["slice:create", "--epic", "epic-a", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ name: "slice-1", goal: "Goal 1" }),
			});
			runCommand(bin, ["slice:create", "--epic", "epic-b", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ name: "slice-2", goal: "Goal 2" }),
			});

			const result = runCommand(bin, ["slice:list", "--all", "--json"], { cwd: tmpDir });
			expect(result.exitCode).toBe(0);
			const json = result.json as { items: Array<{ dir: string; epic: string }>; total: number };
			expect(json.total).toBe(2);
			expect(json.items).toHaveLength(2);
		});
	});
});
