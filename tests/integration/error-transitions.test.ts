import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

describe("error: invalid state transitions", () => {
	it("slice:plan on unknown slice returns STATE_INVALID_TRANSITION", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(
				bin,
				["slice:plan", "--slice", "nonexistent-slice", "--json"],
				{ env, stdin: "" },
			);

			expect(result.exitCode).toBe(3);
			expect(result.json).toBeDefined();
			const json = result.json as { error: { code: string; message: string } };
			expect(json.error).toBeDefined();
			expect(json.error.code).toBe("STATE_INVALID_TRANSITION");
			expect(json.error.message).toBeDefined();
		});
	});

	it("epic:activate without verification criteria returns STATE_MISSING_VERIFICATIONS", async () => {
		await withFixture("epic-created", ({ env, bin }) => {
			// Advance epic to slices-refined using skip paths
			const r1 = runCommand(bin, ["submit-explore", "--epic", "test-epic", "--json"], { env, stdin: "" });
			expect(r1.exitCode, `submit-explore failed: ${r1.stderr}`).toBe(0);

			const r2 = runCommand(bin, ["submit-architecture", "--epic", "test-epic", "--json"], { env, stdin: "" });
			expect(r2.exitCode, `submit-architecture failed: ${r2.stderr}`).toBe(0);

			const r3 = runCommand(bin, ["submit-refine-architecture", "--epic", "test-epic", "--json"], {
				env,
				stdin: JSON.stringify({ scores: { correctness: 9, completeness: 9 } }),
			});
			expect(r3.exitCode, `submit-refine-architecture failed: ${r3.stderr}`).toBe(0);

			const r4 = runCommand(bin, ["epic:define-slices", "--epic", "test-epic", "--json"], { env, stdin: "" });
			expect(r4.exitCode, `define-slices failed: ${r4.stderr}`).toBe(0);

			const r5 = runCommand(bin, ["submit-slices", "--epic", "test-epic", "--json"], { env, stdin: "" });
			expect(r5.exitCode, `submit-slices failed: ${r5.stderr}`).toBe(0);

			const r6 = runCommand(bin, ["submit-refine-slices", "--epic", "test-epic", "--json"], {
				env,
				stdin: JSON.stringify({ scores: { correctness: 9, completeness: 9 } }),
			});
			expect(r6.exitCode, `submit-refine-slices failed: ${r6.stderr}`).toBe(0);

			// Now try to activate without adding verification criteria
			const activateResult = runCommand(
				bin,
				["epic:activate", "--epic", "test-epic", "--json"],
				{ env, stdin: "" },
			);

			expect(activateResult.exitCode).toBe(3);
			expect(activateResult.json).toBeDefined();
			const json = activateResult.json as { error: { code: string; message: string } };
			expect(json.error).toBeDefined();
			expect(json.error.code).toBe("STATE_MISSING_VERIFICATIONS");
		});
	});

	it("slice:implement before plan is refined returns STATE_INVALID_TRANSITION", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			// test-slice is in 'created' status -- try to implement directly
			const result = runCommand(
				bin,
				["slice:implement", "--slice", "test-slice", "--json"],
				{ env, stdin: "" },
			);

			expect(result.exitCode).toBe(3);
			expect(result.json).toBeDefined();
			const json = result.json as { error: { code: string; message: string } };
			expect(json.error).toBeDefined();
			expect(json.error.code).toBe("STATE_INVALID_TRANSITION");
		});
	});

	it("JSON error output includes error code and message", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(
				bin,
				["slice:plan", "--slice", "nonexistent-slice", "--json"],
				{ env, stdin: "" },
			);

			expect(result.exitCode).toBe(3);
			expect(result.json).toBeDefined();
			const json = result.json as { error: { code: string; message: string } };
			expect(json.error).toBeDefined();
			expect(typeof json.error.code).toBe("string");
			expect(typeof json.error.message).toBe("string");
			expect(json.error.code.length).toBeGreaterThan(0);
			expect(json.error.message.length).toBeGreaterThan(0);
		});
	});

	it("slice:abandon transitions slice to abandoned status", async () => {
		await withFixture("slice-in-progress", ({ env, bin }) => {
			// test-slice is in 'plan-refined' status — abandon it
			const result = runCommand(
				bin,
				["slice:abandon", "--slice", "test-slice", "--reason", "No longer needed", "--json"],
				{ env, stdin: "" },
			);

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
			const json = result.json as Record<string, unknown>;
			expect(json.newStatus).toBe("abandoned");

			// Verify on-disk status
			const sliceJson = JSON.parse(
				fs.readFileSync(
					path.join(env.GOODPLAN_DIR, "epics", "test-epic", "slices", "test-slice", "slice.json"),
					"utf-8",
				),
			) as Record<string, unknown>;
			expect(sliceJson.status).toBe("abandoned");
		});
	});

	it("slice:plan on second slice is blocked by in-progress first slice (STATE_SLICE_NOT_READY)", async () => {
		await withFixture("slice-in-progress", ({ env, bin }) => {
			// Create a second slice after test-slice (which is plan-refined, not completed/abandoned)
			const createResult = runCommand(bin, ["slice:create", "--epic", "test-epic", "--json"], {
				env,
				stdin: JSON.stringify({ name: "second-slice", goal: "Second slice goal" }),
			});
			expect(createResult.exitCode).toBe(0);

			// Try to plan the second slice — should be blocked by test-slice not being terminal
			const planResult = runCommand(
				bin,
				["slice:plan", "--slice", "second-slice", "--json"],
				{ env, stdin: "" },
			);

			expect(planResult.exitCode).toBe(3);
			expect(planResult.json).toBeDefined();
			const json = planResult.json as { error: { code: string; message: string } };
			expect(json.error).toBeDefined();
			expect(json.error.code).toBe("STATE_SLICE_NOT_READY");
			expect(json.error.message).toContain("test-slice");
		});
	});
});
