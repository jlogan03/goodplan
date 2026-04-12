import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

describe("error: refinement circuit breaker", () => {
	it("submit-refinement at max rounds returns STATE_MAX_ROUNDS_REACHED", async () => {
		await withFixture("slice-refining-max-rounds", ({ env, bin }) => {
			const result = runCommand(bin, ["submit-refinement", "--slice", "test-slice", "--json"], {
				env,
				stdin: JSON.stringify({ scores: { correctness: 5, completeness: 5 } }),
			});

			expect(result.exitCode).toBe(3);
			expect(result.json).toBeDefined();
			const json = result.json as { error: { code: string; message: string } };
			expect(json.error).toBeDefined();
			expect(json.error.code).toBe("STATE_MAX_ROUNDS_REACHED");
			expect(json.error.message).toContain("Maximum refinement rounds");
		});
	});

	it("submit-refinement with --override bypasses max rounds", async () => {
		await withFixture("slice-refining-max-rounds", ({ env, bin }) => {
			const result = runCommand(
				bin,
				["submit-refinement", "--slice", "test-slice", "--override", "--json"],
				{
					env,
					stdin: JSON.stringify({ scores: { correctness: 5, completeness: 5 } }),
				},
			);

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
			const json = result.json as Record<string, unknown>;
			expect(json.newStatus).toBe("plan-refined");
		});
	});

	it("submit-refinement with passing scores bypasses circuit breaker naturally", async () => {
		await withFixture("slice-refining-max-rounds", ({ env, bin }) => {
			const result = runCommand(bin, ["submit-refinement", "--slice", "test-slice", "--json"], {
				env,
				stdin: JSON.stringify({ scores: { correctness: 9, completeness: 9 } }),
			});

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
			const json = result.json as Record<string, unknown>;
			expect(json.newStatus).toBe("plan-refined");
		});
	});
});
