import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withFixture, withTempDir } from "./helpers.js";

describe("show --json artifacts", () => {
	it("slice:show --json returns slice data via v1 fallback", async () => {
		await withFixture("slice-in-progress", ({ env, bin }) => {
			const result = runCommand(
				bin,
				["slice:show", "--epic", "test-epic", "--slice", "test-slice", "--json"],
				{ env },
			);
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			// v1 fallback returns the raw slice.json contents
			const json = result.json as Record<string, unknown>;
			expect(json.name).toBe("test-slice");
			expect(json.status).toBe("plan-refined");
			expect(json.goal).toBe("Test slice goal");
		});
	});

	it("epic:show --json returns epic state (v2)", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// Initialize and create epic
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], { cwd: tmpDir });

			const result = runCommand(bin, ["epic:show", "--epic", "test-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as { ok: boolean; dir: string; phase: string };
			expect(json.ok).toBe(true);
			expect(json.dir).toBe("test-epic");
			expect(json.phase).toBe("P0");
		});
	});

	it("slice:show without --json shows human-readable output", async () => {
		await withFixture("slice-in-progress", ({ env, bin }) => {
			const result = runCommand(
				bin,
				["slice:show", "--epic", "test-epic", "--slice", "test-slice"],
				{ env },
			);
			expect(result.exitCode).toBe(0);
			// Human-readable output should contain slice name
			expect(result.stdout).toContain("test-slice");
		});
	});

	it("epic:show without --json shows human output (v2)", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], { cwd: tmpDir });

			const result = runCommand(bin, ["epic:show", "--epic", "test-epic"], { cwd: tmpDir });
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("test-epic");
		});
	});

	it("quest:show --json includes artifacts field", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			// Create a quest first (no quest fixture exists standalone)
			const createResult = runCommand(bin, ["quest:create", "--json"], {
				env,
				stdin: JSON.stringify({ name: "test-quest", goal: "Test quest goal" }),
			});
			expect(createResult.exitCode).toBe(0);

			const result = runCommand(bin, ["quest:show", "--quest", "test-quest", "--json"], { env });
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as Record<string, unknown>;
			expect(json.artifacts).toBeDefined();

			const artifacts = json.artifacts as Record<string, unknown>;
			// Freshly created quest has a goal but no other artifacts
			expect(artifacts.goal).toBe(true);
			expect(artifacts.plan).toBe(false);
			expect(artifacts.planRefined).toBe(false);
			expect(artifacts.implementation).toBe(false);
			expect(artifacts.abandoned).toBe(false);
			expect(artifacts.exploreComplete).toBe(false);
		});
	});
});
