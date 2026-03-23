import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

describe("workflow: quest lifecycle", () => {
	it("full quest lifecycle: create -> plan -> refine -> implement -> complete", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			// Create quest
			const createResult = runCommand(bin, ["quest:create", "--json"], {
				env,
				stdin: JSON.stringify({ name: "test-quest", goal: "Test quest goal" }),
			});
			expect(createResult.exitCode).toBe(0);
			expect(createResult.json).toBeDefined();
			expect((createResult.json as Record<string, unknown>).newStatus).toBe("created");

			// Verify quest directory
			const questDir = path.join(env.GOODPLAN_DIR, "quests", "test-quest");
			expect(fs.existsSync(questDir)).toBe(true);
			expect(fs.existsSync(path.join(questDir, "quest.json"))).toBe(true);

			// Begin quest planning
			const planResult = runCommand(bin, ["quest:plan", "--quest", "test-quest", "--json"], { env, stdin: "" });
			expect(planResult.exitCode).toBe(0);
			expect(planResult.json).toBeDefined();
			expect((planResult.json as Record<string, unknown>).newStatus).toBe("planning");

			// Write plan.md (sub-agent does this)
			fs.writeFileSync(path.join(questDir, "plan.md"), "# Quest Plan\n\nQuest plan content.");

			// Submit plan
			const submitPlanResult = runCommand(
				bin,
				["submit-plan", "--quest", "test-quest", "--json"],
				{ env, stdin: "" },
			);
			expect(submitPlanResult.exitCode).toBe(0);
			expect(submitPlanResult.json).toBeDefined();
			expect((submitPlanResult.json as Record<string, unknown>).newStatus).toBe("plan-created");

			// Begin refinement
			const refineResult = runCommand(
				bin,
				["quest:refine-plan", "--quest", "test-quest", "--json"],
				{ env, stdin: "" },
			);
			expect(refineResult.exitCode).toBe(0);
			expect(refineResult.json).toBeDefined();
			expect((refineResult.json as Record<string, unknown>).newStatus).toBe("refining");

			// Write plan-refined.md
			fs.writeFileSync(path.join(questDir, "plan-refined.md"), "# Refined Quest Plan\n\nRefined content.");

			// Submit refinement with passing scores
			const submitRefineResult = runCommand(
				bin,
				["submit-refinement", "--quest", "test-quest", "--json"],
				{
					env,
					stdin: JSON.stringify({ scores: { correctness: 9, completeness: 9 } }),
				},
			);
			expect(submitRefineResult.exitCode).toBe(0);
			expect(submitRefineResult.json).toBeDefined();
			expect((submitRefineResult.json as Record<string, unknown>).newStatus).toBe("plan-refined");

			// Begin implementation
			const implResult = runCommand(
				bin,
				["quest:implement", "--quest", "test-quest", "--json"],
				{ env, stdin: "" },
			);
			expect(implResult.exitCode).toBe(0);
			expect(implResult.json).toBeDefined();
			expect((implResult.json as Record<string, unknown>).newStatus).toBe("implementing");

			// Submit implementation
			const submitImplResult = runCommand(
				bin,
				["submit-implementation", "--quest", "test-quest", "--json"],
				{ env, stdin: "" },
			);
			expect(submitImplResult.exitCode).toBe(0);
			expect(submitImplResult.json).toBeDefined();
			expect((submitImplResult.json as Record<string, unknown>).newStatus).toBe("implementation-complete");

			// Complete quest
			const completeResult = runCommand(
				bin,
				["quest:complete", "--quest", "test-quest", "--json"],
				{
					env,
					stdin: JSON.stringify({
						verificationPassed: true,
						learnings: [],
						architectureDelta: [],
					}),
				},
			);
			expect(completeResult.exitCode).toBe(0);
			expect(completeResult.json).toBeDefined();
			expect((completeResult.json as Record<string, unknown>).newStatus).toBe("completed");

			// Verify on-disk status
			const questJson = JSON.parse(
				fs.readFileSync(path.join(questDir, "quest.json"), "utf-8"),
			) as Record<string, unknown>;
			expect(questJson.status).toBe("completed");
		});
	});

	it("quest:list returns quest data", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["quest:list", "--json"], { env, stdin: "" });

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
		});
	});
});
