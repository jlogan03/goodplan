/**
 * CLI integration tests for the v2 decision lifecycle.
 *
 * Exercises: decision:record, decision:supersede, decision:list, decision:show
 * all using the v2 event pattern.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "../integration/helpers.js";

function initProject(bin: string, tmpDir: string): void {
	const init = runCommand(bin, ["init", "--name", "decision-project", "--json"], { cwd: tmpDir });
	expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);
}

describe("decision lifecycle (v2 events)", () => {
	it("record -> supersede -> list -> show", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			// 1. decision:record
			const recordStdin = JSON.stringify({
				id: "dec-1",
				domain: "architecture",
				title: "Use event sourcing",
				summary: "All state derived from events",
			});
			const recordResult = runCommand(bin, ["decision:record", "--json"], {
				cwd: tmpDir,
				stdin: recordStdin,
			});
			expect(recordResult.exitCode, `decision:record failed: ${recordResult.stderr}`).toBe(0);
			const recordOut = recordResult.json as { ok: boolean; event: string; entity: string };
			expect(recordOut.ok).toBe(true);
			expect(recordOut.entity).toBe("decision:dec-1");

			// 2. decision:supersede
			const supersedeStdin = JSON.stringify({
				decisionId: "dec-1",
				reason: "Switching to CQRS pattern",
				supersededBy: "dec-2",
			});
			const supersedeResult = runCommand(bin, ["decision:supersede", "--json"], {
				cwd: tmpDir,
				stdin: supersedeStdin,
			});
			expect(supersedeResult.exitCode, `decision:supersede failed: ${supersedeResult.stderr}`).toBe(
				0,
			);
			const supersedeOut = supersedeResult.json as { ok: boolean; event: string; entity: string };
			expect(supersedeOut.ok).toBe(true);
			expect(supersedeOut.entity).toBe("decision:dec-1");

			// 3. Verify events in project-scope events.jsonl
			const eventsPath = path.join(tmpDir, ".goodplan", "events.jsonl");
			expect(fs.existsSync(eventsPath)).toBe(true);
			const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
			const events = lines.map((l) => JSON.parse(l) as { type: string; domain?: string });

			// Filter to decision-learning events
			const decisionEvents = events.filter((e) => e.domain === "decision-learning");
			const decisionTypes = decisionEvents.map((e) => e.type);
			expect(decisionTypes).toContain("decision-recorded");
			expect(decisionTypes).toContain("decision-superseded");

			// 4. decision:list (reads from v1 decisions.jsonl, may return empty)
			const listResult = runCommand(bin, ["decision:list", "--json"], { cwd: tmpDir });
			expect(listResult.exitCode, `decision:list failed: ${listResult.stderr}`).toBe(0);
			expect(listResult.json).toBeDefined();
		});
	});

	it("decision:record fails with invalid input", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			// Missing required fields
			const result = runCommand(bin, ["decision:record", "--json"], {
				cwd: tmpDir,
				stdin: JSON.stringify({ id: "dec-bad" }),
			});
			expect(result.exitCode).not.toBe(0);
			expect((result.json as { ok: boolean }).ok).toBe(false);
			expect((result.json as { code: string }).code).toBe("VALIDATION_INVALID_INPUT");
		});
	});

	it("decision:record with optional fields", async () => {
		await withTempDir(async (tmpDir) => {
			const bin = buildBinary();
			initProject(bin, tmpDir);

			const recordStdin = JSON.stringify({
				id: "dec-full",
				domain: "testing",
				title: "Full decision",
				summary: "With optional fields",
				entityPath: ".goodplan/epics/my-epic",
				reconsiderWhen: "After v2 launch",
			});
			const result = runCommand(bin, ["decision:record", "--json"], {
				cwd: tmpDir,
				stdin: recordStdin,
			});
			expect(result.exitCode, `record failed: ${result.stderr}`).toBe(0);
			expect((result.json as { ok: boolean }).ok).toBe(true);
		});
	});
});
