import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

describe("show --json artifacts", () => {
	it("slice:show --json includes artifacts field", async () => {
		await withFixture("slice-in-progress", ({ env, bin }) => {
			const result = runCommand(bin, ["slice:show", "--slice", "test-slice", "--json"], { env });
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as Record<string, unknown>;
			expect(json.artifacts).toBeDefined();

			const artifacts = json.artifacts as Record<string, unknown>;
			// slice-in-progress has a goal and plan.md
			expect(artifacts.goal).toBe(true);
			expect(artifacts.plan).toBe(true);
			// No implementation, no abandoned, no explore-complete, no plan-refined file
			expect(artifacts.implementation).toBe(false);
			expect(artifacts.abandoned).toBe(false);
			expect(artifacts.exploreComplete).toBe(false);
			// plan-refined.md doesn't exist in the fixture (refinement is in progress)
			expect(artifacts.planRefined).toBe(false);
		});
	});

	it("epic:show --json includes artifacts field", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["epic:show", "--epic", "test-epic", "--json"], { env });
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as Record<string, unknown>;
			expect(json.artifacts).toBeDefined();

			const artifacts = json.artifacts as Record<string, unknown>;
			// epic-activated has a goal, architecture/_overview.md, slices/sequencing.md
			expect(artifacts.goal).toBe(true);
			expect(artifacts.architectureDefined).toBe(true);
			expect(artifacts.slicesDefined).toBe(true);
			// Always false for epics
			expect(artifacts.plan).toBe(false);
			expect(artifacts.planRefined).toBe(false);
			expect(artifacts.implementation).toBe(false);
		});
	});

	it("slice:show without --json omits artifacts", async () => {
		await withFixture("slice-in-progress", ({ env, bin }) => {
			const result = runCommand(bin, ["slice:show", "--slice", "test-slice"], { env });
			expect(result.exitCode).toBe(0);
			// Human-readable output should not contain "artifacts"
			expect(result.stdout).not.toContain("artifacts");
		});
	});

	it("epic:show without --json omits artifacts", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["epic:show", "--epic", "test-epic"], { env });
			expect(result.exitCode).toBe(0);
			expect(result.stdout).not.toContain("artifacts");
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
