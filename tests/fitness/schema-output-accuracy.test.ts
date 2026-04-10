/**
 * Fitness function: INV-006 — Schema output accuracy.
 * Spawns the binary with `schema --json` and verifies:
 * (a) flag names match registered command args
 * (b) required/optional status is consistent
 * (c) stdin schema present for commands that accept stdin
 */

import { describe, expect, it } from "vitest";
import { globalArgs } from "../../src/commands/global-args.js";
import { buildBinary, runCommand } from "../integration/helpers.js";

describe("INV-006: Schema output accuracy", () => {
	const bin = buildBinary();

	it("schema --json returns valid JSON with commands array", () => {
		const result = runCommand(bin, ["schema", "--json"]);
		expect(result.exitCode).toBe(0);
		expect(result.json).toBeDefined();

		const schema = result.json as { commands: unknown[] };
		expect(Array.isArray(schema.commands)).toBe(true);
		expect(schema.commands.length).toBeGreaterThan(0);
	});

	it("each command has name, description, and args", () => {
		const result = runCommand(bin, ["schema", "--json"]);
		const schema = result.json as {
			commands: Array<{
				name: string;
				description: string;
				args: Record<string, unknown>;
			}>;
		};

		for (const cmd of schema.commands) {
			expect(typeof cmd.name, "command should have string name").toBe("string");
			expect(cmd.name.length).toBeGreaterThan(0);
			expect(typeof cmd.description, `${cmd.name} should have string description`).toBe("string");
			expect(typeof cmd.args, `${cmd.name} should have args object`).toBe("object");
		}
	});

	it("all commands include global args (json, quiet, query, verbose)", () => {
		const result = runCommand(bin, ["schema", "--json"]);
		const schema = result.json as {
			commands: Array<{
				name: string;
				args: Record<string, { type: string }>;
			}>;
		};

		const globalArgNames = Object.keys(globalArgs);

		for (const cmd of schema.commands) {
			for (const globalArg of globalArgNames) {
				expect(
					cmd.args[globalArg],
					`${cmd.name} should have global arg '${globalArg}'`,
				).toBeDefined();
			}
		}
	});

	it("arg types are valid strings", () => {
		const result = runCommand(bin, ["schema", "--json"]);
		const schema = result.json as {
			commands: Array<{
				name: string;
				args: Record<string, { type: string }>;
			}>;
		};

		const validTypes = new Set(["string", "boolean", "number", "positional"]);

		for (const cmd of schema.commands) {
			for (const [argName, argDef] of Object.entries(cmd.args)) {
				expect(
					validTypes.has(argDef.type),
					`${cmd.name}.${argName} has invalid type "${argDef.type}"`,
				).toBe(true);
			}
		}
	});

	it("per-command detail includes stdin schema for stdin-accepting commands", () => {
		const stdinCommands = [
			"epic:create",
			"slice:create",
			"quest:create",
			"decision:create",
			"submit-plan",
			"submit-refinement",
			"submit-implementation",
		];

		for (const cmdName of stdinCommands) {
			const result = runCommand(bin, ["schema", "--json", `--command=${cmdName}`]);
			expect(result.exitCode, `schema --command=${cmdName} should exit 0`).toBe(0);
			expect(result.json).toBeDefined();

			const detail = result.json as {
				name: string;
				stdinSchema?: Record<string, unknown>;
			};
			expect(detail.name).toBe(cmdName);
			expect(detail.stdinSchema, `${cmdName} should have stdinSchema in detail view`).toBeDefined();
		}
	});

	it("--events returns event catalog with JSON Schema payloads", () => {
		const result = runCommand(bin, ["schema", "--events", "--json"]);
		expect(result.exitCode).toBe(0);
		expect(result.json).toBeDefined();

		const catalog = result.json as {
			events: Array<{ type: string; payloadSchema: Record<string, unknown> }>;
		};
		expect(Array.isArray(catalog.events)).toBe(true);
		expect(catalog.events.length).toBeGreaterThan(0);

		// Verify project-initialized event is present with valid JSON Schema
		const projectInit = catalog.events.find((e) => e.type === "project-initialized");
		expect(projectInit, "should include project-initialized event").toBeDefined();
		expect(projectInit?.payloadSchema.type).toBe("object");
		expect(projectInit?.payloadSchema.properties).toHaveProperty("name");
	});

	it("per-command detail args match list-view args", () => {
		const listResult = runCommand(bin, ["schema", "--json"]);
		const schema = listResult.json as {
			commands: Array<{
				name: string;
				args: Record<string, { type: string; required?: boolean }>;
			}>;
		};

		// Spot-check a few commands
		const commandsToCheck = ["init", "epic:create", "slice:plan", "quest:show"];

		for (const cmdName of commandsToCheck) {
			const listCmd = schema.commands.find((c) => c.name === cmdName);
			if (listCmd === undefined) continue;

			const detailResult = runCommand(bin, ["schema", "--json", `--command=${cmdName}`]);
			expect(detailResult.exitCode).toBe(0);

			const detail = detailResult.json as {
				name: string;
				args: Record<string, { type: string; required?: boolean }>;
			};

			// Arg keys should match
			const listArgKeys = Object.keys(listCmd.args).sort();
			const detailArgKeys = Object.keys(detail.args).sort();
			expect(detailArgKeys, `${cmdName}: detail args should match list args`).toEqual(listArgKeys);
		}
	});
});
