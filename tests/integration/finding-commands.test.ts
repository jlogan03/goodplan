import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

describe("finding commands", () => {
	it("capture, list, triage lifecycle", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			const init = runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);

			// Create epic
			const createEpic = runCommand(bin, ["epic:create", "--name", "my-epic", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(createEpic.exitCode, `epic:create failed: ${createEpic.stderr}`).toBe(0);

			// Capture a finding
			const capture = runCommand(bin, ["finding:capture", "--json", "--epic", "my-epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					summary: "Auth module needs refactor",
					severity: "important",
					context: "Discovered during chunk 3",
				}),
			});
			expect(capture.exitCode, `capture failed: ${capture.stderr}`).toBe(0);
			expect(capture.json).toBeDefined();
			const captureJson = capture.json as { ok: boolean; event: string; entity: string };
			expect(captureJson.ok).toBe(true);
			expect(captureJson.event).toBeTruthy();
			expect(captureJson.entity).toMatch(/^finding:/);

			// Extract finding ID from entity
			const findingId = captureJson.entity.replace("finding:", "");

			// List findings — should show 1
			const list1 = runCommand(bin, ["finding:list", "--json", "--epic", "my-epic"], {
				cwd: tmpDir,
				env,
			});
			expect(list1.exitCode, `list failed: ${list1.stderr}`).toBe(0);
			expect(list1.json).toBeDefined();
			const list1Json = list1.json as {
				ok: boolean;
				total: number;
				items: Array<{ id: string; summary: string; disposition: string }>;
			};
			expect(list1Json.ok).toBe(true);
			expect(list1Json.total).toBe(1);
			expect(list1Json.items[0]?.summary).toBe("Auth module needs refactor");
			expect(list1Json.items[0]?.disposition).toBe("pending");

			// Triage the finding
			const triage = runCommand(bin, ["finding:triage", "--json", "--epic", "my-epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					findingId,
					disposition: "accepted",
					reason: "Will address in next slice",
				}),
			});
			expect(triage.exitCode, `triage failed: ${triage.stderr}`).toBe(0);
			expect(triage.json).toBeDefined();
			const triageJson = triage.json as { ok: boolean; event: string; entity: string };
			expect(triageJson.ok).toBe(true);
			expect(triageJson.entity).toBe(`finding:${findingId}`);

			// List findings — disposition should be updated
			const list2 = runCommand(bin, ["finding:list", "--json", "--epic", "my-epic"], {
				cwd: tmpDir,
				env,
			});
			expect(list2.exitCode, `list2 failed: ${list2.stderr}`).toBe(0);
			const list2Json = list2.json as {
				ok: boolean;
				total: number;
				items: Array<{ id: string; disposition: string }>;
			};
			expect(list2Json.ok).toBe(true);
			expect(list2Json.total).toBe(1);
			expect(list2Json.items[0]?.disposition).toBe("accepted");
		});
	});

	it("triage nonexistent finding returns ENTITY_NOT_FOUND", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project + create epic
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir, env });
			runCommand(bin, ["epic:create", "--name", "my-epic", "--json"], { cwd: tmpDir, env });

			const fakeFindingId = randomUUID();
			const triage = runCommand(bin, ["finding:triage", "--json", "--epic", "my-epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					findingId: fakeFindingId,
					disposition: "dismissed",
					reason: "Not relevant",
				}),
			});
			expect(triage.exitCode).toBe(1);
			expect(triage.json).toBeDefined();
			const triageJson = triage.json as { ok: boolean; code: string };
			expect(triageJson.ok).toBe(false);
			expect(triageJson.code).toBe("ENTITY_NOT_FOUND");
		});
	});

	it("list --status=untriaged filters correctly after triaging", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project + create epic
			runCommand(bin, ["init", "--name", "test-project", "--json"], { cwd: tmpDir, env });
			runCommand(bin, ["epic:create", "--name", "my-epic", "--json"], { cwd: tmpDir, env });

			// Capture two findings
			const capture1 = runCommand(bin, ["finding:capture", "--json", "--epic", "my-epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					summary: "Finding A",
					severity: "minor",
				}),
			});
			expect(capture1.exitCode, `capture1 failed: ${capture1.stderr}`).toBe(0);
			const capture1Json = capture1.json as { entity: string };
			const findingId1 = capture1Json.entity.replace("finding:", "");

			const capture2 = runCommand(bin, ["finding:capture", "--json", "--epic", "my-epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					summary: "Finding B",
					severity: "critical",
					classification: { blocking: false, inScope: true },
					relatedSubsystems: ["auth"],
				}),
			});
			expect(capture2.exitCode, `capture2 failed: ${capture2.stderr}`).toBe(0);

			// Triage first finding
			const triage = runCommand(bin, ["finding:triage", "--json", "--epic", "my-epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					findingId: findingId1,
					disposition: "deferred",
					reason: "Will handle later",
				}),
			});
			expect(triage.exitCode, `triage failed: ${triage.stderr}`).toBe(0);

			// List untriaged — should only show Finding B
			const listUntriaged = runCommand(
				bin,
				["finding:list", "--json", "--epic", "my-epic", "--status", "untriaged"],
				{ cwd: tmpDir, env },
			);
			expect(listUntriaged.exitCode, `list untriaged failed: ${listUntriaged.stderr}`).toBe(0);
			const untriagedJson = listUntriaged.json as {
				ok: boolean;
				total: number;
				items: Array<{ summary: string; disposition: string }>;
			};
			expect(untriagedJson.ok).toBe(true);
			expect(untriagedJson.total).toBe(1);
			expect(untriagedJson.items[0]?.summary).toBe("Finding B");
			expect(untriagedJson.items[0]?.disposition).toBe("pending");

			// List deferred — should only show Finding A
			const listDeferred = runCommand(
				bin,
				["finding:list", "--json", "--epic", "my-epic", "--status", "deferred"],
				{ cwd: tmpDir, env },
			);
			expect(listDeferred.exitCode, `list deferred failed: ${listDeferred.stderr}`).toBe(0);
			const deferredJson = listDeferred.json as {
				ok: boolean;
				total: number;
				items: Array<{ summary: string; disposition: string }>;
			};
			expect(deferredJson.ok).toBe(true);
			expect(deferredJson.total).toBe(1);
			expect(deferredJson.items[0]?.summary).toBe("Finding A");
			expect(deferredJson.items[0]?.disposition).toBe("deferred");
		});
	});
});
