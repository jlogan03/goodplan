/**
 * CLI integration tests for the v2 side-quest:* command lifecycle.
 *
 * Exercises: side-quest:create, goal-commit, plan-draft, plan-shape-approve,
 * plan-commit, implement-start, chunk-start, chunk-verify, land, abandon
 * via the compiled binary against a temp directory.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "../integration/helpers.js";

/** Dummy ContentRef for stdin payloads. */
const CONTENT_REF = {
	sha: "b".repeat(40),
	size: 200,
	path: "goal.md",
	mediaType: "text/markdown",
};

function initProject(bin: string, tmpDir: string): void {
	const init = runCommand(bin, ["init", "--name", "sq-project", "--json"], { cwd: tmpDir });
	expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);
}

describe("side-quest:* lifecycle", () => {
	it("full lifecycle: create -> goal-commit -> plan-draft -> plan-shape-approve -> plan-commit -> implement-start -> chunk-start -> chunk-verify -> land", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			// 1. side-quest:create
			const createResult = runCommand(
				bin,
				["side-quest:create", "--name", "sq-1", "--goal", "test goal", "--json"],
				{ cwd: tmpDir },
			);
			expect(createResult.exitCode, `create failed: ${createResult.stderr}`).toBe(0);
			const createOut = createResult.json as { ok: boolean; event: string; entity: string };
			expect(createOut.ok).toBe(true);
			expect(createOut.entity).toBe("side-quest:sq-1");

			// 2. side-quest:goal-commit
			const goalResult = runCommand(
				bin,
				["side-quest:goal-commit", "--side-quest", "sq-1", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ goal: CONTENT_REF }),
				},
			);
			expect(goalResult.exitCode, `goal-commit failed: ${goalResult.stderr}`).toBe(0);
			expect((goalResult.json as { ok: boolean }).ok).toBe(true);

			// 3. side-quest:plan-draft
			const planDraftResult = runCommand(
				bin,
				["side-quest:plan-draft", "--side-quest", "sq-1", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ plan: CONTENT_REF }),
				},
			);
			expect(planDraftResult.exitCode, `plan-draft failed: ${planDraftResult.stderr}`).toBe(0);
			expect((planDraftResult.json as { ok: boolean }).ok).toBe(true);

			// 4. side-quest:plan-shape-approve
			const shapeResult = runCommand(
				bin,
				["side-quest:plan-shape-approve", "--side-quest", "sq-1", "--json"],
				{ cwd: tmpDir },
			);
			expect(shapeResult.exitCode, `plan-shape-approve failed: ${shapeResult.stderr}`).toBe(0);
			expect((shapeResult.json as { ok: boolean }).ok).toBe(true);

			// 5. side-quest:plan-commit
			const planCommitResult = runCommand(
				bin,
				["side-quest:plan-commit", "--side-quest", "sq-1", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ plan: CONTENT_REF }),
				},
			);
			expect(planCommitResult.exitCode, `plan-commit failed: ${planCommitResult.stderr}`).toBe(0);
			expect((planCommitResult.json as { ok: boolean }).ok).toBe(true);

			// 6. side-quest:implement-start
			const implResult = runCommand(
				bin,
				["side-quest:implement-start", "--side-quest", "sq-1", "--json"],
				{ cwd: tmpDir },
			);
			expect(implResult.exitCode, `implement-start failed: ${implResult.stderr}`).toBe(0);
			expect((implResult.json as { ok: boolean }).ok).toBe(true);

			// 7. side-quest:chunk-start
			const chunkStartResult = runCommand(
				bin,
				["side-quest:chunk-start", "--side-quest", "sq-1", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ chunkId: "chunk-1", description: "First chunk" }),
				},
			);
			expect(chunkStartResult.exitCode, `chunk-start failed: ${chunkStartResult.stderr}`).toBe(0);
			const chunkOut = chunkStartResult.json as { ok: boolean; entity: string };
			expect(chunkOut.ok).toBe(true);
			expect(chunkOut.entity).toContain("chunk:chunk-1");

			// 8. side-quest:chunk-verify
			const chunkVerifyResult = runCommand(
				bin,
				["side-quest:chunk-verify", "--side-quest", "sq-1", "--json"],
				{
					cwd: tmpDir,
					stdin: JSON.stringify({ chunkId: "chunk-1", evidence: "Tests pass" }),
				},
			);
			expect(chunkVerifyResult.exitCode, `chunk-verify failed: ${chunkVerifyResult.stderr}`).toBe(
				0,
			);
			expect((chunkVerifyResult.json as { ok: boolean }).ok).toBe(true);

			// 9. side-quest:land
			const landResult = runCommand(bin, ["side-quest:land", "--side-quest", "sq-1", "--json"], {
				cwd: tmpDir,
			});
			expect(landResult.exitCode, `land failed: ${landResult.stderr}`).toBe(0);
			expect((landResult.json as { ok: boolean }).ok).toBe(true);

			// Verify events.jsonl exists and has correct event count
			const eventsPath = path.join(tmpDir, ".goodplan", "side-quests", "sq-1", "events.jsonl");
			expect(fs.existsSync(eventsPath)).toBe(true);
			const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
			// 9 commands = 9 events
			expect(lines.length).toBe(9);

			const events = lines.map((l) => JSON.parse(l) as { type: string });
			const types = events.map((e) => e.type);
			expect(types).toContain("side-quest-created");
			expect(types).toContain("side-quest-goal-committed");
			expect(types).toContain("side-quest-plan-drafted");
			expect(types).toContain("side-quest-plan-shape-approved");
			expect(types).toContain("side-quest-plan-committed");
			expect(types).toContain("side-quest-implementation-started");
			expect(types).toContain("side-quest-chunk-started");
			expect(types).toContain("side-quest-chunk-verified");
			expect(types).toContain("side-quest-landed");
		});
	});

	it("side-quest:abandon emits abandoned event", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			// Create sq-2
			const createResult = runCommand(
				bin,
				["side-quest:create", "--name", "sq-2", "--goal", "will abandon", "--json"],
				{ cwd: tmpDir },
			);
			expect(createResult.exitCode, `create sq-2 failed: ${createResult.stderr}`).toBe(0);

			// Abandon
			const abandonResult = runCommand(
				bin,
				["side-quest:abandon", "--side-quest", "sq-2", "--reason", "not needed", "--json"],
				{ cwd: tmpDir },
			);
			expect(abandonResult.exitCode, `abandon failed: ${abandonResult.stderr}`).toBe(0);
			const abandonOut = abandonResult.json as { ok: boolean; event: string; entity: string };
			expect(abandonOut.ok).toBe(true);
			expect(abandonOut.entity).toBe("side-quest:sq-2");

			// Verify events
			const eventsPath = path.join(tmpDir, ".goodplan", "side-quests", "sq-2", "events.jsonl");
			const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
			expect(lines.length).toBe(2); // created + abandoned
			const events = lines.map((l) => JSON.parse(l) as { type: string });
			expect(events[1]?.type).toBe("side-quest-abandoned");
		});
	});

	it("side-quest:create fails without --name", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			const result = runCommand(bin, ["side-quest:create", "--goal", "no name", "--json"], {
				cwd: tmpDir,
			});
			expect(result.exitCode).not.toBe(0);
		});
	});
});
