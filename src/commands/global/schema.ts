import { defineCommand } from "citty";
import { z } from "zod";
import { LEGACY_DIR_NAME, PROJECT_DIR_NAME } from "../../core/data/project.js";
import { migrationResponseSchema } from "../../core/rpc/migrate.js";
import {
	createDecisionInputSchema,
	updateDecisionInputSchema,
} from "../../schemas/commands/decision.js";
import {
	addVerificationInputSchema,
	completeEpicInputSchema,
	createEpicInputSchema,
	updateVerificationInputSchema,
} from "../../schemas/commands/epic.js";
import { completeQuestInputSchema, createQuestInputSchema } from "../../schemas/commands/quest.js";
import { completeSliceInputSchema, createSliceInputSchema } from "../../schemas/commands/slice.js";
import {
	submitArchitectureInputSchema,
	submitExploreInputSchema,
	submitImplementationInputSchema,
	submitPlanInputSchema,
	submitRefineArchitectureInputSchema,
	submitRefineSlicesInputSchema,
	submitRefinementInputSchema,
	submitSlicesInputSchema,
} from "../../schemas/commands/submit.js";
import { taskCreateInputSchema } from "../../schemas/commands/task.js";
import { projectInitializedPayloadSchema } from "../../schemas/events/index.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs, listArgs } from "../global-args.js";

// ── Types ────────────────────────────────────────────────────

interface ArgDefinition {
	type: string;
	description: string;
	required?: boolean;
	default?: unknown;
}

interface CommandRegistryEntry {
	name: string;
	description: string;
	args: Record<string, ArgDefinition>;
}

// ── Stdin Schema Registry ────────────────────────────────────

/**
 * Maps command names to their Zod stdin schemas.
 * Only commands that accept stdin input are listed here.
 */
export const stdinSchemaRegistry: Record<string, z.ZodType> = {
	"epic:create": createEpicInputSchema,
	"epic:complete": completeEpicInputSchema,
	"epic:add-verification": addVerificationInputSchema,
	"epic:update-verification": updateVerificationInputSchema,
	"slice:create": createSliceInputSchema,
	"slice:complete": completeSliceInputSchema,
	"quest:create": createQuestInputSchema,
	"quest:complete": completeQuestInputSchema,
	"task:create": taskCreateInputSchema,
	"decision:create": createDecisionInputSchema,
	"decision:update": updateDecisionInputSchema,
	"submit-plan": submitPlanInputSchema,
	"submit-refinement": submitRefinementInputSchema,
	"submit-implementation": submitImplementationInputSchema,
	"submit-explore": submitExploreInputSchema,
	"submit-architecture": submitArchitectureInputSchema,
	"submit-slices": submitSlicesInputSchema,
	"submit-refine-architecture": submitRefineArchitectureInputSchema,
	"submit-refine-slices": submitRefineSlicesInputSchema,
	migrate: migrationResponseSchema,
};

// ── Command Registry ─────────────────────────────────────────

/**
 * Parallel registry of command metadata, built alongside defineCommand calls.
 * Each entry captures: name, description, and arg definitions.
 * A drift-detection unit test ensures this stays in sync with subCommands in main.ts.
 */
export const commandRegistry: Map<string, CommandRegistryEntry> = new Map();

/** Register a command's metadata in the parallel registry. */
export function registerCommand(
	name: string,
	description: string,
	args: Record<string, ArgDefinition>,
): void {
	commandRegistry.set(name, { name, description, args });
}

// ── Global args metadata (derived from globalArgs to prevent drift) ────────

const globalArgDefs: Record<string, ArgDefinition> = Object.fromEntries(
	Object.entries(globalArgs).map(([key, def]) => {
		const argDef: ArgDefinition = {
			type: def.type,
			description: def.description,
		};
		if ("required" in def && def.required !== undefined) argDef.required = def.required;
		if ("default" in def && def.default !== undefined) argDef.default = def.default;
		return [key, argDef];
	}),
);

const listArgDefs: Record<string, ArgDefinition> = Object.fromEntries(
	Object.entries(listArgs).map(([key, def]) => {
		const argDef: ArgDefinition = {
			type: def.type,
			description: def.description,
		};
		if ("required" in def && def.required !== undefined) argDef.required = def.required;
		return [key, argDef];
	}),
);

// ── Populate command registry ────────────────────────────────

