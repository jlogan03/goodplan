import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

describe("RPC result paths", () => {
	it("slice:plan --json includes paths.plan with absolute path", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["slice:plan", "--slice", "test-slice", "--json"], { env, stdin: "" });
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as Record<string, unknown>;
			expect(json.paths).toBeDefined();

			const paths = json.paths as Record<string, string>;
			expect(paths.plan).toBeDefined();
			expect(path.isAbsolute(paths.plan)).toBe(true);
			expect(paths.plan).toContain("epics/test-epic/slices/test-slice/plan.md");
		});
	});

	it("epic:explore --json includes paths.research and paths.brainstorm", async () => {
		await withFixture("epic-created", ({ env, bin }) => {
			const result = runCommand(bin, ["epic:explore", "--epic", "test-epic", "--json"], { env, stdin: "" });
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as Record<string, unknown>;
			expect(json.paths).toBeDefined();

			const paths = json.paths as Record<string, string>;
			expect(paths.research).toBeDefined();
			expect(paths.brainstorm).toBeDefined();
			expect(path.isAbsolute(paths.research)).toBe(true);
			expect(paths.research).toContain("epics/test-epic/research");
			expect(paths.brainstorm).toContain("epics/test-epic/brainstorm");
		});
	});

	it("submit-plan --json includes paths.plan", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			// Start planning
			runCommand(bin, ["slice:plan", "--slice", "test-slice", "--json"], { env, stdin: "" });

			// Write plan.md (simulating sub-agent)
			const sliceDir = path.join(env.GOODPLAN_DIR, "epics", "test-epic", "slices", "test-slice");
			fs.writeFileSync(path.join(sliceDir, "plan.md"), "# Plan\nContent");

			// Submit plan
			const result = runCommand(bin, ["submit-plan", "--slice", "test-slice", "--json"], { env, stdin: "" });
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as Record<string, unknown>;
			expect(json.paths).toBeDefined();

			const paths = json.paths as Record<string, string>;
			expect(paths.plan).toBeDefined();
			expect(path.isAbsolute(paths.plan)).toBe(true);
		});
	});

	it("slice:create --json includes empty paths (lifecycle phase)", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["slice:create", "--epic", "test-epic", "--json"], {
				env,
				stdin: JSON.stringify({ name: "new-slice", goal: "Test goal" }),
			});
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const json = result.json as Record<string, unknown>;
			expect(json.paths).toBeDefined();
			expect(json.paths).toEqual({});
		});
	});
});
