import { defineCommand } from "citty";
import { z } from "zod";
import { PROJECT_DIR_NAME } from "../../core/data/project.js";
import {
	createDecisionInputSchema,
	updateDecisionInputSchema,
} from "../../schemas/commands/decision.js";
import { completeEpicInputSchema, createEpicInputSchema } from "../../schemas/commands/epic.js";
import { completeQuestInputSchema, createQuestInputSchema } from "../../schemas/commands/quest.js";
import { completeSliceInputSchema, createSliceInputSchema } from "../../schemas/commands/slice.js";
import {
	submitImplementationInputSchema,
	submitPlanInputSchema,
	submitRefinementInputSchema,
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
	"Detect project version (v1 vs v2). Full migration deferred to a future release.",
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
registerCommand("epic:create", "Create a new epic. Accepts --name flag or stdin JSON { name }.", {
	...globalArgDefs,
	name: { type: "string", description: "Epic name (used as directory slug)", required: false },
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
registerCommand(
	"epic:goal-draft",
	"Draft an epic goal. Accepts --epic flag and stdin JSON { content }.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
	},
);
registerCommand(
	"epic:goal-commit",
	"Commit an epic goal. Accepts --epic flag and stdin JSON { content }.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
	},
);
registerCommand("epic:explore-start", "Start an exploration cycle for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:explore-conclude", "Conclude exploration for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:research-capture", "Capture a research artifact for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:brainstorm-capture", "Capture a brainstorm artifact for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:architecture-draft", "Draft an architecture target for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:architecture-commit", "Commit the architecture target for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand(
	"epic:architecture-shape-start",
	"Start the architecture shape checkpoint for an epic.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
	},
);
registerCommand("epic:architecture-shape-approve", "Approve the architecture shape for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand(
	"epic:architecture-shape-auto",
	"Auto-shape the architecture checkpoint for an epic.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
	},
);
// v1 epic:refine-architecture, epic:define-slices, epic:refine-slices removed
// (deferred to slice 07 / superseded by v2 equivalents)
registerCommand(
	"epic:pressure-test-draft",
	"Draft a pressure test for an epic. Stdin: { content }.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
	},
);
registerCommand(
	"epic:pressure-test-commit",
	"Commit the pressure test for an epic. Stdin: { content }.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
	},
);
registerCommand(
	"epic:pressure-test-finding-disposition",
	"Set the disposition of a pressure test finding.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
		finding: { type: "string", description: "Finding ID", required: true },
		disposition: {
			type: "string",
			description: "Disposition: accepted or dismissed",
			required: true,
		},
	},
);
registerCommand("epic:slices-draft", "Draft a slice set for an epic. Stdin: { content }.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:slices-commit", "Commit the slice set for an epic. Stdin: { content }.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:slice-set-shape-start", "Start the slice set shape checkpoint for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:slice-set-shape-approve", "Approve the slice set shape for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:slice-set-shape-auto", "Auto-shape the slice set checkpoint for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:pause", "Pause an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:resume", "Resume a paused epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("epic:set-steering", "Set the steering preference for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	preference: {
		type: "string",
		description: "Steering preference: always-consult, best-guess-and-flag, or ask-in-the-moment",
		required: true,
	},
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
// v1 epic:add-verification, epic:update-verification removed
// (core/rpc dependency; will be migrated to v2 events in a future slice)

// Slice commands
registerCommand(
	"slice:create",
	"Create a new slice. Accepts --name flag or stdin JSON { name, goal }.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name (required)", required: true },
		name: { type: "string", description: "Slice name (used as directory slug)", required: false },
	},
);
registerCommand("slice:list", "List slices from event-sourced state.", {
	...globalArgDefs,
	...listArgDefs,
	epic: { type: "string", description: "Filter by epic name" },
	all: { type: "boolean", description: "Show slices from all epics" },
});
registerCommand("slice:show", "Show full slice entity details from event-sourced state.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name", required: true },
	epic: { type: "string", description: "Epic name", required: true },
});
// v1 slice:plan, slice:refine-plan, slice:implement, slice:complete removed —
// superseded by v2 event commands (plan-draft, plan-commit, implement-start, land)
registerCommand("slice:abandon", "Abandon a slice with a reason.", {
	...globalArgDefs,
	slice: { type: "string", description: "Slice name", required: true },
	epic: { type: "string", description: "Epic name", required: true },
	reason: { type: "string", description: "Reason for abandoning", required: true },
});
registerCommand(
	"slice:plan-draft",
	"Draft a slice plan. Accepts --epic and --slice flags and stdin JSON { content }.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
		slice: { type: "string", description: "Slice name", required: true },
	},
);
registerCommand(
	"slice:plan-commit",
	"Commit a slice plan. Accepts --epic and --slice flags and stdin JSON { content }.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
		slice: { type: "string", description: "Slice name", required: true },
	},
);
registerCommand("slice:plan-shape-start", "Start the plan shape checkpoint for a slice.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
});
registerCommand(
	"slice:plan-shape-revise",
	"Propose a plan shape revision. Accepts --epic, --slice, and stdin JSON { content, revision }.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
		slice: { type: "string", description: "Slice name", required: true },
	},
);
registerCommand("slice:plan-shape-approve", "Approve the plan shape for a slice.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
});
registerCommand("slice:plan-shape-auto", "Auto-shape the plan checkpoint for a slice.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
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
// v1 epic subagent commands removed (start-explore, start-architecture, start-slices,
// start-refine-architecture, start-refine-slices) — superseded by v2 context bundler integration
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
// v1 epic submit commands removed (submit-explore, submit-architecture, submit-slices,
// submit-refine-architecture, submit-refine-slices) — superseded by v2 event commands

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
