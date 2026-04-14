import { describe, expect, it } from "vitest";
import { buildBinary, runCommand, withTempDir } from "./helpers.js";

describe("invariant commands", () => {
	it("list shows core invariants on fresh project", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();

			// Init project
			const init = runCommand(bin, ["init", "--name", "test-project", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(init.exitCode, `init failed: ${init.stderr}`).toBe(0);

			// List invariants — should show core rules
			const list = runCommand(bin, ["invariant:list", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(list.exitCode, `list failed: ${list.stderr}`).toBe(0);
			expect(list.json).toBeDefined();
			const listJson = list.json as {
				total: number;
				items: Array<{ id: string; type: string; active: boolean }>;
			};
			expect(listJson.total).toBeGreaterThan(0);
			// All core invariants should be active
			const coreItems = listJson.items.filter((i) => i.type === "core");
			expect(coreItems.length).toBeGreaterThan(0);
			for (const item of coreItems) {
				expect(item.active).toBe(true);
			}
		});
	});

	it("check passes on fresh project", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			const check = runCommand(bin, ["invariant:check", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(check.exitCode, `check failed: ${check.stderr}`).toBe(0);
			expect(check.json).toBeDefined();
			const checkJson = check.json as {
				ok: boolean;
				passed: boolean;
				results: Array<{ invariantId: string; passed: boolean; message: string }>;
				violations: unknown[];
			};
			expect(checkJson.ok).toBe(true);
			expect(checkJson.passed).toBe(true);
			expect(checkJson.results.length).toBeGreaterThan(0);
			expect(checkJson.violations).toEqual([]);
		});
	});

	it("propose, list, activate, list, deactivate, list lifecycle", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			// Propose a custom invariant
			const propose = runCommand(bin, ["invariant:propose", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					id: "custom.no-large-files",
					description: "Files should not exceed 500 lines",
					type: "custom",
				}),
			});
			expect(propose.exitCode, `propose failed: ${propose.stderr}`).toBe(0);
			expect(propose.json).toBeDefined();
			const proposeJson = propose.json as { ok: boolean; entity: string; event: string };
			expect(proposeJson.ok).toBe(true);
			expect(proposeJson.entity).toBe("invariant:custom.no-large-files");
			expect(proposeJson.event).toBeTruthy();

			// List — should include the proposed custom invariant (inactive because proposed, not activated)
			const list1 = runCommand(bin, ["invariant:list", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(list1.exitCode).toBe(0);
			const list1Json = list1.json as {
				items: Array<{ id: string; type: string; active: boolean }>;
			};
			const custom1 = list1Json.items.find((i) => i.id === "custom.no-large-files");
			expect(custom1).toBeDefined();
			expect(custom1?.type).toBe("custom");
			expect(custom1?.active).toBe(false);

			// Activate
			const activate = runCommand(bin, ["invariant:activate", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ id: "custom.no-large-files" }),
			});
			expect(activate.exitCode, `activate failed: ${activate.stderr}`).toBe(0);
			const activateJson = activate.json as { ok: boolean; entity: string };
			expect(activateJson.ok).toBe(true);
			expect(activateJson.entity).toBe("invariant:custom.no-large-files");

			// List — should show active
			const list2 = runCommand(bin, ["invariant:list", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(list2.exitCode).toBe(0);
			const list2Json = list2.json as { items: Array<{ id: string; active: boolean }> };
			const custom2 = list2Json.items.find((i) => i.id === "custom.no-large-files");
			expect(custom2?.active).toBe(true);

			// Deactivate
			const deactivate = runCommand(bin, ["invariant:deactivate", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ id: "custom.no-large-files" }),
			});
			expect(deactivate.exitCode, `deactivate failed: ${deactivate.stderr}`).toBe(0);
			const deactivateJson = deactivate.json as { ok: boolean; entity: string };
			expect(deactivateJson.ok).toBe(true);
			expect(deactivateJson.entity).toBe("invariant:custom.no-large-files");

			// List — should show inactive
			const list3 = runCommand(bin, ["invariant:list", "--json"], {
				cwd: tmpDir,
				env,
			});
			expect(list3.exitCode).toBe(0);
			const list3Json = list3.json as { items: Array<{ id: string; active: boolean }> };
			const custom3 = list3Json.items.find((i) => i.id === "custom.no-large-files");
			expect(custom3?.active).toBe(false);
		});
	});

	it("activate nonexistent returns ENTITY_NOT_FOUND", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			const activate = runCommand(bin, ["invariant:activate", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ id: "nonexistent" }),
			});
			expect(activate.exitCode).toBe(1);
			const json = activate.json as { ok: boolean; code: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("ENTITY_NOT_FOUND");
		});
	});

	it("deactivate nonexistent returns ENTITY_NOT_FOUND", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			const deactivate = runCommand(bin, ["invariant:deactivate", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ id: "nonexistent" }),
			});
			expect(deactivate.exitCode).toBe(1);
			const json = deactivate.json as { ok: boolean; code: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("ENTITY_NOT_FOUND");
		});
	});

	it("propose rejects duplicate invariant ID", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			const input = JSON.stringify({
				id: "custom.dup",
				description: "Test duplicate",
				type: "custom",
			});

			// First propose succeeds
			const first = runCommand(bin, ["invariant:propose", "--json"], {
				cwd: tmpDir,
				env,
				stdin: input,
			});
			expect(first.exitCode).toBe(0);

			// Second propose fails
			const second = runCommand(bin, ["invariant:propose", "--json"], {
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

	it("deactivate already-inactive returns error", async () => {
		await withTempDir(async (tmpDir, env) => {
			const bin = buildBinary();
			runCommand(bin, ["init", "--name", "test", "--json"], { cwd: tmpDir, env });

			// Propose and activate
			runCommand(bin, ["invariant:propose", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({
					id: "custom.test",
					description: "Test",
					type: "custom",
				}),
			});
			runCommand(bin, ["invariant:activate", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ id: "custom.test" }),
			});

			// First deactivate succeeds
			const first = runCommand(bin, ["invariant:deactivate", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ id: "custom.test" }),
			});
			expect(first.exitCode).toBe(0);

			// Second deactivate fails
			const second = runCommand(bin, ["invariant:deactivate", "--json"], {
				cwd: tmpDir,
				env,
				stdin: JSON.stringify({ id: "custom.test" }),
			});
			expect(second.exitCode).toBe(1);
			const json = second.json as { ok: boolean; code: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("ENTITY_ALREADY_INACTIVE");
		});
	});
});
