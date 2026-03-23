import { defineCommand } from "citty";
import { z } from "zod";
import { createEpicInputSchema, completeEpicInputSchema, addVerificationInputSchema, updateVerificationInputSchema } from "../../schemas/commands/epic.js";
import { createSliceInputSchema, completeSliceInputSchema } from "../../schemas/commands/slice.js";
import { createQuestInputSchema, completeQuestInputSchema } from "../../schemas/commands/quest.js";
import { createDecisionInputSchema, updateDecisionInputSchema } from "../../schemas/commands/decision.js";
import {
	submitPlanInputSchema,
	submitRefinementInputSchema,
	submitImplementationInputSchema,
	submitExploreInputSchema,
	submitArchitectureInputSchema,
	submitSlicesInputSchema,
	submitRefineArchitectureInputSchema,
	submitRefineSlicesInputSchema,
} from "../../schemas/commands/submit.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

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
};

// ── Command Registry ─────────────────────────────────────────

/**
 * Parallel registry of command metadata, built alongside defineCommand calls.
 * Each entry captures: name, description, and arg definitions.
 * A drift-detection unit test ensures this stays in sync with subCommands in main.ts.
 */
export const commandRegistry: Map<string, CommandRegistryEntry> = new Map();

/** Register a command's metadata in the parallel registry. */
export function registerCommand(name: string, description: string, args: Record<string, ArgDefinition>): void {
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

// ── Populate command registry ────────────────────────────────

// Global commands
registerCommand("init", "Initialize a new .project/ directory", {
	...globalArgDefs,
	name: { type: "string", description: "Project name (defaults to directory name)" },
});
registerCommand("status", "Show current project status", {
	...globalArgDefs,
});
registerCommand("schema", "Show CLI command tree with input/output schemas", {
	...globalArgDefs,
	command: { type: "string", description: "Show detail for a specific command" },
});

// Epic commands
registerCommand("epic:create", "Create a new epic. Stdin: {name, goal}.", {
	...globalArgDefs,
});
registerCommand("epic:list", "List all epics with name, status, created, and completed timestamps.", {
	...globalArgDefs,
});
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
registerCommand("epic:add-verification", "Add a verification criterion to an epic. Stdin: {verification}.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:update-verification", "Update a verification criterion. Stdin: {verification}.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	index: { type: "string", description: "Verification index", required: true },
});

// Slice commands
registerCommand("slice:create", "Create a new slice. Stdin: {name, goal}.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("slice:list", "List all slices.", {
	...globalArgDefs,
	epic: { type: "string", description: "Filter by epic name" },
});
registerCommand("slice:show", "Show details for a specific slice.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name", required: true },
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
registerCommand("slice:complete", "Complete a slice. Stdin: {verificationPassed, deferred?, learnings?, architectureDelta?}.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name", required: true },
});
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
});
registerCommand("quest:show", "Show details for a specific quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
});
registerCommand("quest:plan", "Begin planning for a quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
});
registerCommand("quest:refine-plan", "Begin plan refinement for a quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
});
registerCommand("quest:implement", "Begin implementation for a quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
});
registerCommand("quest:complete", "Complete a quest. Stdin: {verificationPassed, learnings?, architectureDelta?}.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
});
registerCommand("quest:abandon", "Abandon a quest.", {
	...globalArgDefs,
	quest: { type: "string", description: "Quest name", required: true },
	reason: { type: "string", description: "Reason for abandoning", required: true },
});

// Decision commands
registerCommand("decision:create", "Create a new decision. Stdin: {id, domain, title, summary}.", {
	...globalArgDefs,
});
registerCommand("decision:list", "List all decisions.", {
	...globalArgDefs,
});
registerCommand("decision:show", "Show details for a specific decision.", {
	...globalArgDefs,
	id: { type: "string", description: "Decision ID", required: true },
});
registerCommand("decision:update", "Update a decision. Stdin: {changes: {status?, domain?, title?, summary?, supersededBy?}}.", {
	...globalArgDefs,
	id: { type: "string", description: "Decision ID", required: true },
});

// Learning commands
registerCommand("learning:list", "List learnings.", {
	...globalArgDefs,
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
registerCommand("start-explore", "Get context for exploring an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	inline: { type: "string", description: "Include inlined content (boolean or byte budget)" },
});
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
	override: { type: "boolean", description: "Bypass score threshold circuit breaker", default: false },
});
registerCommand("submit-implementation", "Submit implementation results.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name" },
	quest: { type: "string", description: "Quest name" },
});
registerCommand("submit-explore", "Submit exploration results.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
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
	override: { type: "boolean", description: "Bypass score threshold circuit breaker", default: false },
});
registerCommand("submit-refine-slices", "Submit slice refinement scores.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	override: { type: "boolean", description: "Bypass score threshold circuit breaker", default: false },
});

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
		throw new GoodplanError(
			"VALIDATION_INVALID_INPUT",
			`Unknown command: ${commandName}`,
			{ command: commandName },
		);
	}

	const result: Record<string, unknown> = {
		name: entry.name,
		description: entry.description,
		args: entry.args,
	};

	// Include stdin schema if this command accepts stdin
	const stdinSchema = stdinSchemaRegistry[commandName];
	if (stdinSchema !== undefined) {
		result["stdinSchema"] = z.toJSONSchema(stdinSchema, { unrepresentable: "any" });
	}

	return result;
}

/**
 * `goodplan schema` — show CLI command tree with input/output schemas.
 *
 * Without `--command`: returns `{ commands: [...] }` with all registered commands.
 * With `--command <name>`: returns that command's detail including stdin schema (if any).
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
	},
	setup() {},
	async run({ args }) {
		const data = args.command ? buildCommandDetail(args.command) : buildCommandHierarchy();
		if (args.json || args.query) {
			output(data, args);
		} else {
			// Human-readable: indented JSON
			process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
		}
	},
});
