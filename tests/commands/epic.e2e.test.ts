/**
 * End-to-end CLI binary integration test for the full epic lifecycle.
 *
 * Exercises the complete flow from init through activate (P0 -> P6),
 * verifying phase transitions, event log integrity, and context bundle
 * presence in phase-starting command output.
 *
 * Uses `Bun.spawnSync` via the `runCommand` helper from `tests/integration/helpers.ts`.
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "../integration/helpers.js";

/** Initialize a git repo in the given directory (needed for storeContentRef). */
function gitInit(cwd: string): void {
	spawnSync("git", ["init"], { cwd, stdio: "pipe" });
	spawnSync("git", ["config", "user.email", "test@test.com"], { cwd, stdio: "pipe" });
	spawnSync("git", ["config", "user.name", "Test"], { cwd, stdio: "pipe" });
}

/** Read and parse the events.jsonl file for an epic. */
function readEventLog(tmpDir: string, epicName: string): Array<{ type: string; domain: string }> {
	const eventsPath = path.join(tmpDir, ".goodplan", "epics", epicName, "events.jsonl");
	if (!fs.existsSync(eventsPath)) {
		return [];
	}
	const content = fs.readFileSync(eventsPath, "utf-8").trim();
	if (content === "") {
		return [];
	}
	return content.split("\n").map((line) => JSON.parse(line) as { type: string; domain: string });
}