// Global commands
registerCommand("init", `Initialize a new ${PROJECT_DIR_NAME}/ directory`, {
	...globalArgDefs,
	name: { type: "string", description: "Project name (defaults to directory name)" },
});
registerCommand(
	"migrate",
	`Migrate a ${PROJECT_DIR_NAME}/ or legacy ${LEGACY_DIR_NAME}/ directory to CLI format. Stdin: {round, answers: [{id, data}]}. Accepts both ${PROJECT_DIR_NAME}/ (re-migration) and ${LEGACY_DIR_NAME}/ (legacy migration).`,
	{
		...globalArgDefs,
	},
);
registerCommand("status", "Show current project status", {
	...globalArgDefs,
});
registerCommand("schema", "Show CLI command tree with input/output schemas", {
	...globalArgDefs,
	command: { type: "string", description: "Show detail for a specific command" },
	events: {
		type: "boolean",
		description: "Show event type catalog with payload schemas",
		default: false,
	},
});
registerCommand(
	"state",
	`Expose the full ${PROJECT_DIR_NAME}/ state tree as JSON. Always outputs JSON regardless of --json flag.`,
	{
		...globalArgDefs,
		inline: {
			type: "string",
			description: "Include markdown content in state tree",
			required: false,
		},
		offset: {
			type: "string",
			description: "Skip N entries when result is an array (requires --query)",
			required: false,
		},
		limit: {
			type: "string",
			description: "Return at most N entries when result is an array (requires --query)",
			required: false,
		},
	},
);

registerCommand(
	"verify",
	"Verify state integrity (HMAC signature). Use --fix to recompute and re-embed the signature.",
	{
		...globalArgDefs,
		fix: {
			type: "boolean",
			description: "Recompute and re-embed the state signature",
			default: false,
		},
	},
);

// Epic commands
registerCommand("epic:create", "Create a new epic. Stdin: {name, goal}.", {
	...globalArgDefs,
});
registerCommand(
	"epic:list",
	"List all epics with name, status, created, and completed timestamps.",
	{
		...globalArgDefs,
		...listArgDefs,
	},
);
registerCommand("epic:show", "Show details for a specific epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:explore", "Begin exploration phase for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:define-architecture", "Begin architecture definition for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:refine-architecture", "Begin architecture refinement for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:define-slices", "Begin slice definition for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:refine-slices", "Begin slice refinement for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:activate", "Activate an epic for work.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:complete", "Complete an epic. Stdin: {verificationResults}.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:abandon", "Abandon an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	reason: { type: "string", description: "Reason for abandoning", required: true },
});
registerCommand(
	"epic:add-verification",
	"Add a verification criterion to an epic. Stdin: {verification}.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
	},
);
registerCommand(
	"epic:update-verification",
	"Update a verification criterion. Stdin: {verification}.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
		index: { type: "string", description: "Verification index", required: true },
	},
);

// Slice commands
registerCommand("slice:create", "Create a new slice. Stdin: {name, goal}.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("slice:list", "List all slices.", {
	...globalArgDefs,
	...listArgDefs,
	epic: { type: "string", description: "Filter by epic name" },
	all: { type: "boolean", description: "Show slices from all epics" },
});
registerCommand("slice:show", "Show details for a specific slice.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name", required: true },
	epic: { type: "string", description: "Epic name (defaults to active epic)" },
});
registerCommand("slice:plan", "Begin planning for a slice.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name", required: true },
});
registerCommand("slice:refine-plan", "Begin plan refinement for a slice.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name", required: true },
});
registerCommand("slice:implement", "Begin implementation for a slice.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name", required: true },
});
registerCommand(
	"slice:complete",
	"Complete a slice. Stdin: {verificationPassed, deferred?, learnings?, architectureDelta?}.",
	{
		...globalArgDefs,
		slice: { type: "string", description: "Slice name", required: true },
	},
);
registerCommand("slice:abandon", "Abandon a slice.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name", required: true },
	reason: { type: "string", description: "Reason for abandoning", required: true },
});

