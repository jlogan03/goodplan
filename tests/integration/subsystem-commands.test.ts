import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

describe("subsystem commands", () => {
	it("register, list, show, update-maturity, retire lifecycle", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			const init = runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);

			// Register a subsystem
			const reg = runCommand(bin, ["subsystem:register", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					name: "auth",
					maturity: "experimental",
					owns: ["src/auth/**"],
				}),
			});
			expect(reg.exitCode, `register failed: ${reg.stderr}`).toBe(0);
			expect(reg.json).toBeDefined();
			const regJson = reg.json as { ok: boolean; entity: string; event: string };
			expect(regJson.ok).toBe(true);
			expect(regJson.entity).toBe("subsystem:auth");
			expect(regJson.event).toBeTruthy();

			// List subsystems
			const list = runCommand(bin, ["subsystem:list", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(list.exitCode, `list failed: ${list.stderr}`).toBe(0);
			expect(list.json).toBeDefined();
			const listJson = list.json as { total: number; items: Array<{ name: string }> };
			expect(listJson.total).toBe(1);
			expect(listJson.items[0]?.name).toBe("auth");

			// Show subsystem
			const show = runCommand(bin, ["subsystem:show", "--name", "auth", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(show.exitCode, `show failed: ${show.stderr}`).toBe(0);
			expect(show.json).toBeDefined();
			const showJson = show.json as {
				ok: boolean;
				name: string;
				maturity: string;
				owns: string[];
				retired: boolean;
			};
			expect(showJson.ok).toBe(true);
			expect(showJson.name).toBe("auth");
			expect(showJson.maturity).toBe("experimental");
			expect(showJson.owns).toEqual(["src/auth/**"]);
			expect(showJson.retired).toBe(false);

			// Update maturity
			const update = runCommand(bin, ["subsystem:update-maturity", "--name", "auth", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ maturity: "stable" }),
			});
			expect(update.exitCode, `update-maturity failed: ${update.stderr}`).toBe(0);
			expect(update.json).toBeDefined();
			const updateJson = update.json as { ok: boolean; entity: string };
			expect(updateJson.ok).toBe(true);
			expect(updateJson.entity).toBe("subsystem:auth");

			// Verify maturity updated via show
			const showAfter = runCommand(bin, ["subsystem:show", "--name", "auth", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(showAfter.exitCode).toBe(0);
			const showAfterJson = showAfter.json as { maturity: string };
			expect(showAfterJson.maturity).toBe("stable");

			// Retire
			const retire = runCommand(bin, ["subsystem:retire", "--name", "auth", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(retire.exitCode, `retire failed: ${retire.stderr}`).toBe(0);
			expect(retire.json).toBeDefined();
			const retireJson = retire.json as { ok: boolean; entity: string };
			expect(retireJson.ok).toBe(true);
			expect(retireJson.entity).toBe("subsystem:auth");

			// Verify retired via show
			const showRetired = runCommand(bin, ["subsystem:show", "--name", "auth", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(showRetired.exitCode).toBe(0);
			const showRetiredJson = showRetired.json as { retired: boolean };
			expect(showRetiredJson.retired).toBe(true);
		});
	});

	it("show returns ENTITY_NOT_FOUND for nonexistent subsystem", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			const show = runCommand(bin, ["subsystem:show", "--name", "nonexistent", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(show.exitCode).toBe(1);
			const json = show.json as { ok: boolean; code: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("ENTITY_NOT_FOUND");
		});
	});

	it("register rejects duplicate subsystem name", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			const input = JSON.stringify({
				name: "engine",
				maturity: "experimental",
				owns: ["src/engine/**"],
			});

			// First register succeeds
			const first = runCommand(bin, ["subsystem:register", "--json"], {
				cwd: tmpDir,
				env,
				stdin: input,
			});
			expect(first.exitCode).toBe(0);

			// Second register fails
			const second = runCommand(bin, ["subsystem:register", "--json"], {
				cwd: tmpDir,
				env,
				stdin: input,
			});
			expect(second.exitCode).toBe(1);
			const json = second.json as { ok: boolean; code: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("ENTITY_ALREADY_EXISTS");
		});
	});

	it("retire rejects already-retired subsystem", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			runCommand(bin, ["subsystem:register", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ name: "db", maturity: "stable", owns: ["src/db/**"] }),
			});

			// First retire succeeds
			const first = runCommand(bin, ["subsystem:retire", "--name", "db", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(first.exitCode).toBe(0);

			// Second retire fails
			const second = runCommand(bin, ["subsystem:retire", "--name", "db", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(second.exitCode).toBe(1);
			const json = second.json as { ok: boolean; code: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("ENTITY_ALREADY_RETIRED");
		});
	});
});
