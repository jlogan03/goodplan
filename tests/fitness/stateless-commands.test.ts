/**
 * Fitness function: INV-004 — Stateless commands.
 * Verifies every mutation command has an entity-identifying flag
 * or accepts a required name/id field in its stdin schema.
 * No command should rely on ambient/session state.
 */

import { describe, expect, it } from "vitest";
import { globalArgs } from "../../src/commands/global-args.js";
import { buildBinary, runCommand } from "../integration/helpers.js";

/** Global args that are not entity-identifying — derived from globalArgs source of truth. */
const GLOBAL_ARG_NAMES = new Set(Object.keys(globalArgs));

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
	"briefing:latest",
	"project:show",
	"subsystem:list",
	"side-quest:list",
	"side-quest:show",
	"invariant:list",
	"reviewer:list",
	"rubric:list",
	"refine:evaluate",
]);

/**
 * Entity-identifying arg names. At least one of these (or a stdin schema
 * with a required name/id field) must be present on mutation commands.
 */
const ENTITY_ARGS = new Set([
	"epic",
	"slice",
	"quest",
	"task",
	"id",
	"from",
	"to",
	"name",
	"scope",
	"side-quest",
	"artifact-type",
]);

/**
 * Commands that operate on the entire project rather than targeting a specific entity.
 * Note: `init` is also project-scoped but lives in `READ_ONLY_COMMANDS`.
 */
/** verify --fix writes project.json (signature repair), like migrate writes during schema upgrades. */
const ENTITY_EXEMPT_COMMANDS = new Set(["migrate", "verify", "project:set-steering"]);

/** Commands that accept stdin with required entity-identifying fields. */
const STDIN_ENTITY_COMMANDS = new Set([
	"epic:create", // stdin has required 'name'
	"quest:create", // stdin has required 'name'
	"task:create", // stdin has required 'name'
	"decision:create", // stdin has required 'id'
	"subsystem:register", // stdin has required 'name'
	"decision:record", // stdin has required 'id', 'domain', 'title', 'summary'
	"decision:supersede", // stdin has required 'decisionId', 'reason'
	"learning:capture", // stdin has required 'summary'
	"learning:promote", // stdin has required 'learningId', 'from', 'to'
	"invariant:check", // project-scoped, checks all invariants
	"invariant:propose", // stdin has required invariant definition
	"invariant:activate", // stdin has required invariant id
	"invariant:deactivate", // stdin has required invariant id
	"rubric:validate", // stdin has required rubric definition
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

			// Skip commands that operate on the entire project (no entity target)
			if (ENTITY_EXEMPT_COMMANDS.has(cmd.name)) continue;

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
