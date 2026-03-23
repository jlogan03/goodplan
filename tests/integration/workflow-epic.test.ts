import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { runChain, runCommand, withFixture } from "./helpers.js";

describe("workflow: epic lifecycle", () => {
	it("epic:create from fresh-init creates epic directory and status", async () => {
		await withFixture("fresh-init", ({ env, bin }) => {
			const result = runCommand(bin, ["epic:create", "--json"], {
				env,
				stdin: JSON.stringify({ name: "test-epic", goal: "Test goal" }),
			});

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
			const json = result.json as Record<string, unknown>;
			expect(json.newStatus).toBe("created");

			// Verify epic directory and epic.json exist
			const epicDir = path.join(env.GOODPLAN_DIR, "epics", "test-epic");
			expect(fs.existsSync(epicDir)).toBe(true);
			expect(fs.existsSync(path.join(epicDir, "epic.json"))).toBe(true);
		});
	});

	it("epic lifecycle: create -> explore -> architecture -> slices -> activate", async () => {
		await withFixture("epic-created", ({ env, bin }) => {
			const results = runChain(bin, [
				// Begin explore (no stdin needed, but pipe empty to avoid blocking)
				{ args: ["epic:explore", "--epic", "test-epic", "--json"], stdin: "" },
				// Submit explore (complete exploration)
				{ args: ["submit-explore", "--epic", "test-epic", "--json"], stdin: "" },
				// Begin architecture
				{ args: ["epic:define-architecture", "--epic", "test-epic", "--json"], stdin: "" },
				// Submit architecture (complete architecture)
				{ args: ["submit-architecture", "--epic", "test-epic", "--json"], stdin: "" },
				// Skip architecture refinement (architecture-defined -> architecture-refined)
				{
					args: ["submit-refine-architecture", "--epic", "test-epic", "--json"],
					stdin: JSON.stringify({ scores: { correctness: 9, completeness: 9 } }),
				},
				// Begin slices
				{ args: ["epic:define-slices", "--epic", "test-epic", "--json"], stdin: "" },
				// Submit slices (complete slicing)
				{ args: ["submit-slices", "--epic", "test-epic", "--json"], stdin: "" },
				// Skip slice refinement (slices-defined -> slices-refined)
				{
					args: ["submit-refine-slices", "--epic", "test-epic", "--json"],
					stdin: JSON.stringify({ scores: { correctness: 9, completeness: 9 } }),
				},
				// Add verification criterion
				{
					args: ["epic:add-verification", "--epic", "test-epic", "--json"],
					stdin: JSON.stringify({
						verification: {
							description: "All tests pass",
							status: "pending",
							addedDuring: "slices-defined",
							modifiedDuring: null,
						},
					}),
				},
				// Activate epic
				{ args: ["epic:activate", "--epic", "test-epic", "--json"], stdin: "" },
			], { env });

			// All commands should succeed
			for (let i = 0; i < results.length; i++) {
				const r = results[i];
				expect(r?.exitCode, `Command ${i} failed: stdout=${r?.stdout} stderr=${r?.stderr}`).toBe(0);
			}

			// Verify final status is activated
			const lastResult = results[results.length - 1];
			expect(lastResult?.json).toBeDefined();
			const json = lastResult?.json as Record<string, unknown>;
			expect(json.newStatus).toBe("activated");

			// Verify epic.json on disk
			const epicJson = JSON.parse(
				fs.readFileSync(path.join(env.GOODPLAN_DIR, "epics", "test-epic", "epic.json"), "utf-8"),
			) as Record<string, unknown>;
			expect(epicJson.status).toBe("activated");
		});
	});

	it("epic:list returns epic data", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["epic:list", "--json"], { env, stdin: "" });

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
		});
	});

	it("epic:show returns epic details", async () => {
		await withFixture("epic-activated", ({ env, bin }) => {
			const result = runCommand(bin, ["epic:show", "--epic", "test-epic", "--json"], { env, stdin: "" });

			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();
		});
	});
});