describe("epic e2e lifecycle: P0 through P6", () => {
	it("full lifecycle: init -> create -> goal -> explore -> architecture -> shape -> pressure-test -> slices -> shape -> activate", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			gitInit(tmpDir);

			// ========================================
			// P0: Init + Create
			// ========================================

			const initResult = runCommand(bin, ["init", "--name", "e2e-project", "--json"], {
				cwd: tmpDir,
			});
			expect(initResult.exitCode, `init failed: ${initResult.stderr}`).toBe(0);

			const createResult = runCommand(bin, ["epic:create", "--name", "e2e-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(createResult.exitCode, `create failed: ${createResult.stderr}`).toBe(0);
			const createOutput = createResult.json as { ok: boolean; entity: string };
			expect(createOutput.ok).toBe(true);
			expect(createOutput.entity).toBe("epic:e2e-epic");

			// Verify P0
			const showP0 = runCommand(bin, ["epic:show", "--epic", "e2e-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((showP0.json as { phase: string }).phase).toBe("P0");

			// ========================================
			// P0 -> P1: Goal draft + commit
			// ========================================

			const goalContent = "# E2E Epic Goal\n\nBuild a complete end-to-end test flow.";

			const goalDraftResult = runCommand(bin, ["epic:goal-draft", "--epic", "e2e-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ content: goalContent }),
			});
			expect(goalDraftResult.exitCode, `goal-draft failed: ${goalDraftResult.stderr}`).toBe(0);
			expect((goalDraftResult.json as { ok: boolean }).ok).toBe(true);

			const goalCommitResult = runCommand(
				bin,
				["epic:goal-commit", "--epic", "e2e-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: goalContent }),
				},
			);
			expect(goalCommitResult.exitCode, `goal-commit failed: ${goalCommitResult.stderr}`).toBe(0);
			expect((goalCommitResult.json as { ok: boolean }).ok).toBe(true);

			// Verify P1
			const showP1 = runCommand(bin, ["epic:show", "--epic", "e2e-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((showP1.json as { phase: string }).phase).toBe("P1");

			// ========================================
			// P1 -> P2: Exploration start + conclude
			// ========================================

			const exploreStartResult = runCommand(
				bin,
				["epic:explore-start", "--epic", "e2e-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ cycleNumber: 1 }),
				},
			);
			expect(
				exploreStartResult.exitCode,
				`explore-start failed: ${exploreStartResult.stderr}`,
			).toBe(0);
			const exploreStartOutput = exploreStartResult.json as {
				ok: boolean;
				contextBundle?: { phase: string };
			};
			expect(exploreStartOutput.ok).toBe(true);
			// Verify context bundle is present in phase-starting command output
			expect(exploreStartOutput.contextBundle).toBeDefined();
			expect(exploreStartOutput.contextBundle?.phase).toBe("P1");

			const exploreConcludeResult = runCommand(
				bin,
				["epic:explore-conclude", "--epic", "e2e-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: "# Exploration\n\nWe explored the problem space." }),
				},
			);
			expect(
				exploreConcludeResult.exitCode,
				`explore-conclude failed: ${exploreConcludeResult.stderr}`,
			).toBe(0);

			// Verify P2
			const showP2 = runCommand(bin, ["epic:show", "--epic", "e2e-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((showP2.json as { phase: string }).phase).toBe("P2");

			// ========================================
			// P2 -> P3: Architecture draft + commit
			// ========================================

			const archContent = "# Architecture\n\nThe system uses event sourcing.";

			const archDraftResult = runCommand(
				bin,
				["epic:architecture-draft", "--epic", "e2e-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: archContent }),
				},
			);
			expect(archDraftResult.exitCode, `arch-draft failed: ${archDraftResult.stderr}`).toBe(0);
			const archDraftOutput = archDraftResult.json as {
				ok: boolean;
				contextBundle?: { phase: string };
			};
			expect(archDraftOutput.ok).toBe(true);
			// Verify context bundle in architecture-draft output
			expect(archDraftOutput.contextBundle).toBeDefined();
			expect(archDraftOutput.contextBundle?.phase).toBe("P2");

			const archCommitResult = runCommand(
				bin,
				["epic:architecture-commit", "--epic", "e2e-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: archContent }),
				},
			);
			expect(archCommitResult.exitCode, `arch-commit failed: ${archCommitResult.stderr}`).toBe(0);

			// Verify P3
			const showP3 = runCommand(bin, ["epic:show", "--epic", "e2e-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((showP3.json as { phase: string }).phase).toBe("P3");

			// ========================================
			// P3: Architecture shape approve
			// ========================================

			const shapeApproveResult = runCommand(
				bin,
				["epic:architecture-shape-approve", "--epic", "e2e-epic", "--json"],
				{ cwd: tmpDir },
			);
			expect(
				shapeApproveResult.exitCode,
				`shape-approve failed: ${shapeApproveResult.stderr}`,
			).toBe(0);

			// ========================================
			// P3 -> P4: Pressure test draft + commit
			// ========================================

			const ptContent = "# Pressure Test\n\nRisk: scalability under load.";

			const ptDraftResult = runCommand(
				bin,
				["epic:pressure-test-draft", "--epic", "e2e-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: ptContent }),
				},
			);
			expect(ptDraftResult.exitCode, `pt-draft failed: ${ptDraftResult.stderr}`).toBe(0);
			const ptDraftOutput = ptDraftResult.json as {
				ok: boolean;
				contextBundle?: { phase: string };
			};
			expect(ptDraftOutput.ok).toBe(true);
			// Verify context bundle in pressure-test-draft output
			expect(ptDraftOutput.contextBundle).toBeDefined();
			expect(ptDraftOutput.contextBundle?.phase).toBe("P3");

			const ptCommitResult = runCommand(
				bin,
				["epic:pressure-test-commit", "--epic", "e2e-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: ptContent }),
				},
			);
			expect(ptCommitResult.exitCode, `pt-commit failed: ${ptCommitResult.stderr}`).toBe(0);

			// Verify P4
			const showP4 = runCommand(bin, ["epic:show", "--epic", "e2e-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((showP4.json as { phase: string }).phase).toBe("P4");

			// ========================================
			// P4 -> P5: Slices draft + commit
			// ========================================

			const slicesContent = "# Slices\n\n1. Slice Alpha\n2. Slice Beta";

			const slicesDraftResult = runCommand(
				bin,
				["epic:slices-draft", "--epic", "e2e-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: slicesContent }),
				},
			);
			expect(slicesDraftResult.exitCode, `slices-draft failed: ${slicesDraftResult.stderr}`).toBe(
				0,
			);
			const slicesDraftOutput = slicesDraftResult.json as {
				ok: boolean;
				contextBundle?: { phase: string };
			};
			expect(slicesDraftOutput.ok).toBe(true);
			// Verify context bundle in slices-draft output
			expect(slicesDraftOutput.contextBundle).toBeDefined();
			expect(slicesDraftOutput.contextBundle?.phase).toBe("P4");

			const slicesCommitResult = runCommand(
				bin,
				["epic:slices-commit", "--epic", "e2e-epic", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ content: slicesContent }),
				},
			);
			expect(
				slicesCommitResult.exitCode,
				`slices-commit failed: ${slicesCommitResult.stderr}`,
			).toBe(0);

			// Verify P5
			const showP5 = runCommand(bin, ["epic:show", "--epic", "e2e-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((showP5.json as { phase: string }).phase).toBe("P5");

			// ========================================
			// P5: Slice set shape approve
			// ========================================

			const sliceShapeResult = runCommand(
				bin,
				["epic:slice-set-shape-approve", "--epic", "e2e-epic", "--json"],
				{ cwd: tmpDir },
			);
			expect(
				sliceShapeResult.exitCode,
				`slice-shape-approve failed: ${sliceShapeResult.stderr}`,
			).toBe(0);

			// ========================================
			// P5 -> P6: Activate
			// ========================================

			const activateResult = runCommand(bin, ["epic:activate", "--epic", "e2e-epic", "--json"], {
				cwd: tmpDir,
			});
			expect(activateResult.exitCode, `activate failed: ${activateResult.stderr}`).toBe(0);
			expect((activateResult.json as { ok: boolean }).ok).toBe(true);

			// Verify P6
			const showP6 = runCommand(bin, ["epic:show", "--epic", "e2e-epic", "--json"], {
				cwd: tmpDir,
			});
			expect((showP6.json as { phase: string }).phase).toBe("P6");
			expect((showP6.json as { active: boolean }).active).toBe(true);

			// ========================================
			// Verify event log integrity
			// ========================================

			const events = readEventLog(tmpDir, "e2e-epic");
			expect(events.length).toBeGreaterThanOrEqual(10);

			// Verify the sequence of event types
			const eventTypes = events.map((e) => e.type);
			expect(eventTypes).toContain("epic-created");
			expect(eventTypes).toContain("epic-goal-drafted");
			expect(eventTypes).toContain("epic-goal-committed");
			expect(eventTypes).toContain("exploration-cycle-started");
			expect(eventTypes).toContain("exploration-concluded");
			expect(eventTypes).toContain("architecture-target-drafted");
			expect(eventTypes).toContain("architecture-target-committed");
			expect(eventTypes).toContain("architecture-shape-approved");
			expect(eventTypes).toContain("pressure-test-drafted");
			expect(eventTypes).toContain("pressure-test-committed");
			expect(eventTypes).toContain("slice-set-drafted");
			expect(eventTypes).toContain("slice-set-committed");
			expect(eventTypes).toContain("slice-set-shape-approved");
			expect(eventTypes).toContain("epic-activated");

			// Verify event ordering (each event should appear after its dependencies)
			const createdIdx = eventTypes.indexOf("epic-created");
			const goalDraftedIdx = eventTypes.indexOf("epic-goal-drafted");
			const goalCommittedIdx = eventTypes.indexOf("epic-goal-committed");
			const exploreStartedIdx = eventTypes.indexOf("exploration-cycle-started");
			const exploreConcludedIdx = eventTypes.indexOf("exploration-concluded");
			const archDraftedIdx = eventTypes.indexOf("architecture-target-drafted");
			const activatedIdx = eventTypes.indexOf("epic-activated");

			expect(createdIdx).toBeLessThan(goalDraftedIdx);
			expect(goalDraftedIdx).toBeLessThan(goalCommittedIdx);
			expect(goalCommittedIdx).toBeLessThan(exploreStartedIdx);
			expect(exploreStartedIdx).toBeLessThan(exploreConcludedIdx);
			expect(exploreConcludedIdx).toBeLessThan(archDraftedIdx);
			expect(archDraftedIdx).toBeLessThan(activatedIdx);
		});
	});

	it("context bundle has expected structure", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			gitInit(tmpDir);

			// Set up to P1 (goal committed)
			runCommand(bin, ["init", "--name", "ctx-project", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:create", "--name", "ctx-epic", "--json"], { cwd: tmpDir });
			runCommand(bin, ["epic:goal-draft", "--epic", "ctx-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ content: "# Goal\n\nTest context." }),
			});
			runCommand(bin, ["epic:goal-commit", "--epic", "ctx-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ content: "# Goal\n\nTest context." }),
			});

			// Start exploration — should include context bundle
			const result = runCommand(bin, ["epic:explore-start", "--epic", "ctx-epic", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ cycleNumber: 1 }),
			});
			expect(result.exitCode).toBe(0);

			const output = result.json as {
				ok: boolean;
				contextBundle?: {
					phase: string;
					scopeRef: string | null;
					inline: Array<{ key: string; content: string; estimatedTokens: number }>;
					references: Array<{ key: string; path: string; summary: string }>;
					tokenBudget: {
						total: number;
						inlineUsed: number;
						referenceReserve: number;
						remaining: number;
					};
				};
			};

			expect(output.ok).toBe(true);
			expect(output.contextBundle).toBeDefined();

			const bundle = output.contextBundle;
			if (bundle !== undefined) {
				expect(bundle.phase).toBe("P1");
				expect(bundle.scopeRef).toBe("ctx-epic");
				expect(bundle.inline).toBeInstanceOf(Array);
				expect(bundle.references).toBeInstanceOf(Array);
				expect(bundle.tokenBudget).toBeDefined();
				expect(bundle.tokenBudget.total).toBeGreaterThan(0);
			}
		});
	});
});
