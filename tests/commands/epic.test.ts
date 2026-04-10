/**
 * CLI integration tests for v2 epic commands.
 *
 * Exercises: epic:create, epic:list, epic:show, epic:abandon
 * via the compiled binary against a temp directory.
 */

import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "../integration/helpers.js";

describe("v2 epic commands", () => {
	it("full epic lifecycle: create -> list -> show -> abandon", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// 1. Initialize project first
			const initResult = runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
			});
			expect(initResult.exitCode, `init failed: ${initResult.stderr}`).toBe(0);

			// 2. Create an epic
			const createResult = runCommand(bin, ["epic:create", "--name", "my-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(createResult.exitCode, `create failed: ${createResult.stderr}`).toBe(0);
			expect(createResult.json).toBeDefined();

			const createOutput = createResult.json as { ok: boolean; event: string; entity: string };
			expect(createOutput.ok).toBe(true);
			expect(createOutput.event).toBeTruthy();
			expect(createOutput.entity).toBe("epic:my-epic");

			// 3. List epics
			const listResult = runCommand(bin, ["epic:list", "--json"], {
				cwd: tmpDir,
			});
			expect(listResult.exitCode, `list failed: ${listResult.stderr}`).toBe(0);
			expect(listResult.json).toBeDefined();

			const listOutput = listResult.json as {
				items: Array<{ name: string; phase: string; active: boolean }>;
				total: number;
			};
			expect(listOutput.total).toBe(1);
			expect(listOutput.items.length).toBe(1);
			expect(listOutput.items[0]?.name).toBe("my-epic");
			expect(listOutput.items[0]?.phase).toBe("P0");

			// 4. Show epic
			const showResult = runCommand(bin, ["epic:show", "--epic", "my-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(showResult.exitCode, `show failed: ${showResult.stderr}`).toBe(0);
			expect(showResult.json).toBeDefined();

			const showOutput = showResult.json as {
				ok: boolean;
				dir: string;
				phase: string;
				active: boolean;
				abandoned: boolean;
			};
			expect(showOutput.ok).toBe(true);
			expect(showOutput.dir).toBe("my-epic");
			expect(showOutput.phase).toBe("P0");
			expect(showOutput.active).toBe(false);
			expect(showOutput.abandoned).toBe(false);

			// 5. Abandon epic
			const abandonResult = runCommand(
				bin,
				["epic:abandon", "--epic", "my-epic", "--reason", "testing abandonment", "--json"],
				{ cwd: tmpDir },
			);
			expect(abandonResult.exitCode, `abandon failed: ${abandonResult.stderr}`).toBe(0);
			expect(abandonResult.json).toBeDefined();

			const abandonOutput = abandonResult.json as { ok: boolean; event: string; entity: string };
			expect(abandonOutput.ok).toBe(true);
			expect(abandonOutput.entity).toBe("epic:my-epic");

			// 6. Show epic after abandon — should reflect abandoned state
			const showAfterResult = runCommand(bin, ["epic:show", "--epic", "my-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(showAfterResult.exitCode, `show after abandon failed: ${showAfterResult.stderr}`).toBe(
				0,
			);
			const showAfterOutput = showAfterResult.json as {
				ok: boolean;
				abandoned: boolean;
			};
			expect(showAfterOutput.ok).toBe(true);
			expect(showAfterOutput.abandoned).toBe(true);
		});
	});

	it("epic:create returns error for duplicate name (same branch)", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// Initialize project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir });

			// Create first epic
			const first = runCommand(bin, ["epic:create", "--name", "dupe-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(first.exitCode).toBe(0);

			// Create second epic with same name — should fail with invariant violation
			const second = runCommand(bin, ["epic:create", "--name", "dupe-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(second.exitCode).not.toBe(0);
			expect(second.json).toBeDefined();

			const errorOutput = second.json as { ok: boolean; error: string; code: string };
			expect(errorOutput.ok).toBe(false);
			expect(errorOutput.error).toBeTruthy();
			expect(errorOutput.code).toBeTruthy();
		});
	});

	it("epic:show returns error for non-existent epic", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// Initialize project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir });

			// Show non-existent epic
			const result = runCommand(bin, ["epic:show", "--epic", "nonexistent", "--json"], {
				cwd: tmpDir,
			});
			expect(result.exitCode).not.toBe(0);
			expect(result.json).toBeDefined();

			const errorOutput = result.json as { ok: boolean; error: string; code: string };
			expect(errorOutput.ok).toBe(false);
			expect(errorOutput.code).toBe("ENTITY_NOT_FOUND");
		});
	});

	it("epic:create without --name returns validation error", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// Initialize project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir });

			// Create without name
			const result = runCommand(bin, ["epic:create", "--json"], {
				cwd: tmpDir,
			});
			expect(result.exitCode).not.toBe(0);
			expect(result.json).toBeDefined();

			const errorOutput = result.json as { ok: boolean; error: string; code: string };
			expect(errorOutput.ok).toBe(false);
			expect(errorOutput.code).toBe("VALIDATION_INVALID_INPUT");
		});
	});

	it("epic:list returns empty list when no epics exist", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();

			// Initialize project
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir });

			// List with no epics
			const result = runCommand(bin, ["epic:list", "--json"], { cwd: tmpDir });
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const listOutput = result.json as { items: unknown[]; total: number };
			expect(listOutput.total).toBe(0);
			expect(listOutput.items).toEqual([]);
		});
	});
});
