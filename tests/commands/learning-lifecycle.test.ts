/**
 * CLI integration tests for the v2 learning lifecycle.
 *
 * Exercises: learning:capture, learning:promote, learning:list
 * all using the v2 event pattern.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "../integration/helpers.js";

function initProject(bin: string, tmpDir: string): void {
	const init = runCommand(bin, ["init", "--name", "learning-project", "--json"], { cwd: tmpDir });
	expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);
}

describe("learning lifecycle (v2 events)", () => {
	it("capture -> list -> promote", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			// 1. learning:capture
			const captureStdin = JSON.stringify({
				summary: "Event sourcing simplifies state management",
				scope: "epic",
				tags: ["architecture", "events"],
			});
			const captureResult = runCommand(bin, ["learning:capture", "--json"], {
				cwd: tmpDir,
				stdin: captureStdin,
			});
			expect(captureResult.exitCode, `learning:capture failed: ${captureResult.stderr}`).toBe(0);
			const captureOut = captureResult.json as { ok: boolean; event: string; entity: string };
			expect(captureOut.ok).toBe(true);
			expect(captureOut.entity).toBe("learning");

			// 2. learning:list
			const listResult = runCommand(bin, ["learning:list", "--json"], { cwd: tmpDir });
			expect(listResult.exitCode, `learning:list failed: ${listResult.stderr}`).toBe(0);
			expect(listResult.json).toBeDefined();

			// 3. learning:promote
			const promoteStdin = JSON.stringify({
				learningId: "learning-1",
				from: "slice",
				to: "epic",
			});
			const promoteResult = runCommand(bin, ["learning:promote", "--json"], {
				cwd: tmpDir,
				stdin: promoteStdin,
			});
			expect(promoteResult.exitCode, `learning:promote failed: ${promoteResult.stderr}`).toBe(0);
			const promoteOut = promoteResult.json as { ok: boolean; event: string; entity: string };
			expect(promoteOut.ok).toBe(true);
			expect(promoteOut.entity).toBe("learning:learning-1");

			// 4. Verify events in project-scope events.jsonl
			const eventsPath = path.join(tmpDir, ".goodplan", "events.jsonl");
			expect(fs.existsSync(eventsPath)).toBe(true);
			const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
			const events = lines.map((l) => JSON.parse(l) as { type: string; domain?: string });

			// Filter to decision-learning events
			const learningEvents = events.filter((e) => e.domain === "decision-learning");
			const learningTypes = learningEvents.map((e) => e.type);
			expect(learningTypes).toContain("learning-captured");
			expect(learningTypes).toContain("learning-promoted");
		});
	});

	it("learning:capture with minimal input (just summary)", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			const captureStdin = JSON.stringify({
				summary: "Minimal learning",
			});
			const result = runCommand(bin, ["learning:capture", "--json"], {
				cwd: tmpDir,
				stdin: captureStdin,
			});
			expect(result.exitCode, `capture failed: ${result.stderr}`).toBe(0);
			expect((result.json as { ok: boolean }).ok).toBe(true);
		});
	});

	it("learning:capture fails with empty summary", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			const result = runCommand(bin, ["learning:capture", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({}),
			});
			expect(result.exitCode).not.toBe(0);
			expect((result.json as { ok: boolean }).ok).toBe(false);
		});
	});

	it("learning:promote fails with invalid input", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			// Missing required fields
			const result = runCommand(bin, ["learning:promote", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ learningId: "l-1" }),
			});
			expect(result.exitCode).not.toBe(0);
			expect((result.json as { ok: boolean }).ok).toBe(false);
		});
	});
});
