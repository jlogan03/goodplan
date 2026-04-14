import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

/**
 * Cross-entity integration test: exercises all 19 entity commands in a single
 * workflow to verify they compose correctly and produce coherent state.
 *
 * Commands covered (19):
 *   subsystem: register, list, show, update-maturity, retire
 *   project: show, set-steering
 *   briefing: write, latest
 *   finding: capture, list, triage
 *   invariant: list, check, propose, activate, deactivate
 *   events: tail, query
 */
describe("cross-entity integration", () => {
	it("all 19 entity commands work together in a single project lifecycle", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// --- 1. Init project ---
			const init = runCommand(bin, ["init", "--name", "cross-entity-test", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);

			// --- 2. Subsystem: register two subsystems ---
			const regAuth = runCommand(bin, ["subsystem:register", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					name: "auth",
					maturity: "experimental",
					owns: ["src/auth/**"],
				}),
			});
			expect(regAuth.exitCode, `subsystem:register auth failed: ${regAuth.stderr}`).toBe(0);
			expect((regAuth.json as { ok: boolean }).ok).toBe(true);

			const regEngine = runCommand(bin, ["subsystem:register", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					name: "engine",
					maturity: "stable",
					owns: ["src/engine/**"],
				}),
			});
			expect(regEngine.exitCode, `subsystem:register engine failed: ${regEngine.stderr}`).toBe(0);

			// --- 3. Subsystem: list verifies both ---
			const subList = runCommand(bin, ["subsystem:list", "--json"], { cwd: tmpDir, env });
			expect(subList.exitCode, `subsystem:list failed: ${subList.stderr}`).toBe(0);
			const subListJson = subList.json as { total: number; items: Array<{ name: string }> };
			expect(subListJson.total).toBe(2);
			const subNames = subListJson.items.map((i) => i.name).sort();
			expect(subNames).toEqual(["auth", "engine"]);

			// --- 4. Subsystem: show one ---
			const subShow = runCommand(bin, ["subsystem:show", "--name", "auth", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(subShow.exitCode, `subsystem:show failed: ${subShow.stderr}`).toBe(0);
			const subShowJson = subShow.json as { name: string; maturity: string; retired: boolean };
			expect(subShowJson.name).toBe("auth");
			expect(subShowJson.maturity).toBe("experimental");
			expect(subShowJson.retired).toBe(false);

			// --- 5. Subsystem: update-maturity ---
			const subUpdate = runCommand(bin, ["subsystem:update-maturity", "--name", "auth", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ maturity: "stable" }),
			});
			expect(subUpdate.exitCode, `subsystem:update-maturity failed: ${subUpdate.stderr}`).toBe(0);

			// --- 6. Subsystem: retire ---
			const subRetire = runCommand(bin, ["subsystem:retire", "--name", "engine", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(subRetire.exitCode, `subsystem:retire failed: ${subRetire.stderr}`).toBe(0);

			// --- 7. Project: set-steering ---
			const setSteering = runCommand(bin, ["project:set-steering", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ preference: "always-consult" }),
			});
			expect(setSteering.exitCode, `project:set-steering failed: ${setSteering.stderr}`).toBe(0);

			// --- 8. Project: show reflects subsystems + steering ---
			const projShow = runCommand(bin, ["project:show", "--json"], { cwd: tmpDir, env });
			expect(projShow.exitCode, `project:show failed: ${projShow.stderr}`).toBe(0);
			const projJson = projShow.json as {
				ok: boolean;
				name: string;
				steeringPreference: string;
				subsystems: Array<{ name: string; maturity: string; retired: boolean }>;
			};
			expect(projJson.ok).toBe(true);
			expect(projJson.name).toBe("cross-entity-test");
			expect(projJson.steeringPreference).toBe("always-consult");
			expect(projJson.subsystems).toHaveLength(2);
			// auth was updated to stable
			const authSub = projJson.subsystems.find((s) => s.name === "auth");
			expect(authSub?.maturity).toBe("stable");
			expect(authSub?.retired).toBe(false);
			// engine was retired
			const engineSub = projJson.subsystems.find((s) => s.name === "engine");
			expect(engineSub?.retired).toBe(true);

			// --- 9. Briefing: write project-scope ---
			const briefWrite = runCommand(bin, ["briefing:write", "--json", "--scope", "project"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					timeContext: "Phase 7 cross-entity test",
					currentPosition: "Midway through integration",
					lastAction: "Registered subsystems and set steering",
					whereStopped: "About to test findings",
					nextAction: "Create epic and capture findings",
					attentionItems: ["Verify events query picks up all event types"],
				}),
			});
			expect(briefWrite.exitCode, `briefing:write failed: ${briefWrite.stderr}`).toBe(0);
			expect((briefWrite.json as { ok: boolean }).ok).toBe(true);

			// --- 10. Create epic for finding/briefing epic-scope commands ---
			const epicCreate = runCommand(bin, ["epic:create", "--name", "test-epic", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(epicCreate.exitCode, `epic:create failed: ${epicCreate.stderr}`).toBe(0);

			// --- 11. Briefing: write epic-scope ---
			const briefEpic = runCommand(
				bin,
				["briefing:write", "--json", "--scope", "epic", "--epic", "test-epic"],
				{
					cwd: tmpDir,
					env,
					stdin: JSON.stringify({
						timeContext: "Epic-level briefing",
						currentPosition: "Starting epic work",
						lastAction: "Created epic",
						whereStopped: "Pre-exploration",
						nextAction: "Capture findings",
						attentionItems: [],
					}),
				},
			);
			expect(briefEpic.exitCode, `briefing:write epic failed: ${briefEpic.stderr}`).toBe(0);

			// --- 12. Briefing: latest returns project-scope briefing ---
			const briefLatest = runCommand(bin, ["briefing:latest", "--json", "--scope", "project"], {
				cwd: tmpDir,
				env,
			});
			expect(briefLatest.exitCode, `briefing:latest failed: ${briefLatest.stderr}`).toBe(0);
			const briefLatestJson = briefLatest.json as {
				ok: boolean;
				briefing: { scope: string; timeContext: string };
			};
			expect(briefLatestJson.ok).toBe(true);
			expect(briefLatestJson.briefing.scope).toBe("project");
			expect(briefLatestJson.briefing.timeContext).toBe("Phase 7 cross-entity test");

			// --- 13. Briefing: latest with epic scope ---
			const briefLatestEpic = runCommand(
				bin,
				["briefing:latest", "--json", "--scope", "epic", "--scope-ref", "test-epic"],
				{ cwd: tmpDir, env },
			);
			expect(
				briefLatestEpic.exitCode,
				`briefing:latest epic failed: ${briefLatestEpic.stderr}`,
			).toBe(0);
			const briefLatestEpicJson = briefLatestEpic.json as {
				ok: boolean;
				briefing: { scope: string; scopeRef: string };
			};
			expect(briefLatestEpicJson.briefing.scope).toBe("epic");
			expect(briefLatestEpicJson.briefing.scopeRef).toBe("test-epic");

			// --- 14. Finding: capture two findings ---
			const findCapture1 = runCommand(bin, ["finding:capture", "--json", "--epic", "test-epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					summary: "Auth module needs refactor",
					severity: "important",
					context: "Discovered during cross-entity test",
				}),
			});
			expect(findCapture1.exitCode, `finding:capture 1 failed: ${findCapture1.stderr}`).toBe(0);
			const findId1 = (findCapture1.json as { entity: string }).entity.replace("finding:", "");

			const findCapture2 = runCommand(bin, ["finding:capture", "--json", "--epic", "test-epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					summary: "Engine tests are slow",
					severity: "minor",
				}),
			});
			expect(findCapture2.exitCode, `finding:capture 2 failed: ${findCapture2.stderr}`).toBe(0);

			// --- 15. Finding: list shows both ---
			const findList = runCommand(bin, ["finding:list", "--json", "--epic", "test-epic"], {
				cwd: tmpDir,
				env,
			});
			expect(findList.exitCode, `finding:list failed: ${findList.stderr}`).toBe(0);
			const findListJson = findList.json as {
				ok: boolean;
				total: number;
				items: Array<{ summary: string; disposition: string }>;
			};
			expect(findListJson.total).toBe(2);
			// Both should be pending
			for (const item of findListJson.items) {
				expect(item.disposition).toBe("pending");
			}

			// --- 16. Finding: triage first finding ---
			const findTriage = runCommand(bin, ["finding:triage", "--json", "--epic", "test-epic"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					findingId: findId1,
					disposition: "accepted",
					reason: "Will address in next slice",
				}),
			});
			expect(findTriage.exitCode, `finding:triage failed: ${findTriage.stderr}`).toBe(0);

			// --- 17. Finding: list with status filter shows untriaged only ---
			const findListUntriaged = runCommand(
				bin,
				["finding:list", "--json", "--epic", "test-epic", "--status", "untriaged"],
				{ cwd: tmpDir, env },
			);
			expect(
				findListUntriaged.exitCode,
				`finding:list untriaged failed: ${findListUntriaged.stderr}`,
			).toBe(0);
			const untriagedJson = findListUntriaged.json as {
				total: number;
				items: Array<{ summary: string }>;
			};
			expect(untriagedJson.total).toBe(1);
			expect(untriagedJson.items[0]?.summary).toBe("Engine tests are slow");

			// --- 18. Invariant: propose + activate custom invariant ---
			const invPropose = runCommand(bin, ["invariant:propose", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					id: "custom.max-file-length",
					description: "Files should not exceed 500 lines",
					type: "custom",
				}),
			});
			expect(invPropose.exitCode, `invariant:propose failed: ${invPropose.stderr}`).toBe(0);

			const invActivate = runCommand(bin, ["invariant:activate", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ id: "custom.max-file-length" }),
			});
			expect(invActivate.exitCode, `invariant:activate failed: ${invActivate.stderr}`).toBe(0);

			// --- 19. Invariant: list includes core + custom ---
			const invList = runCommand(bin, ["invariant:list", "--json"], { cwd: tmpDir, env });
			expect(invList.exitCode, `invariant:list failed: ${invList.stderr}`).toBe(0);
			const invListJson = invList.json as {
				total: number;
				items: Array<{ id: string; type: string; active: boolean }>;
			};
			expect(invListJson.total).toBeGreaterThan(1);
			const customInv = invListJson.items.find((i) => i.id === "custom.max-file-length");
			expect(customInv).toBeDefined();
			expect(customInv?.type).toBe("custom");
			expect(customInv?.active).toBe(true);
			// Core invariants still present
			const coreItems = invListJson.items.filter((i) => i.type === "core");
			expect(coreItems.length).toBeGreaterThan(0);

			// --- 20. Invariant: check returns structured result ---
			const invCheck = runCommand(bin, ["invariant:check", "--json"], { cwd: tmpDir, env });
			expect(invCheck.exitCode, `invariant:check failed: ${invCheck.stderr}`).toBe(0);
			const invCheckJson = invCheck.json as {
				ok: boolean;
				passed: boolean;
				results: Array<{ invariantId: string; passed: boolean }>;
				violations: unknown[];
			};
			expect(invCheckJson.ok).toBe(true);
			expect(invCheckJson.results.length).toBeGreaterThan(0);

			// --- 21. Invariant: deactivate ---
			const invDeactivate = runCommand(bin, ["invariant:deactivate", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ id: "custom.max-file-length" }),
			});
			expect(invDeactivate.exitCode, `invariant:deactivate failed: ${invDeactivate.stderr}`).toBe(
				0,
			);

			// --- 22. Events: query project-scope events by type ---
			// subsystem-registered events should exist from registrations above
			const evQuery = runCommand(
				bin,
				["events:query", "--json", "--type", "subsystem-registered"],
				{ cwd: tmpDir, env },
			);
			expect(evQuery.exitCode, `events:query failed: ${evQuery.stderr}`).toBe(0);
			const evQueryJson = evQuery.json as {
				ok: boolean;
				total: number;
				items: Array<{ type: string }>;
			};
			expect(evQueryJson.ok).toBe(true);
			expect(evQueryJson.total).toBe(2); // two subsystems registered
			for (const item of evQueryJson.items) {
				expect(item.type).toBe("subsystem-registered");
			}

			// --- 23. Events: tail project-scope returns recent events ---
			const evTail = runCommand(bin, ["events:tail", "--json", "-n", "5"], {
				cwd: tmpDir,
				env,
			});
			expect(evTail.exitCode, `events:tail failed: ${evTail.stderr}`).toBe(0);
			const evTailJson = evTail.json as {
				ok: boolean;
				total: number;
				items: Array<{ type: string }>;
			};
			expect(evTailJson.ok).toBe(true);
			expect(evTailJson.total).toBe(5);
			expect(evTailJson.items.length).toBe(5);

			// --- 24. Events: query epic-scope for finding events ---
			const evEpicQuery = runCommand(
				bin,
				[
					"events:query",
					"--json",
					"--type",
					"finding-captured",
					"--scope",
					"epic",
					"--scope-ref",
					"test-epic",
				],
				{ cwd: tmpDir, env },
			);
			expect(evEpicQuery.exitCode, `events:query epic failed: ${evEpicQuery.stderr}`).toBe(0);
			const evEpicJson = evEpicQuery.json as {
				ok: boolean;
				total: number;
				items: Array<{ type: string }>;
			};
			expect(evEpicJson.ok).toBe(true);
			expect(evEpicJson.total).toBe(2); // two findings captured
			for (const item of evEpicJson.items) {
				expect(item.type).toBe("finding-captured");
			}

			// --- 25. Events: tail epic-scope ---
			const evEpicTail = runCommand(
				bin,
				["events:tail", "--json", "-n", "10", "--scope", "epic", "--scope-ref", "test-epic"],
				{ cwd: tmpDir, env },
			);
			expect(evEpicTail.exitCode, `events:tail epic failed: ${evEpicTail.stderr}`).toBe(0);
			const evEpicTailJson = evEpicTail.json as {
				ok: boolean;
				total: number;
				items: Array<{ type: string }>;
			};
			expect(evEpicTailJson.ok).toBe(true);
			expect(evEpicTailJson.total).toBeGreaterThan(0);

			// Verify the epic event log contains expected event types
			const epicEventTypes = new Set(evEpicTailJson.items.map((i) => i.type));
			expect(epicEventTypes.has("finding-captured")).toBe(true);
			expect(epicEventTypes.has("finding-triaged")).toBe(true);
		});
	});
});
