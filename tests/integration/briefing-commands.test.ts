import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

describe("briefing commands", () => {
	it("write and latest lifecycle — project scope", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			const init = runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);

			// Latest with no briefings
			const emptyLatest = runCommand(bin, ["briefing:latest", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(emptyLatest.exitCode, `latest failed: ${emptyLatest.stderr}`).toBe(0);
			expect(emptyLatest.json).toBeDefined();
			const emptyJson = emptyLatest.json as { ok: boolean; briefing: null };
			expect(emptyJson.ok).toBe(true);
			expect(emptyJson.briefing).toBeNull();

			// Write a project-scope briefing
			const write1 = runCommand(bin, ["briefing:write", "--json", "--scope", "project"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					timeContext: "1h into Phase 1",
					currentPosition: "Phase 1 Task 3",
					lastAction: "Completed schema setup",
					whereStopped: "Starting reducer implementation",
					nextAction: "Implement reduceBriefing",
					attentionItems: ["Need to verify deepLinks handling"],
				}),
			});
			expect(write1.exitCode, `write failed: ${write1.stderr}`).toBe(0);
			expect(write1.json).toBeDefined();
			const write1Json = write1.json as { ok: boolean; event: string; entity: string };
			expect(write1Json.ok).toBe(true);
			expect(write1Json.event).toBeTruthy();
			expect(write1Json.entity).toBe("briefing:project");

			// Latest should return the briefing
			const latest1 = runCommand(bin, ["briefing:latest", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(latest1.exitCode, `latest failed: ${latest1.stderr}`).toBe(0);
			expect(latest1.json).toBeDefined();
			const latest1Json = latest1.json as {
				ok: boolean;
				briefing: {
					scope: string;
					scopeRef: string | null;
					timeContext: string;
					currentPosition: string;
					lastAction: string;
					whereStopped: string;
					nextAction: string;
					attentionItems: string[];
					writtenAt: string;
				};
			};
			expect(latest1Json.ok).toBe(true);
			expect(latest1Json.briefing).not.toBeNull();
			expect(latest1Json.briefing.scope).toBe("project");
			expect(latest1Json.briefing.scopeRef).toBeNull();
			expect(latest1Json.briefing.timeContext).toBe("1h into Phase 1");
			expect(latest1Json.briefing.currentPosition).toBe("Phase 1 Task 3");
			expect(latest1Json.briefing.attentionItems).toEqual(["Need to verify deepLinks handling"]);

			// Write a second briefing — latest should return the newer one
			const write2 = runCommand(bin, ["briefing:write", "--json", "--scope", "project"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					timeContext: "2h into Phase 1",
					currentPosition: "Phase 1 Task 5",
					lastAction: "Finished reducer",
					whereStopped: "Starting commands",
					nextAction: "Create write.ts",
					attentionItems: [],
					deepLinks: [{ label: "reducer", path: "src/reducers.ts" }],
				}),
			});
			expect(write2.exitCode, `write2 failed: ${write2.stderr}`).toBe(0);

			const latest2 = runCommand(bin, ["briefing:latest", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(latest2.exitCode, `latest2 failed: ${latest2.stderr}`).toBe(0);
			const latest2Json = latest2.json as {
				ok: boolean;
				briefing: {
					timeContext: string;
					deepLinks: Array<{ label: string; path: string }>;
				};
			};
			expect(latest2Json.briefing.timeContext).toBe("2h into Phase 1");
			expect(latest2Json.briefing.deepLinks).toEqual([
				{ label: "reducer", path: "src/reducers.ts" },
			]);
		});
	});

	it("write and latest lifecycle — epic scope", async () => {
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

			// Write epic-scope briefing
			const write = runCommand(
				bin,
				["briefing:write", "--json", "--scope", "epic", "--epic", "my-epic"],
				{
					cwd: tmpDir,
					env,
					stdin: JSON.stringify({
						timeContext: "30m into Phase 2",
						currentPosition: "Phase 2 Task 1",
						lastAction: "Created epic",
						whereStopped: "Starting exploration",
						nextAction: "Run explore-start",
						attentionItems: ["Check dependency graph"],
					}),
				},
			);
			expect(write.exitCode, `write failed: ${write.stderr}`).toBe(0);
			expect(write.json).toBeDefined();
			const writeJson = write.json as { ok: boolean; entity: string };
			expect(writeJson.ok).toBe(true);
			expect(writeJson.entity).toBe("briefing:my-epic");

			// Latest with epic scope filter
			const latest = runCommand(
				bin,
				["briefing:latest", "--json", "--scope", "epic", "--scope-ref", "my-epic"],
				{ cwd: tmpDir, env },
			);
			expect(latest.exitCode, `latest failed: ${latest.stderr}`).toBe(0);
			const latestJson = latest.json as {
				ok: boolean;
				briefing: { scope: string; scopeRef: string; timeContext: string };
			};
			expect(latestJson.ok).toBe(true);
			expect(latestJson.briefing.scope).toBe("epic");
			expect(latestJson.briefing.scopeRef).toBe("my-epic");
			expect(latestJson.briefing.timeContext).toBe("30m into Phase 2");
		});
	});

	it("write with missing --epic when scope=epic returns error", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			const init = runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);

			const write = runCommand(bin, ["briefing:write", "--json", "--scope", "epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					timeContext: "test",
					currentPosition: "test",
					lastAction: "test",
					whereStopped: "test",
					nextAction: "test",
					attentionItems: [],
				}),
			});
			expect(write.exitCode).toBe(1);
			expect(write.json).toBeDefined();
			const writeJson = write.json as { ok: boolean; code: string };
			expect(writeJson.ok).toBe(false);
			expect(writeJson.code).toBe("VALIDATION_INVALID_INPUT");
		});
	});
});