// Quest commands
registerCommand("quest:create", "Create a new quest. Stdin: {name, goal}.", {
	...globalArgDefs,
});
registerCommand("quest:list", "List all quests.", {
	...globalArgDefs,
	...listArgDefs,
});
registerCommand("quest:show", "Show details for a specific quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
});
registerCommand("quest:explore", "Begin exploration phase for a quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
});
registerCommand(
	"quest:plan",
	"Begin planning for a quest. Precondition: 'created' or 'explored' status.",
	{
		...globalArgDefs,
		quest: { type: "string", description: "Quest name", required: true },
	},
);
registerCommand("quest:refine-plan", "Begin plan refinement for a quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
});
registerCommand("quest:implement", "Begin implementation for a quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
});
registerCommand(
	"quest:complete",
	"Complete a quest. Stdin: {verificationPassed, learnings?, architectureDelta?}.",
	{
		...globalArgDefs,
		quest: { type: "string", description: "Quest name", required: true },
	},
);
registerCommand("quest:abandon", "Abandon a quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
	reason: { type: "string", description: "Reason for abandoning", required: true },
});

// Task commands
registerCommand(
	"task:create",
	"Create a new task. Stdin: {name, title, description?, context?}. Transitions to 'open' status.",
	{
		...globalArgDefs,
	},
);
registerCommand(
	"task:list",
	"List tasks. Defaults to open tasks only; use --all to include converted/dropped. JSON includes filter field.",
	{
		...globalArgDefs,
		...listArgDefs,
		all: { type: "boolean", description: "Include converted and dropped tasks", default: false },
	},
);
registerCommand("task:show", "Show full task entity details.", {
	...globalArgDefs,
	task: { type: "string", description: "Task name", required: true },
});
registerCommand(
	"task:drop",
	"Drop a task with a reason. Requires --task and --reason flags. Transition: open -> dropped.",
	{
		...globalArgDefs,
		task: { type: "string", description: "Task name", required: true },
		reason: { type: "string", description: "Reason for dropping", required: true },
	},
);
registerCommand(
	"task:convert",
	"Convert a task to a quest or epic. Requires --task and --to flags. Optional --name and --goal overrides. Transition: open -> converted.",
	{
		...globalArgDefs,
		task: { type: "string", description: "Task name", required: true },
		to: { type: "string", description: 'Target entity type: "quest" or "epic"', required: true },
		name: { type: "string", description: "Override name for created entity" },
		goal: { type: "string", description: "Override goal for created entity" },
	},
);

// Decision commands
registerCommand("decision:create", "Create a new decision. Stdin: {id, domain, title, summary}.", {
	...globalArgDefs,
});
registerCommand("decision:list", "List all decisions.", {
	...globalArgDefs,
	...listArgDefs,
});
registerCommand("decision:show", "Show details for a specific decision.", {
	...globalArgDefs,
	id: { type: "string", description: "Decision ID", required: true },
});
registerCommand(
	"decision:update",
	"Update a decision. Stdin: {changes: {status?, domain?, title?, summary?, supersededBy?}}.",
	{
		...globalArgDefs,
		id: { type: "string", description: "Decision ID", required: true },
	},
);

// Learning commands
registerCommand("learning:list", "List learnings.", {
	...globalArgDefs,
	...listArgDefs,
	source: { type: "string", description: "Filter by source scope" },
});
registerCommand("learning:rollup", "Roll up learnings from one scope to another.", {
	...globalArgDefs,
	from: { type: "string", description: "Source scope", required: true },
	to: { type: "string", description: "Target scope", required: true },
});

// Activity commands
// Check if activity:list exists
// (It's referenced in commands-api.md but may not be implemented yet — skipping if absent)

