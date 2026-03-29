import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("epic:list pagination", () => {
	it("returns all items with total when no pagination flags", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["epic:list", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as { items: unknown[]; total: number };
			expect(data.total).toBe(6);
			expect(data.items).toHaveLength(6);
			expect(data).not.toHaveProperty("offset");
			expect(data).not.toHaveProperty("limit");
		});
	});

	it("limits items with --limit", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["epic:list", "--limit", "3", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: unknown[];
				total: number;
				limit: number;
				offset: number;
			};
			expect(data.items).toHaveLength(3);
			expect(data.total).toBe(6);
			expect(data.limit).toBe(3);
			expect(data.offset).toBe(0);
		});
	});

	it("skips items with --offset", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["epic:list", "--offset", "4", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: unknown[];
				total: number;
				offset: number;
				limit: number;
			};
			expect(data.items).toHaveLength(2);
			expect(data.total).toBe(6);
			expect(data.offset).toBe(4);
		});
	});

	it("combines --limit and --offset", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["epic:list", "--offset", "1", "--limit", "2", "--json"], {
				env,
			});
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: Array<{ name: string }>;
				total: number;
				offset: number;
				limit: number;
			};
			expect(data.items).toHaveLength(2);
			expect(data.total).toBe(6);
			expect(data.offset).toBe(1);
			expect(data.limit).toBe(2);
			const firstItem = data.items[0];
			expect(firstItem).toBeDefined();
			expect(firstItem?.name).toBe("epic-beta");
		});
	});

	it("shows pagination footer in human mode", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["epic:list", "--limit", "3"], { env });
			expect(result.exitCode).toBe(0);
			const stripped = stripAnsi(result.stdout);
			expect(stripped).toContain("Showing 1-3 of 6");
		});
	});

	it("produces validation error for invalid --limit with exit code 2", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["epic:list", "--limit", "-1", "--json"], { env });
			expect(result.exitCode).toBe(2);
		});
	});
});
