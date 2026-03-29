import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("slice:list pagination", () => {
	it("returns all items with total when no pagination flags", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["slice:list", "--all", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as { items: unknown[]; total: number };
			// 2 slices in epic-alpha + 3 in epic-beta = 5 total
			expect(data.total).toBe(5);
			expect(data.items).toHaveLength(5);
			expect(data).not.toHaveProperty("offset");
			expect(data).not.toHaveProperty("limit");
		});
	});

	it("limits items with --limit", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["slice:list", "--all", "--limit", "3", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: unknown[];
				total: number;
				limit: number;
				offset: number;
			};
			expect(data.items).toHaveLength(3);
			expect(data.total).toBe(5);
			expect(data.limit).toBe(3);
			expect(data.offset).toBe(0);
		});
	});

	it("skips items with --offset", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["slice:list", "--all", "--offset", "3", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: unknown[];
				total: number;
				offset: number;
				limit: number;
			};
			expect(data.items).toHaveLength(2);
			expect(data.total).toBe(5);
			expect(data.offset).toBe(3);
		});
	});

	it("combines --limit and --offset", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(
				bin,
				["slice:list", "--all", "--offset", "1", "--limit", "2", "--json"],
				{ env },
			);
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: Array<{ name: string }>;
				total: number;
				offset: number;
				limit: number;
			};
			expect(data.items).toHaveLength(2);
			expect(data.total).toBe(5);
			expect(data.offset).toBe(1);
			expect(data.limit).toBe(2);
			// Second slice (index 1) is slice-a2
			const firstItem = data.items[0];
			expect(firstItem).toBeDefined();
			expect(firstItem?.name).toBe("slice-a2");
		});
	});

	it("--offset alone without --limit", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["slice:list", "--all", "--offset", "2", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: unknown[];
				total: number;
				offset: number;
				limit: number;
			};
			expect(data.items).toHaveLength(3);
			expect(data.total).toBe(5);
			expect(data.offset).toBe(2);
			expect(data.limit).toBe(data.total);
		});
	});

	it("shows pagination footer in human mode", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["slice:list", "--all", "--limit", "2"], { env });
			expect(result.exitCode).toBe(0);
			const stripped = stripAnsi(result.stdout);
			expect(stripped).toContain("Showing 1-2 of 5");
		});
	});

	it("quiet mode produces no output with pagination", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["slice:list", "--all", "--limit", "2", "--quiet"], { env });
			expect(result.exitCode).toBe(0);
			expect(result.stdout.trim()).toBe("");
		});
	});

	it("combines pagination with --query", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(
				bin,
				["slice:list", "--all", "--limit", "2", "--json", "--query", ".items | length"],
				{ env },
			);
			expect(result.exitCode).toBe(0);
			const count = JSON.parse(result.stdout.trim()) as number;
			expect(count).toBe(2);
		});
	});

	it("produces validation error for invalid --limit with exit code 2", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["slice:list", "--all", "--limit", "abc", "--json"], { env });
			expect(result.exitCode).toBe(2);
		});
	});
});
