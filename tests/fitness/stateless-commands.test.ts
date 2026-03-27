/**
 * Fitness function: INV-004 — Stateless commands.
 * Verifies every mutation command has an entity-identifying flag
 * or accepts a required name/id field in its stdin schema.
 * No command should rely on ambient/session state.
 */

import { describe, expect, it } from "vitest";
import { buildBinary, runCommand } from "../integration/helpers.js";

/** Global args that are not entity-identifying. */
const GLOBAL_ARG_NAMES = new Set(["json", "quiet", "query", "verbose"]);

/** Read-only commands that don't need entity-identifying flags. */
const READ_ONLY_COMMANDS = new Set([
	"init",
	"schema",
	"state",
	"status",
	"epic:list",
	"slice:list",
	"quest:list",
	"decision:list",
	"learning:list",
	"task:list",
	"task:show",
]);

/**
 * Entity-identifying arg names. At least one of these (or a stdin schema
 * with a required name/id field) must be present on mutation commands.
 */
const ENTITY_ARGS = new Set(["epic", "slice", "quest", "task", "id", "from", "to"]);

/** Commands that accept stdin with required entity-identifying fields. */
const STDIN_ENTITY_COMMANDS = new Set([
	"epic:create", // stdin has required 'name'
	"quest:create", // stdin has required 'name'
	"task:create", // stdin has required 'name'
	"decision:create", // stdin has required 'id'
]);

describe("INV-004: Stateless commands — entity-identifying flags required", () => {
	const bin = buildBinary();

	it("should get schema output", () => {
		const result = runCommand(bin, ["schema", "--json"]);
		expect(result.exitCode).toBe(0);
		expect(result.json).toBeDefined();
	});

	it("every mutation command has entity-identifying args or stdin fields", () => {
		const result = runCommand(bin, ["schema", "--json"]);
		expect(result.exitCode).toBe(0);

		const schema = result.json as {
			commands: Array<{
				name: string;
				args: Record<string, { type: string; required?: boolean }>;
			}>;
		};

		const violations: string[] = [];

		for (const cmd of schema.commands) {
			// Skip read-only commands
			if (READ_ONLY_COMMANDS.has(cmd.name)) continue;

			// Skip commands that accept stdin with required entity fields
			if (STDIN_ENTITY_COMMANDS.has(cmd.name)) continue;

			// Check if any non-global arg is entity-identifying
			const commandArgs = Object.keys(cmd.args).filter((a) => !GLOBAL_ARG_NAMES.has(a));
			const hasEntityArg = commandArgs.some((a) => ENTITY_ARGS.has(a));

			if (!hasEntityArg) {
				violations.push(
					`${cmd.name}: no entity-identifying arg found (args: ${commandArgs.join(", ") || "none"})`,
				);
			}
		}

		if (violations.length > 0) {
			throw new Error(`Commands missing entity-identifying flags:\n${violations.join("\n")}`);
		}
	});
});
