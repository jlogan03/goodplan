import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withFixture } from "./helpers.js";

describe("state command", () => {
	it("state --json returns valid JSON with project.json content", async () => {
		await withFixture("slice-in-progress", ({ bin, env }) => {
			const result = runCommand(bin, ["state", "--json"], { env });
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const state = result.json as Record<string, unknown>;
			const project = state["project.json"] as Record<string, unknown>;
			expect(project).toBeDefined();
			expect(project.name).toBe("test-project");
		});
	});

	it("state (no --json) still returns valid JSON", async () => {
		await withFixture("slice-in-progress", ({ bin, env }) => {
			// state always outputs JSON even without --json
			const result = runCommand(bin, ["state"], { env });
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout);
			expect(parsed["project.json"]).toBeDefined();
		});
	});

	it("state --json --query filters by project name", async () => {
		await withFixture("slice-in-progress", ({ bin, env }) => {
			const result = runCommand(bin, [
				"state", "--json", "--query", '.["project.json"].name',
			], { env });
			expect(result.exitCode).toBe(0);
			expect(result.json).toBe("test-project");
		});
	});

	it("state --json --query --limit returns limited entries", async () => {
		await withFixture("slice-in-progress", ({ bin, env }) => {
			const result = runCommand(bin, [
				"state", "--json",
				"--query", '.["activity-log.jsonl"]',
				"--limit", "2",
			], { env });
			expect(result.exitCode).toBe(0);
			const entries = result.json as unknown[];
			expect(entries.length).toBe(2);
		});
	});

	it("state --json --query --offset --limit returns different entries", async () => {
		await withFixture("slice-in-progress", ({ bin, env }) => {
			const first = runCommand(bin, [
				"state", "--json",
				"--query", '.["activity-log.jsonl"]',
				"--limit", "2",
			], { env });

			const second = runCommand(bin, [
				"state", "--json",
				"--query", '.["activity-log.jsonl"]',
				"--offset", "2",
				"--limit", "2",
			], { env });

			expect(first.exitCode).toBe(0);
			expect(second.exitCode).toBe(0);

			const firstEntries = first.json as Array<Record<string, unknown>>;
			const secondEntries = second.json as Array<Record<string, unknown>>;

			expect(firstEntries.length).toBe(2);
			expect(secondEntries.length).toBe(2);
			// Entries should be different (different offset)
			expect(firstEntries[0]).not.toEqual(secondEntries[0]);
		});
	});

	it("state --json --query with bad syntax exits 2 with VALIDATION_INVALID_QUERY", async () => {
		await withFixture("slice-in-progress", ({ bin, env }) => {
			const result = runCommand(bin, [
				"state", "--json", "--query", "bad syntax",
			], { env });
			expect(result.exitCode).toBe(2);
			const parsed = JSON.parse(result.stdout);
			expect(parsed.error.code).toBe("VALIDATION_INVALID_QUERY");
		});
	});

	it("state --json --inline includes markdown content as strings", async () => {
		await withFixture("slice-in-progress", ({ bin, env }) => {
			const result = runCommand(bin, [
				"state", "--json", "--inline",
			], { env });
			expect(result.exitCode).toBe(0);
			const state = result.json as Record<string, unknown>;

			// Check that a markdown file has string content (not true)
			const epics = state["epics"] as Record<string, unknown>;
			const epic = epics["test-epic"] as Record<string, unknown>;
			const goalMd = epic["goal.md"];
			expect(typeof goalMd).toBe("string");
		});
	});

	it("state --json without --inline has markdown as true", async () => {
		await withFixture("slice-in-progress", ({ bin, env }) => {
			const result = runCommand(bin, [
				"state", "--json",
			], { env });
			expect(result.exitCode).toBe(0);
			const state = result.json as Record<string, unknown>;

			const epics = state["epics"] as Record<string, unknown>;
			const epic = epics["test-epic"] as Record<string, unknown>;
			const goalMd = epic["goal.md"];
			expect(goalMd).toBe(true);
		});
	});
});

describe("--version --json", () => {
	it("returns JSON with version field", () => {
		const bin = buildBinary();
		const result = runCommand(bin, ["--version", "--json"]);
		expect(result.exitCode).toBe(0);
		expect(result.json).toBeDefined();
		const data = result.json as Record<string, unknown>;
		expect(data.version).toBeDefined();
		expect(typeof data.version).toBe("string");
	});

	it("--version without --json returns plain text", () => {
		const bin = buildBinary();
		const result = runCommand(bin, ["--version"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toMatch(/^goodplan \d+\.\d+\.\d+\n$/);
	});
});