// Sub-agent commands
registerCommand("start-plan", "Get context for planning a slice or quest.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name" },
	quest: { type: "string", description: "Quest name" },
	inline: { type: "string", description: "Include inlined content (boolean or byte budget)" },
});
registerCommand("start-refinement", "Get context for refining a slice or quest plan.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name" },
	quest: { type: "string", description: "Quest name" },
	inline: { type: "string", description: "Include inlined content (boolean or byte budget)" },
});
registerCommand("start-implementation", "Get context for implementing a slice or quest.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name" },
	quest: { type: "string", description: "Quest name" },
	inline: { type: "string", description: "Include inlined content (boolean or byte budget)" },
});
registerCommand(
	"start-explore",
	"Get context for exploring an epic or quest. Requires --epic or --quest (mutually exclusive).",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name" },
		quest: { type: "string", description: "Quest name" },
		inline: { type: "string", description: "Include inlined content (boolean or byte budget)" },
	},
);
registerCommand("start-architecture", "Get context for defining epic architecture.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	inline: { type: "string", description: "Include inlined content (boolean or byte budget)" },
});
registerCommand("start-slices", "Get context for defining epic slices.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	inline: { type: "string", description: "Include inlined content (boolean or byte budget)" },
});
registerCommand("start-refine-architecture", "Get context for refining epic architecture.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	inline: { type: "string", description: "Include inlined content (boolean or byte budget)" },
});
registerCommand("start-refine-slices", "Get context for refining epic slices.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	inline: { type: "string", description: "Include inlined content (boolean or byte budget)" },
});
registerCommand("submit-plan", "Submit a completed plan.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name" },
	quest: { type: "string", description: "Quest name" },
});
registerCommand("submit-refinement", "Submit refinement scores.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name" },
	quest: { type: "string", description: "Quest name" },
	override: {
		type: "boolean",
		description: "Bypass score threshold circuit breaker",
		default: false,
	},
});
registerCommand("submit-implementation", "Submit implementation results.", {
	...globalArgDefs,
	phase: { type: "string", description: "Implementation phase number" },
	slice: { type: "string", description: "Slice name" },
	quest: { type: "string", description: "Quest name" },
});
registerCommand(
	"submit-explore",
	"Submit exploration results. Requires --epic or --quest (mutually exclusive).",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name" },
		quest: { type: "string", description: "Quest name" },
	},
);
registerCommand("submit-architecture", "Submit architecture definition.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("submit-slices", "Submit slice definitions.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("submit-refine-architecture", "Submit architecture refinement scores.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	override: {
		type: "boolean",
		description: "Bypass score threshold circuit breaker",
		default: false,
	},
});
registerCommand("submit-refine-slices", "Submit slice refinement scores.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	override: {
		type: "boolean",
		description: "Bypass score threshold circuit breaker",
		default: false,
	},
});

// ── Event Schema Registry ───────────────────────────────────

/**
 * Maps event type names to their Zod payload schemas.
 * Used by `gp schema --events` to produce a JSON Schema catalog.
 */
export const eventSchemaRegistry: Record<string, z.ZodType> = {
	"project-initialized": projectInitializedPayloadSchema,
};

// ── Schema command ───────────────────────────────────────────

/**
 * Build the full command hierarchy for schema output.
 */
function buildCommandHierarchy(): { commands: CommandRegistryEntry[] } {
	return { commands: Array.from(commandRegistry.values()) };
}

/**
 * Build detail for a single command, including stdin schema if applicable.
 */
function buildCommandDetail(commandName: string): Record<string, unknown> {
	const entry = commandRegistry.get(commandName);
	if (entry === undefined) {
		throw new GoodplanError("VALIDATION_INVALID_INPUT", `Unknown command: ${commandName}`, {
			command: commandName,
		});
	}

	const result: Record<string, unknown> = {
		name: entry.name,
		description: entry.description,
		args: entry.args,
	};

	// Include stdin schema if this command accepts stdin
	const stdinSchema = stdinSchemaRegistry[commandName];
	if (stdinSchema !== undefined) {
		result.stdinSchema = z.toJSONSchema(stdinSchema, { unrepresentable: "any" });
	}

	return result;
}

/**
 * Build the event type catalog with JSON Schema payloads.
 */
function buildEventCatalog(): {
	events: Array<{ type: string; payloadSchema: Record<string, unknown> }>;
} {
	const events = Object.entries(eventSchemaRegistry).map(([type, schema]) => ({
		type,
		payloadSchema: z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<string, unknown>,
	}));
	return { events };
}

/**
 * `gp schema` — show CLI command tree with input/output schemas.
 *
 * Without flags: returns `{ commands: [...] }` with all registered commands.
 * With `--command <name>`: returns that command's detail including stdin schema (if any).
 * With `--events`: returns event type catalog with JSON Schema payloads.
 *
 * INV-006: schema output reflects actual command signatures via parallel registry
 * and Zod-derived JSON Schema from actual schema objects.
 */
export const schemaCommand = defineCommand({
	meta: {
		name: "schema",
		description: "Show CLI command tree with input/output schemas",
	},
	args: {
		...globalArgs,
		command: {
			type: "string",
			description: "Show detail for a specific command",
			required: false,
		},
		events: {
			type: "boolean",
			description: "Show event type catalog with payload schemas",
			default: false,
		},
	},
	setup() {},
	async run({ args }) {
		let data: unknown;
		if (args.events) {
			data = buildEventCatalog();
		} else if (args.command) {
			data = buildCommandDetail(args.command);
		} else {
			data = buildCommandHierarchy();
		}

		if (args.json || args.query) {
			output(data, args);
		} else {
			// Human-readable: indented JSON (schema is inherently structured)
			process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
		}
	},
});
