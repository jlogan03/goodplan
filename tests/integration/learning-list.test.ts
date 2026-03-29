import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("learning:list pagination", () => {
	it("returns all items with total when no pagination flags", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["learning:list", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as { items: unknown[]; total: number };
			expect(data.total).toBe(7);
			expect(data.items).toHaveLength(7);
			expect(data).not.toHaveProperty("offset");
			expect(data).not.toHaveProperty("limit");
		});
	});

	it("limits items with --limit", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["learning:list", "--limit", "3", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: unknown[];
				total: number;
				limit: number;
				offset: number;
			};
			expect(data.items).toHaveLength(3);
			expect(data.total).toBe(7);
			expect(data.limit).toBe(3);
			expect(data.offset).toBe(0);
		});
	});

	it("skips items with --offset", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["learning:list", "--offset", "5", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: unknown[];
				total: number;
				offset: number;
				limit: number;
			};
			expect(data.items).toHaveLength(2);
			expect(data.total).toBe(7);
			expect(data.offset).toBe(5);
		});
	});

	it("combines --limit and --offset", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["learning:list", "--offset", "2", "--limit", "3", "--json"], {
				env,
			});
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: Array<{ summary: string }>;
				total: number;
				offset: number;
				limit: number;
			};
			expect(data.items).toHaveLength(3);
			expect(data.total).toBe(7);
			expect(data.offset).toBe(2);
			expect(data.limit).toBe(3);
			const firstItem = data.items[0];
			expect(firstItem).toBeDefined();
			expect(firstItem?.summary).toBe("Learning three");
		});
	});

	it("offsets items with --offset alone (no --limit)", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["learning:list", "--offset", "3", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: unknown[];
				total: number;
				offset: number;
				limit: number;
			};
			expect(data.items).toHaveLength(4);
			expect(data.total).toBe(7);
			expect(data.offset).toBe(3);
			// When only --offset is provided, limit defaults to total
			expect(data.limit).toBe(7);
		});
	});

	it("produces validation error for invalid --limit with exit code 2", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["learning:list", "--limit", "abc", "--json"], { env });
			expect(result.exitCode).toBe(2);
		});
	});

	it("shows pagination footer in human mode", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["learning:list", "--limit", "3"], { env });
			expect(result.exitCode).toBe(0);
			// Strip ANSI codes for content check
			const stripped = stripAnsi(result.stdout);
			expect(stripped).toContain("Showing 1-3 of 7");
		});
	});

	it("combines pagination with --query (paginate-then-query)", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(
				bin,
				["learning:list", "--limit", "3", "--json", "--query", ".items | length"],
				{ env },
			);
			expect(result.exitCode).toBe(0);
			// Query applied to paginated result — items array has 3 elements
			const count = JSON.parse(result.stdout.trim()) as number;
			expect(count).toBe(3);
		});
	});
});
