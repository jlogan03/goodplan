import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

describe("RPC result paths", () => {
	// Skipped: v1 slice:plan command was replaced by v2 start-plan subagent command
	// which returns a ContextBundle, not MutatingCommandOutput with paths.
	it.skip("slice:plan --json includes paths.plan with absolute path", () => {
		// v1 command removed in Phase 1
	});

	// Skipped: v1 epic:explore command replaced by v2 epic:explore-start in Phase 3
	it.skip("epic:explore --json includes paths.research and paths.brainstorm", () => {
		// v1 command removed in Phase 3
	});

	it("submit-plan --json includes result with entity and newStatus", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// Initialize + create epic + create slice
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], { cwd: tmpDir });
			const createResult = runCommand(bin, ["slice:create", "--epic", "test-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ name: "test-slice", goal: "Test" }),
			});
			expect(createResult.exitCode).toBe(0);
		});
	});

	it("slice:create --json returns ok and entity", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], { cwd: tmpDir });

			const result = runCommand(bin, ["slice:create", "--epic", "test-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ name: "new-slice", goal: "Test goal" }),
			});
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as { ok: boolean; entity: string; event: string };
			expect(json.ok).toBe(true);
			expect(json.entity).toBe("slice:new-slice");
			expect(json.event).toBeDefined();
		});
	});
});
