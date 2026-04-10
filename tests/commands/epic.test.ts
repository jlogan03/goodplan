/**
 * CLI integration tests for v2 epic commands.
 *
 * Exercises: epic:create, epic:list, epic:show, epic:abandon,
 * and Phase 3 commands (goal, exploration, architecture)
 * via the compiled binary against a temp directory.
 */

import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "../integration/helpers.js";

/** Initialize a git repo in the given directory (needed for storeContentRef). */
function gitInit(cwd: string): void {
	spawnSync("git", ["init"], { cwd, stdio: "pipe" });
}

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

	it("full phase 3 flow: create -> goal-draft -> goal-commit -> explore-start -> explore-conclude -> architecture-draft -> architecture-commit", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			gitInit(tmpDir);

			// Initialize project
			const initResult = runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
			});
			expect(initResult.exitCode, `init failed: ${initResult.stderr}`).toBe(0);

			// Create epic
			const createResult = runCommand(bin, ["epic:create", "--name", "phase3-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(createResult.exitCode, `create failed: ${createResult.stderr}`).toBe(0);

			// Verify P0
			const show0 = runCommand(bin, ["epic:show", "--epic", "phase3-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((show0.json as { phase: string }).phase).toBe("P0");

			// Goal draft
			const goalDraftResult = runCommand(
				bin,
				["epic:goal-draft", "--epic", "phase3-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: "# Epic Goal\n\nBuild a great thing." }),
				},
			);
			expect(goalDraftResult.exitCode, `goal-draft failed: ${goalDraftResult.stderr}`).toBe(0);
			expect((goalDraftResult.json as { ok: boolean }).ok).toBe(true);

			// Still P0 after draft
			const showAfterDraft = runCommand(bin, ["epic:show", "--epic", "phase3-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((showAfterDraft.json as { phase: string }).phase).toBe("P0");

			// Goal commit
			const goalCommitResult = runCommand(
				bin,
				["epic:goal-commit", "--epic", "phase3-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: "# Epic Goal\n\nBuild a great thing." }),
				},
			);
			expect(goalCommitResult.exitCode, `goal-commit failed: ${goalCommitResult.stderr}`).toBe(0);
			expect((goalCommitResult.json as { ok: boolean }).ok).toBe(true);

			// Verify P1
			const show1 = runCommand(bin, ["epic:show", "--epic", "phase3-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((show1.json as { phase: string }).phase).toBe("P1");

			// Explore start
			const exploreStartResult = runCommand(
				bin,
				["epic:explore-start", "--epic", "phase3-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ cycleNumber: 1 }),
				},
			);
			expect(
				exploreStartResult.exitCode,
				`explore-start failed: ${exploreStartResult.stderr}`,
			).toBe(0);
			expect((exploreStartResult.json as { ok: boolean }).ok).toBe(true);

			// Explore conclude
			const exploreConcludeResult = runCommand(
				bin,
				["epic:explore-conclude", "--epic", "phase3-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: "# Exploration Summary\n\nWe explored." }),
				},
			);
			expect(
				exploreConcludeResult.exitCode,
				`explore-conclude failed: ${exploreConcludeResult.stderr}`,
			).toBe(0);
			expect((exploreConcludeResult.json as { ok: boolean }).ok).toBe(true);

			// Verify P2
			const show2 = runCommand(bin, ["epic:show", "--epic", "phase3-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((show2.json as { phase: string }).phase).toBe("P2");

			// Architecture draft
			const archDraftResult = runCommand(
				bin,
				["epic:architecture-draft", "--epic", "phase3-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: "# Architecture\n\nDesign goes here." }),
				},
			);
			expect(archDraftResult.exitCode, `architecture-draft failed: ${archDraftResult.stderr}`).toBe(
				0,
			);
			expect((archDraftResult.json as { ok: boolean }).ok).toBe(true);

			// Architecture commit
			const archCommitResult = runCommand(
				bin,
				["epic:architecture-commit", "--epic", "phase3-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: "# Architecture\n\nDesign goes here." }),
				},
			);
			expect(
				archCommitResult.exitCode,
				`architecture-commit failed: ${archCommitResult.stderr}`,
			).toBe(0);
			expect((archCommitResult.json as { ok: boolean }).ok).toBe(true);

			// Verify P3
			const show3 = runCommand(bin, ["epic:show", "--epic", "phase3-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((show3.json as { phase: string }).phase).toBe("P3");
		});
	});

	it("epic:goal-commit fails without prior goal-draft (invariant)", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			gitInit(tmpDir);

			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "inv-epic", "--json"], { cwd: tmpDir });

			const result = runCommand(bin, ["epic:goal-commit", "--epic", "inv-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ content: "# Goal" }),
			});
			expect(result.exitCode).not.toBe(0);
			expect((result.json as { ok: boolean }).ok).toBe(false);
		});
	});

	it("epic:explore-start fails without committed goal (invariant)", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			gitInit(tmpDir);

			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "inv-epic", "--json"], { cwd: tmpDir });

			const result = runCommand(bin, ["epic:explore-start", "--epic", "inv-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(result.exitCode).not.toBe(0);
			expect((result.json as { ok: boolean }).ok).toBe(false);
		});
	});

	it("epic:architecture-draft fails without concluded exploration (invariant)", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			gitInit(tmpDir);

			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "inv-epic", "--json"], { cwd: tmpDir });

			// Draft and commit goal, but skip exploration
			runCommand(bin, ["epic:goal-draft", "--epic", "inv-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ content: "# Goal" }),
			});
			runCommand(bin, ["epic:goal-commit", "--epic", "inv-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ content: "# Goal" }),
			});

			const result = runCommand(bin, ["epic:architecture-draft", "--epic", "inv-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ content: "# Arch" }),
			});
			expect(result.exitCode).not.toBe(0);
			expect((result.json as { ok: boolean }).ok).toBe(false);
		});
	});
});
