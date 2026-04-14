/**
 * CLI integration smoke test.
 *
 * Exercises the full init -> status -> schema flow end-to-end
 * by spawning the compiled binary against a temp directory.
 *
 * Depends on globalSetup (tests/global-setup.ts) to build the plugin binary.
 */

import * as fs from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "../integration/helpers.js";

describe("CLI smoke test: init -> status -> schema", () => {
	it("full init -> status -> schema flow", async () => {
		await withTempDir(async (tmpDir, _env) => {
			const bin = buildBinary();

			// 1. gp init --name smoke-test --json
			const initResult = runCommand(bin, ["init", "--name", "smoke-test", "--json"], {
				cwd: tmpDir,
			});
			expect(initResult.exitCode, `init failed: ${initResult.stderr}`).toBe(0);
			expect(initResult.json).toBeDefined();

			const initOutput = initResult.json as { ok: boolean; event: string; entity: string };
			expect(initOutput.ok).toBe(true);
			expect(initOutput.event).toBeTruthy();
			expect(initOutput.entity).toBe("project");

			// 2. Verify events.jsonl exists with exactly 1 line
			const eventsPath = `${tmpDir}/.goodplan/events.jsonl`;
			expect(fs.existsSync(eventsPath)).toBe(true);
			const eventsContent = fs.readFileSync(eventsPath, "utf-8").trim();
			const eventLines = eventsContent.split("\n");
			expect(eventLines.length).toBe(1);

			// 3. Parse the event line, verify type === "project-initialized"
			const event = JSON.parse(eventLines[0] as string) as { type: string };
			expect(event.type).toBe("project-initialized");

			// 4. gp status --json
			const statusResult = runCommand(bin, ["status", "--json"], { cwd: tmpDir });
			expect(statusResult.exitCode, `status failed: ${statusResult.stderr}`).toBe(0);
			expect(statusResult.json).toBeDefined();

			const statusOutput = statusResult.json as {
				project: { name: string };
				activeEpic: unknown;
				activeSlice: unknown;
				recommendations: unknown[];
			};
			expect(statusOutput.project.name).toBe("smoke-test");
			expect(statusOutput.activeEpic).toBeNull();
			expect(statusOutput.activeSlice).toBeNull();
			expect(Array.isArray(statusOutput.recommendations)).toBe(true);

			// 5. gp status --json --query '.project.name'
			const queryResult = runCommand(bin, ["status", "--json", "--query", ".project.name"], {
				cwd: tmpDir,
			});
			expect(queryResult.exitCode, `status --query failed: ${queryResult.stderr}`).toBe(0);
			const queryOutput = JSON.parse(queryResult.stdout.trim());
			expect(queryOutput).toBe("smoke-test");

			// 6. gp schema --json
			const schemaResult = runCommand(bin, ["schema", "--json"], { cwd: tmpDir });
			expect(schemaResult.exitCode, `schema failed: ${schemaResult.stderr}`).toBe(0);
			expect(schemaResult.json).toBeDefined();

			const schemaOutput = schemaResult.json as {
				commands: Array<{ name: string; description: string; args: Record<string, unknown> }>;
			};
			expect(Array.isArray(schemaOutput.commands)).toBe(true);

			// Verify v2 commands are present
			const commandNames = schemaOutput.commands.map((c) => c.name);
			expect(commandNames).toContain("init");
			expect(commandNames).toContain("status");
			expect(commandNames).toContain("schema");

			// 7. gp schema --command init --json
			const schemaInitResult = runCommand(bin, ["schema", "--command", "init", "--json"], {
				cwd: tmpDir,
			});
			expect(
				schemaInitResult.exitCode,
				`schema --command init failed: ${schemaInitResult.stderr}`,
			).toBe(0);
			expect(schemaInitResult.json).toBeDefined();

			const initDetail = schemaInitResult.json as {
				name: string;
				description: string;
				args: Record<string, unknown>;
			};
			expect(initDetail.name).toBe("init");
			expect(initDetail.description).toBeTruthy();
			expect(initDetail.args).toHaveProperty("name");

			// 8. gp migrate --json (should detect v2 project after init)
			const migrateResult = runCommand(bin, ["migrate", "--json"], { cwd: tmpDir });
			expect(migrateResult.exitCode, `migrate failed: ${migrateResult.stderr}`).toBe(0);
			expect(migrateResult.json).toBeDefined();

			const migrateOutput = migrateResult.json as {
				version: string;
				indicators: string[];
				message: string;
			};
			expect(migrateOutput.version).toBe("v2");
			expect(migrateOutput.indicators).toContain("events.jsonl");
			expect(migrateOutput.message).toContain("Already a v2 project");

			// 9. gp init --name dupe --json (should fail -- project already exists)
			const dupeResult = runCommand(bin, ["init", "--name", "dupe", "--json"], {
				cwd: tmpDir,
			});
			expect(dupeResult.exitCode).not.toBe(0);

			// Error output should contain ALREADY code
			const dupeOutput = dupeResult.stdout + dupeResult.stderr;
			expect(dupeOutput).toContain("ALREADY");
		});
	});

	it("gp schema --events --json returns event catalog", async () => {
		await withTempDir(async (tmpDir, _env) => {
			const bin = buildBinary();

			const result = runCommand(bin, ["schema", "--events", "--json"], { cwd: tmpDir });
			expect(result.exitCode, `schema --events failed: ${result.stderr}`).toBe(0);
			expect(result.json).toBeDefined();

			const eventsOutput = result.json as {
				events: Array<{ type: string; payloadSchema: Record<string, unknown> }>;
			};
			expect(Array.isArray(eventsOutput.events)).toBe(true);
			expect(eventsOutput.events.length).toBeGreaterThan(0);

			// Verify project-initialized is present
			const projectInit = eventsOutput.events.find((e) => e.type === "project-initialized");
			expect(projectInit).toBeDefined();
			expect(projectInit?.payloadSchema).toBeDefined();
			expect(projectInit?.payloadSchema.type).toBe("object");
		});
	});
});
