import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

describe("workflow: slice lifecycle", () => {
	it("slice:create from epic-activated creates slice directory", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["slice:create", "--epic", "test-epic", "--json"], {
				env,
				stdin: JSON.stringify({ name: "new-slice", goal: "New slice goal" }),
			});

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
			const json = result.json as Record<string, unknown>;
			expect(json.newStatus).toBe("created");

			// Verify slice directory
			const sliceDir = path.join(env.GOODPLAN_DIR, "slices", "new-slice");
			expect(fs.existsSync(sliceDir)).toBe(true);
			expect(fs.existsSync(path.join(sliceDir, "slice.json"))).toBe(true);
		});
	});

	it("full slice lifecycle: plan -> refine -> implement -> complete", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			// First, start planning the existing test-slice (status: created, first slice)
			const planResult = runCommand(bin, ["slice:plan", "--slice", "test-slice", "--json"], { env, stdin: "" });
			expect(planResult.exitCode).toBe(0);
			expect(planResult.json).toBeDefined();
			expect((planResult.json as Record<string, unknown>).newStatus).toBe("planning");

			// Write plan.md to filesystem (sub-agent normally does this)
			const sliceDir = path.join(env.GOODPLAN_DIR, "slices", "test-slice");
			fs.writeFileSync(path.join(sliceDir, "plan.md"), "# Test Plan\n\nThis is the plan.");

			// Submit plan
			const submitPlanResult = runCommand(bin, ["submit-plan", "--slice", "test-slice", "--json"], { env, stdin: "" });
			expect(submitPlanResult.exitCode).toBe(0);
			expect(submitPlanResult.json).toBeDefined();
			expect((submitPlanResult.json as Record<string, unknown>).newStatus).toBe("plan-created");

			// Begin refinement
			const refineResult = runCommand(bin, ["slice:refine-plan", "--slice", "test-slice", "--json"], { env, stdin: "" });
			expect(refineResult.exitCode).toBe(0);
			expect(refineResult.json).toBeDefined();
			expect((refineResult.json as Record<string, unknown>).newStatus).toBe("refining");

			// Write plan-refined.md (sub-agent writes this during refinement)
			fs.writeFileSync(path.join(sliceDir, "plan-refined.md"), "# Refined Plan\n\nRefined content.");

			// Submit refinement with passing scores (>= 9)
			const submitRefineResult = runCommand(
				bin,
				["submit-refinement", "--slice", "test-slice", "--json"],
				{
					env,
					stdin: JSON.stringify({ scores: { correctness: 9, completeness: 9 } }),
				},
			);
			expect(submitRefineResult.exitCode).toBe(0);
			expect(submitRefineResult.json).toBeDefined();
			expect((submitRefineResult.json as Record<string, unknown>).newStatus).toBe("plan-refined");

			// Begin implementation
			const implResult = runCommand(bin, ["slice:implement", "--slice", "test-slice", "--json"], { env, stdin: "" });
			expect(implResult.exitCode).toBe(0);
			expect(implResult.json).toBeDefined();
			expect((implResult.json as Record<string, unknown>).newStatus).toBe("implementing");

			// Submit implementation
			const submitImplResult = runCommand(
				bin,
				["submit-implementation", "--slice", "test-slice", "--json"],
				{ env, stdin: "" },
			);
			expect(submitImplResult.exitCode).toBe(0);
			expect(submitImplResult.json).toBeDefined();
			expect((submitImplResult.json as Record<string, unknown>).newStatus).toBe("implementation-complete");

			// Complete slice
			const completeResult = runCommand(
				bin,
				["slice:complete", "--slice", "test-slice", "--json"],
				{
					env,
					stdin: JSON.stringify({
						verificationPassed: true,
						learnings: [],
						deferred: [],
						architectureDelta: [],
					}),
				},
			);
			expect(completeResult.exitCode).toBe(0);
			expect(completeResult.json).toBeDefined();
			expect((completeResult.json as Record<string, unknown>).newStatus).toBe("completed");

			// Verify on-disk status
			const sliceJson = JSON.parse(
				fs.readFileSync(path.join(sliceDir, "slice.json"), "utf-8"),
			) as Record<string, unknown>;
			expect(sliceJson.status).toBe("completed");

			// MIN-6: Verify activity-log.jsonl grew during the lifecycle
			const activityLog = fs.readFileSync(
				path.join(env.GOODPLAN_DIR, "activity-log.jsonl"),
				"utf-8",
			);
			const logLines = activityLog.trim().split("\n").filter((line) => line.length > 0);
			// At minimum: plan + submit-plan + refine + submit-refinement + implement + submit-impl + complete = 7 new entries
			// Plus any that existed in the fixture
			expect(logLines.length).toBeGreaterThanOrEqual(7);
		});
	});

	it("slice:list returns slice data", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["slice:list", "--json"], { env, stdin: "" });

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
		});
	});

	it("slice:show returns slice details", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["slice:show", "--slice", "test-slice", "--json"], { env, stdin: "" });

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
		});
	});
});
