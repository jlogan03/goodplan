/**
 * CLI integration tests for the v2 refine:* command lifecycle.
 *
 * Exercises: refine:start, refine:score, refine:synthesize, refine:revise,
 * refine:evaluate, refine:converge, refine:stuck, refine:override
 * via the compiled binary against a temp directory.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "../integration/helpers.js";

/** Dummy ContentRef for stdin payloads. */
const CONTENT_REF = {
	sha: "a".repeat(40),
	size: 100,
	path: "test.md",
	mediaType: "text/markdown",
};

/** Advance an epic to a state where refinement makes sense (has an epic with events). */
function setupEpic(bin: string, tmpDir: string): void {
	const init = runCommand(bin, ["init", "--name", "refine-project", "--json"], { cwd: tmpDir });
	expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);

	const create = runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], {
		cwd: tmpDir,
	});
	expect(create.exitCode, `epic:create failed: ${create.stderr}`).toBe(0);
}

describe("refine:* lifecycle", () => {
	it("full refinement lifecycle: start -> score -> synthesize -> revise -> evaluate -> converge", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			setupEpic(bin, tmpDir);

			// 1. refine:start
			const startResult = runCommand(
				bin,
				["refine:start", "--epic", "test-epic", "--artifact-type", "plan", "--json"],
				{ cwd: tmpDir },
			);
			expect(startResult.exitCode, `refine:start failed: ${startResult.stderr}`).toBe(0);
			const startOut = startResult.json as { ok: boolean; event: string; entity: string };
			expect(startOut.ok).toBe(true);
			expect(startOut.event).toBeTruthy();
			expect(startOut.entity).toContain("plan");
			expect(startOut.entity).toContain("round-1");

			// 2. refine:score
			const scoreStdin = JSON.stringify({
				dimensions: [
					{ name: "correctness", score: 8 },
					{ name: "completeness", score: 7 },
				],
				findings: [
					{ severity: "MINOR", dimension: "correctness", description: "Small issue found" },
				],
			});
			const scoreResult = runCommand(
				bin,
				[
					"refine:score",
					"--epic",
					"test-epic",
					"--artifact-type",
					"plan",
					"--reviewer",
					"holistic",
					"--json",
				],
				{ cwd: tmpDir, stdin: scoreStdin },
			);
			expect(scoreResult.exitCode, `refine:score failed: ${scoreResult.stderr}`).toBe(0);
			const scoreOut = scoreResult.json as { ok: boolean; event: string };
			expect(scoreOut.ok).toBe(true);

			// 3. refine:synthesize
			const synthResult = runCommand(
				bin,
				["refine:synthesize", "--epic", "test-epic", "--artifact-type", "plan", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ synthesis: CONTENT_REF }),
				},
			);
			expect(synthResult.exitCode, `refine:synthesize failed: ${synthResult.stderr}`).toBe(0);
			expect((synthResult.json as { ok: boolean }).ok).toBe(true);

			// 4. refine:revise
			const reviseResult = runCommand(
				bin,
				["refine:revise", "--epic", "test-epic", "--artifact-type", "plan", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ artifact: CONTENT_REF }),
				},
			);
			expect(reviseResult.exitCode, `refine:revise failed: ${reviseResult.stderr}`).toBe(0);
			expect((reviseResult.json as { ok: boolean }).ok).toBe(true);

			// 5. refine:evaluate (read-only)
			const evalResult = runCommand(
				bin,
				["refine:evaluate", "--epic", "test-epic", "--artifact-type", "plan", "--json"],
				{ cwd: tmpDir },
			);
			expect(evalResult.exitCode, `refine:evaluate failed: ${evalResult.stderr}`).toBe(0);
			const evalOut = evalResult.json as {
				ok: boolean;
				convergence: { state: string };
				circuitBreaker: { triggered: boolean };
				round: number;
			};
			expect(evalOut.ok).toBe(true);
			expect(evalOut.convergence).toBeDefined();
			expect(evalOut.convergence.state).toBeTruthy();
			expect(evalOut.circuitBreaker).toBeDefined();
			expect(evalOut.round).toBe(1);

			// 6. refine:converge
			const convergeResult = runCommand(
				bin,
				["refine:converge", "--epic", "test-epic", "--artifact-type", "plan", "--json"],
				{ cwd: tmpDir },
			);
			expect(convergeResult.exitCode, `refine:converge failed: ${convergeResult.stderr}`).toBe(0);
			const convergeOut = convergeResult.json as {
				ok: boolean;
				event: string;
				convergenceResult: { state: string };
			};
			expect(convergeOut.ok).toBe(true);
			expect(convergeOut.convergenceResult).toBeDefined();

			// 7. Verify event chain in events.jsonl
			const eventsPath = path.join(tmpDir, ".goodplan", "epics", "test-epic", "events.jsonl");
			expect(fs.existsSync(eventsPath)).toBe(true);
			const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
			const events = lines.map((l) => JSON.parse(l) as { type: string; domain?: string });

			// Filter to refinement events only
			const refineEvents = events.filter((e) => e.domain === "refinement");
			const refineTypes = refineEvents.map((e) => e.type);

			expect(refineTypes).toContain("refinement-round-started");
			expect(refineTypes).toContain("reviewer-scored");
			expect(refineTypes).toContain("refinement-synthesized");
			expect(refineTypes).toContain("artifact-revised");
			expect(refineTypes).toContain("refinement-converged");
		});
	});

	it("refine:stuck emits circuit-breaker-tripped event", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			setupEpic(bin, tmpDir);

			// Start a round first
			const startResult = runCommand(
				bin,
				["refine:start", "--epic", "test-epic", "--artifact-type", "plan", "--json"],
				{ cwd: tmpDir },
			);
			expect(startResult.exitCode, `refine:start failed: ${startResult.stderr}`).toBe(0);

			// refine:stuck with explicit reason
			const stuckResult = runCommand(
				bin,
				[
					"refine:stuck",
					"--epic",
					"test-epic",
					"--artifact-type",
					"plan",
					"--reason",
					"manual stuck",
					"--json",
				],
				{ cwd: tmpDir },
			);
			expect(stuckResult.exitCode, `refine:stuck failed: ${stuckResult.stderr}`).toBe(0);
			const stuckOut = stuckResult.json as { ok: boolean; event: string };
			expect(stuckOut.ok).toBe(true);
			expect(stuckOut.event).toBeTruthy();

			// Verify event in log
			const eventsPath = path.join(tmpDir, ".goodplan", "epics", "test-epic", "events.jsonl");
			const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
			const events = lines.map((l) => JSON.parse(l) as { type: string });
			const types = events.map((e) => e.type);
			expect(types).toContain("refinement-circuit-breaker-tripped");
		});
	});

	it("refine:override emits convergence-overridden event", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			setupEpic(bin, tmpDir);

			// Start a round first
			runCommand(
				bin,
				["refine:start", "--epic", "test-epic", "--artifact-type", "plan", "--json"],
				{ cwd: tmpDir },
			);

			// refine:override
			const overrideResult = runCommand(
				bin,
				[
					"refine:override",
					"--epic",
					"test-epic",
					"--artifact-type",
					"plan",
					"--reason",
					"user decision",
					"--json",
				],
				{ cwd: tmpDir },
			);
			expect(overrideResult.exitCode, `refine:override failed: ${overrideResult.stderr}`).toBe(0);
			const overrideOut = overrideResult.json as { ok: boolean; event: string };
			expect(overrideOut.ok).toBe(true);

			// Verify event
			const eventsPath = path.join(tmpDir, ".goodplan", "epics", "test-epic", "events.jsonl");
			const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
			const events = lines.map((l) => JSON.parse(l) as { type: string });
			const types = events.map((e) => e.type);
			expect(types).toContain("convergence-overridden");
		});
	});

	it("refine:score fails without prior refine:start", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			setupEpic(bin, tmpDir);

			const scoreStdin = JSON.stringify({
				dimensions: [{ name: "correctness", score: 8 }],
				findings: [],
			});
			const result = runCommand(
				bin,
				[
					"refine:score",
					"--epic",
					"test-epic",
					"--artifact-type",
					"plan",
					"--reviewer",
					"test",
					"--json",
				],
				{ cwd: tmpDir, stdin: scoreStdin },
			);
			expect(result.exitCode).not.toBe(0);
			expect((result.json as { ok: boolean }).ok).toBe(false);
		});
	});

	it("refine:start auto-increments round number", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			setupEpic(bin, tmpDir);

			// Start round 1
			const r1 = runCommand(
				bin,
				["refine:start", "--epic", "test-epic", "--artifact-type", "plan", "--json"],
				{ cwd: tmpDir },
			);
			expect(r1.exitCode).toBe(0);
			expect((r1.json as { entity: string }).entity).toContain("round-1");

			// Start round 2
			const r2 = runCommand(
				bin,
				["refine:start", "--epic", "test-epic", "--artifact-type", "plan", "--json"],
				{ cwd: tmpDir },
			);
			expect(r2.exitCode).toBe(0);
			expect((r2.json as { entity: string }).entity).toContain("round-2");
		});
	});
});
