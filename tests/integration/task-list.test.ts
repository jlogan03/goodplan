import { describe, expect, it } from "vitest";
import { runCommand, withFixture } from "./helpers.js";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("task:list pagination", () => {
	it("returns open tasks by default with total when no pagination flags", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["task:list", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as { items: unknown[]; total: number; filter: string };
			// 4 open tasks out of 6 total
			expect(data.filter).toBe("open");
			expect(data.total).toBe(4);
			expect(data.items).toHaveLength(4);
			expect(data).not.toHaveProperty("offset");
			expect(data).not.toHaveProperty("limit");
		});
	});

	it("returns all tasks with --all", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["task:list", "--all", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as { items: unknown[]; total: number; filter: string };
			expect(data.filter).toBe("all");
			expect(data.total).toBe(6);
			expect(data.items).toHaveLength(6);
		});
	});

	it("limits items with --limit", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["task:list", "--limit", "2", "--json"], { env });
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: unknown[];
				total: number;
				limit: number;
				offset: number;
				filter: string;
			};
			expect(data.items).toHaveLength(2);
			expect(data.total).toBe(4);
			expect(data.limit).toBe(2);
			expect(data.offset).toBe(0);
			expect(data.filter).toBe("open");
		});
	});

	it("combines --all with --limit and --offset", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(
				bin,
				["task:list", "--all", "--offset", "1", "--limit", "2", "--json"],
				{ env },
			);
			expect(result.exitCode).toBe(0);
			const data = result.json as {
				items: Array<{ name: string }>;
				total: number;
				offset: number;
				limit: number;
				filter: string;
			};
			expect(data.items).toHaveLength(2);
			expect(data.total).toBe(6);
			expect(data.offset).toBe(1);
			expect(data.limit).toBe(2);
			expect(data.filter).toBe("all");
			const firstItem = data.items[0];
			expect(firstItem).toBeDefined();
			expect(firstItem?.name).toBe("task-two");
		});
	});

	it("shows pagination footer in human mode", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["task:list", "--limit", "2"], { env });
			expect(result.exitCode).toBe(0);
			const stripped = stripAnsi(result.stdout);
			expect(stripped).toContain("Showing 1-2 of 4");
		});
	});

	it("produces validation error for invalid --limit with exit code 2", async () => {
		await withFixture("pagination", ({ bin, env }) => {
			const result = runCommand(bin, ["task:list", "--limit", "-1", "--json"], { env });
			expect(result.exitCode).toBe(2);
		});
	});
});
