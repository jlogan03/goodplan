import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withFixture, withTempDir } from "./helpers.js";

describe("error: invalid state transitions", () => {
	it("epic:activate on v1 fixture without events.jsonl returns ENTITY_NOT_FOUND", async () => {
		await withFixture("epic-created", ({ env, bin }) => {
			// v2 epic:activate uses event-sourced state (events.jsonl).
			// The epic-created fixture is v1 (no events.jsonl), so activate fails with ENTITY_NOT_FOUND.
			const activateResult = runCommand(bin, ["epic:activate", "--epic", "test-epic", "--json"], {
				env,
				stdin: "",
			});

			expect(activateResult.exitCode).toBe(1);
			expect(activateResult.json).toBeDefined();
			const json = activateResult.json as { ok: boolean; error: string; code: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("ENTITY_NOT_FOUND");
		});
	});

	it("slice:abandon via v2 event command works on fresh project", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], { cwd: tmpDir });
			runCommand(bin, ["slice:create", "--epic", "test-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ name: "test-slice", goal: "Test" }),
			});

			// Abandon the slice
			const result = runCommand(
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

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
			const json = result.json as { ok: boolean; entity: string };
			expect(json.ok).toBe(true);
			expect(json.entity).toBe("slice:test-slice");
		});
	});

	it("slice:create requires --epic flag", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });

			// Try to create slice without --epic — citty will error on missing required arg
			const result = runCommand(bin, ["slice:create", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ name: "test-slice", goal: "Test" }),
			});

			// Should fail - epic is required
			expect(result.exitCode).not.toBe(0);
		});
	});

	it("slice:abandon requires all flags", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });

			// Try to abandon without required flags
			const result = runCommand(bin, ["slice:abandon", "--json"], {
				cwd: tmpDir,
			});

			// Should fail - slice, epic, and reason are required
			expect(result.exitCode).not.toBe(0);
		});
	});
});
