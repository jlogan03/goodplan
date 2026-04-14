import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

describe("events commands", () => {
	it("events:tail returns last N events from project scope", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project (creates project-level events)
			const init = runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);

			// Tail all project events
			const tail = runCommand(bin, ["events:tail", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(tail.exitCode, `tail failed: ${tail.stderr}`).toBe(0);
			expect(tail.json).toBeDefined();
			const tailJson = tail.json as { ok: boolean; total: number; items: unknown[] };
			expect(tailJson.ok).toBe(true);
			expect(tailJson.total).toBeGreaterThan(0);
			expect(tailJson.items.length).toBeGreaterThan(0);

			// Tail with -n 1 returns only the most recent event
			const tail1 = runCommand(bin, ["events:tail", "--json", "-n", "1"], {
				cwd: tmpDir,
				env,
			});
			expect(tail1.exitCode, `tail -n 1 failed: ${tail1.stderr}`).toBe(0);
			expect(tail1.json).toBeDefined();
			const tail1Json = tail1.json as { ok: boolean; total: number; items: unknown[] };
			expect(tail1Json.ok).toBe(true);
			expect(tail1Json.total).toBe(1);
			expect(tail1Json.items.length).toBe(1);
		});
	});

	it("events:tail returns events from epic scope", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir, env });

			// Create an epic
			const epicCreate = runCommand(bin, ["epic:create", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ name: "my-epic", description: "Test epic" }),
			});
			expect(epicCreate.exitCode, `epic:create failed: ${epicCreate.stderr}`).toBe(0);

			// Create a slice in the epic
			const sliceCreate = runCommand(bin, ["slice:create", "--epic", "my-epic", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					name: "my-slice",
					description: "Test slice",
					rationale: "Testing events",
				}),
			});
			expect(sliceCreate.exitCode, `slice:create failed: ${sliceCreate.stderr}`).toBe(0);

			// Tail epic events
			const tail = runCommand(
				bin,
				["events:tail", "--json", "--scope", "epic", "--scope-ref", "my-epic"],
				{ cwd: tmpDir, env },
			);
			expect(tail.exitCode, `tail epic failed: ${tail.stderr}`).toBe(0);
			expect(tail.json).toBeDefined();
			const tailJson = tail.json as { ok: boolean; total: number; items: unknown[] };
			expect(tailJson.ok).toBe(true);
			expect(tailJson.total).toBeGreaterThan(0);

			// Tail with -n 5
			const tail5 = runCommand(
				bin,
				["events:tail", "--json", "-n", "5", "--scope", "epic", "--scope-ref", "my-epic"],
				{ cwd: tmpDir, env },
			);
			expect(tail5.exitCode, `tail -n 5 failed: ${tail5.stderr}`).toBe(0);
			expect(tail5.json).toBeDefined();
			const tail5Json = tail5.json as { ok: boolean; total: number; items: unknown[] };
			expect(tail5Json.ok).toBe(true);
			expect(tail5Json.total).toBeLessThanOrEqual(5);
		});
	});

	it("events:query filters by type", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir, env });

			// Create an epic to get epic-created events
			runCommand(bin, ["epic:create", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ name: "my-epic", description: "Test epic" }),
			});

			// Create a slice
			runCommand(bin, ["slice:create", "--epic", "my-epic", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					name: "my-slice",
					description: "Test slice",
					rationale: "Testing",
				}),
			});

			// Query for epic-created events in the epic scope
			const query = runCommand(
				bin,
				[
					"events:query",
					"--json",
					"--type",
					"epic-created",
					"--scope",
					"epic",
					"--scope-ref",
					"my-epic",
				],
				{ cwd: tmpDir, env },
			);
			expect(query.exitCode, `query failed: ${query.stderr}`).toBe(0);
			expect(query.json).toBeDefined();
			const queryJson = query.json as {
				ok: boolean;
				total: number;
				items: Array<{ type: string }>;
			};
			expect(queryJson.ok).toBe(true);
			expect(queryJson.total).toBe(1);
			expect(queryJson.items[0]?.type).toBe("epic-created");
		});
	});

	it("events:query filters by domain", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir, env });

			// Query for entity-lifecycle domain events in project scope
			const query = runCommand(bin, ["events:query", "--json", "--domain", "entity-lifecycle"], {
				cwd: tmpDir,
				env,
			});
			expect(query.exitCode, `query failed: ${query.stderr}`).toBe(0);
			expect(query.json).toBeDefined();
			const queryJson = query.json as {
				ok: boolean;
				total: number;
				items: Array<{ domain: string }>;
			};
			expect(queryJson.ok).toBe(true);
			// All returned items should have the requested domain
			for (const item of queryJson.items) {
				expect(item.domain).toBe("entity-lifecycle");
			}
		});
	});

	it("events:query returns empty items when no matches", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir, env });

			// Query for a type that doesn't exist
			const query = runCommand(
				bin,
				["events:query", "--json", "--type", "nonexistent-event-type"],
				{ cwd: tmpDir, env },
			);
			expect(query.exitCode, `query failed: ${query.stderr}`).toBe(0);
			expect(query.json).toBeDefined();
			const queryJson = query.json as { ok: boolean; total: number; items: unknown[] };
			expect(queryJson.ok).toBe(true);
			expect(queryJson.total).toBe(0);
			expect(queryJson.items).toEqual([]);
		});
	});

	it("events:tail on nonexistent epic scope returns empty (replayEvents handles missing files)", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir, env });

			// Tail events for a nonexistent epic — replayEvents returns empty for missing files
			const tail = runCommand(
				bin,
				["events:tail", "--json", "--scope", "epic", "--scope-ref", "nonexistent-epic"],
				{ cwd: tmpDir, env },
			);
			expect(tail.exitCode, `tail failed: ${tail.stderr}`).toBe(0);
			expect(tail.json).toBeDefined();
			const tailJson = tail.json as { ok: boolean; total: number; items: unknown[] };
			expect(tailJson.ok).toBe(true);
			expect(tailJson.total).toBe(0);
			expect(tailJson.items).toEqual([]);
		});
	});

	it("events:tail without scope-ref for epic scope returns error", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir, env });

			// Tail with epic scope but no scope-ref
			const tail = runCommand(bin, ["events:tail", "--json", "--scope", "epic"], {
				cwd: tmpDir,
				env,
			});
			expect(tail.exitCode).not.toBe(0);
		});
	});
});
