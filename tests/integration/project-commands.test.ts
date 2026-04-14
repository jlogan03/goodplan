import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

describe("project commands", () => {
	it("show returns project metadata with defaults after init", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			const init = runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);

			// Show project
			const show = runCommand(bin, ["project:show", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(show.exitCode, `show failed: ${show.stderr}`).toBe(0);
			expect(show.json).toBeDefined();
			const showJson = show.json as {
				ok: boolean;
				name: string;
				steeringPreference: string;
				initialized: boolean;
				subsystems: Array<{ name: string }>;
			};
			expect(showJson.ok).toBe(true);
			expect(showJson.name).toBe("test-project");
			expect(showJson.steeringPreference).toBe("best-guess-and-flag");
			expect(showJson.initialized).toBe(true);
			expect(showJson.subsystems).toEqual([]);
		});
	});

	it("set-steering updates preference, show reflects change", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
				env,
			});

			// Set steering preference
			const setSteering = runCommand(bin, ["project:set-steering", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ preference: "always-consult" }),
			});
			expect(setSteering.exitCode, `set-steering failed: ${setSteering.stderr}`).toBe(0);
			expect(setSteering.json).toBeDefined();
			const setJson = setSteering.json as { ok: boolean; event: string; entity: string };
			expect(setJson.ok).toBe(true);
			expect(setJson.entity).toBe("project");
			expect(setJson.event).toBeTruthy();

			// Verify show reflects the updated preference
			const show = runCommand(bin, ["project:show", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(show.exitCode).toBe(0);
			const showJson = show.json as { steeringPreference: string };
			expect(showJson.steeringPreference).toBe("always-consult");
		});
	});

	it("set-steering rejects invalid preference", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			const result = runCommand(bin, ["project:set-steering", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ preference: "invalid-pref" }),
			});
			expect(result.exitCode).toBe(1);
			const json = result.json as { ok: boolean; code: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("VALIDATION_INVALID_INPUT");
		});
	});

	it("show includes subsystems when registered", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			// Register a subsystem
			runCommand(bin, ["subsystem:register", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					name: "auth",
					maturity: "experimental",
					owns: ["src/auth/**"],
				}),
			});

			// Show includes subsystem
			const show = runCommand(bin, ["project:show", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(show.exitCode).toBe(0);
			const showJson = show.json as {
				subsystems: Array<{ name: string; maturity: string; retired: boolean }>;
			};
			expect(showJson.subsystems).toHaveLength(1);
			expect(showJson.subsystems[0]?.name).toBe("auth");
			expect(showJson.subsystems[0]?.maturity).toBe("experimental");
			expect(showJson.subsystems[0]?.retired).toBe(false);
		});
	});
});
