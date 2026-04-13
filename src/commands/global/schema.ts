import { defineCommand } from "citty";
import { z } from "zod";
import { PROJECT_DIR_NAME } from "../../core/data/project.js";
import { writeBriefingInputSchema } from "../../schemas/commands/briefing.js";
import { completeEpicInputSchema, createEpicInputSchema } from "../../schemas/commands/epic.js";
import { createSliceInputSchema } from "../../schemas/commands/slice.js";
import {
	registerSubsystemInputSchema,
	updateMaturityInputSchema,
} from "../../schemas/commands/subsystem.js";
import { briefingWrittenPayloadSchema } from "../../schemas/events/briefing.js";
import { projectInitializedPayloadSchema } from "../../schemas/events/index.js";
import {
	subsystemMaturityUpdatedPayloadSchema,
	subsystemRegisteredPayloadSchema,
	subsystemRetiredPayloadSchema,
} from "../../schemas/events/subsystem.js";
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
	"briefing:write": writeBriefingInputSchema,
	"subsystem:register": registerSubsystemInputSchema,
	"subsystem:update-maturity": updateMaturityInputSchema,
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
	"Migrate project from v1 to v2 event-sourced format.",
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
registerCommand("slice:implement-start", "Start implementation of a slice.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
});
registerCommand("slice:chunk-start", "Start a TDD chunk within a slice implementation.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
	chunk: { type: "string", description: "Chunk ID", required: true },
});
registerCommand("slice:chunk-red-written", "Record that a red test has been written for a chunk.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
	chunk: { type: "string", description: "Chunk ID", required: true },
});
registerCommand(
	"slice:chunk-red-failed",
	"Record that a red test has failed (expected) for a chunk.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
		slice: { type: "string", description: "Slice name", required: true },
		chunk: { type: "string", description: "Chunk ID", required: true },
	},
);
registerCommand("slice:chunk-green", "Record that green has been achieved for a chunk.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
	chunk: { type: "string", description: "Chunk ID", required: true },
});
registerCommand("slice:chunk-verify", "Verify a chunk with evidence.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
	chunk: { type: "string", description: "Chunk ID", required: true },
});
registerCommand(
	"slice:chunk-unverifiable",
	"Mark a chunk as unverifiable (alternative to verify).",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
		slice: { type: "string", description: "Slice name", required: true },
		chunk: { type: "string", description: "Chunk ID", required: true },
	},
);
registerCommand(
	"slice:chunk-decide",
	"Decide on an unverifiable chunk (accept, revert, or defer).",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
		slice: { type: "string", description: "Slice name", required: true },
		chunk: { type: "string", description: "Chunk ID", required: true },
	},
);
registerCommand("slice:code-refine-start", "Start code refinement for a slice.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
});
registerCommand("slice:code-refine-commit", "Record code refinement convergence for a slice.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	slice: { type: "string", description: "Slice name", required: true },
});
registerCommand(
	"slice:land",
	"Land a slice after code refinement convergence. Stdin: {deferred?, learnings?, architectureDelta?}.",
	{
		...globalArgDefs,
		epic: { type: "string", description: "Epic name", required: true },
		slice: { type: "string", description: "Slice name", required: true },
	},
);

// Task commands (task:list, task:show kept — task:create/drop/convert removed)
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

// Decision commands
registerCommand("decision:list", "List all decisions.", {
	...globalArgDefs,
	...listArgDefs,
});
registerCommand("decision:show", "Show details for a specific decision.", {
	...globalArgDefs,
	id: { type: "string", description: "Decision ID", required: true },
});

// Decision v2 event commands
registerCommand(
	"decision:record",
	"Record a decision (v2 event). Stdin: {id, domain, title, summary, entityPath?, reconsiderWhen?}.",
	{
		...globalArgDefs,
	},
);
registerCommand(
	"decision:supersede",
	"Supersede a decision (v2 event). Stdin: {decisionId, reason, supersededBy?}.",
	{
		...globalArgDefs,
	},
);

// Learning commands
registerCommand(
	"learning:capture",
	"Capture a learning (v2 event). Stdin: {summary, scope?, tags?}.",
	{
		...globalArgDefs,
	},
);
registerCommand("learning:list", "List learnings.", {
	...globalArgDefs,
	...listArgDefs,
	source: { type: "string", description: "Filter by source scope" },
});
registerCommand(
	"learning:promote",
	"Promote a learning to a wider scope (v2 event). Stdin: {learningId, from, to}.",
	{
		...globalArgDefs,
	},
);

// Activity commands
// Check if activity:list exists
// (It's referenced in commands-api.md but may not be implemented yet — skipping if absent)


// ── Subsystem commands ──────────────────────────────────────

registerCommand(
	"subsystem:register",
	"Register a new subsystem. Accepts stdin JSON { name, maturity, owns }.",
	{
		...globalArgDefs,
	},
);
registerCommand("subsystem:list", "List all registered subsystems with maturity and ownership.", {
	...globalArgDefs,
	...listArgDefs,
});
registerCommand("subsystem:show", "Show full subsystem details. Requires --name flag.", {
	...globalArgDefs,
	name: { type: "string", description: "Subsystem name", required: true },
});
registerCommand(
	"subsystem:update-maturity",
	"Update a subsystem's maturity level. Requires --name flag and stdin JSON { maturity }.",
	{
		...globalArgDefs,
		name: { type: "string", description: "Subsystem name", required: true },
	},
);
registerCommand("subsystem:retire", "Retire a subsystem. Requires --name flag.", {
	...globalArgDefs,
	name: { type: "string", description: "Subsystem name", required: true },
});

// ── Briefing commands ──────────────────────────────────────

registerCommand(
	"briefing:write",
	"Write a structured briefing. Accepts stdin JSON and --scope (project|epic) flag.",
	{
		...globalArgDefs,
		scope: {
			type: "string",
			description: 'Briefing scope: "project" or "epic" (default: "project")',
			default: "project",
		},
		epic: { type: "string", description: "Epic name (required when --scope epic)" },
	},
);
registerCommand("briefing:latest", "Return the most recent briefing for a given scope.", {
	...globalArgDefs,
	scope: { type: "string", description: 'Filter scope: "project" or "epic"' },
	"scope-ref": { type: "string", description: "Scope reference (e.g., epic name) to filter by" },
});

// ── Project commands ──────────────────────────────────────

registerCommand("project:show", "Show project metadata and subsystem summary.", {
	...globalArgDefs,
});
registerCommand(
	"project:set-steering",
	"Set the project steering preference. Accepts stdin JSON { preference }.",
	{
		...globalArgDefs,
	},
);

// ── Events commands ──────────────────────────────────────

registerCommand("events:tail", "Show recent events from a scope's event log.", {
	...globalArgDefs,
	scope: { type: "string", description: "Scope: project, epic, or side-quest" },
	"scope-ref": { type: "string", description: "Scope reference (e.g., epic name)" },
	n: { type: "string", description: "Number of events to show (default: 10)" },
});
registerCommand("events:query", "Query events from a scope's event log with optional filters.", {
	...globalArgDefs,
	scope: { type: "string", description: "Scope: project, epic, or side-quest" },
	"scope-ref": { type: "string", description: "Scope reference (e.g., epic name)" },
	domain: { type: "string", description: "Filter by event domain" },
	type: { type: "string", description: "Filter by event type" },
	after: { type: "string", description: "Only events at or after this ISO-8601 timestamp" },
	before: { type: "string", description: "Only events at or before this ISO-8601 timestamp" },
	limit: { type: "string", description: "Maximum number of events to return (default: 50)" },
});

// ── Finding commands ──────────────────────────────────────

registerCommand("finding:capture", "Capture a finding for an epic. Accepts stdin JSON.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});
registerCommand("finding:list", "List findings for an epic.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
	status: { type: "string", description: "Filter by disposition status" },
});
registerCommand("finding:triage", "Triage a finding. Stdin: {findingId, disposition, reason}.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name", required: true },
});

// ── Invariant commands ──────────────────────────────────────

registerCommand("invariant:list", "List all custom invariants.", {
	...globalArgDefs,
	...listArgDefs,
});
registerCommand("invariant:check", "Run invariant checks against a scope.", {
	...globalArgDefs,
});
registerCommand(
	"invariant:propose",
	"Propose a new custom invariant. Stdin: {description, rule?}.",
	{
		...globalArgDefs,
	},
);
registerCommand("invariant:activate", "Activate a proposed invariant. Stdin: {id}.", {
	...globalArgDefs,
});
registerCommand("invariant:deactivate", "Deactivate an invariant. Stdin: {id}.", {
	...globalArgDefs,
});

// ── Reviewer commands ──────────────────────────────────────

registerCommand("reviewer:list", "List all registered reviewers.", {
	...globalArgDefs,
	...listArgDefs,
});
registerCommand("reviewer:show", "Show details for a specific reviewer.", {
	...globalArgDefs,
	id: {
		type: "positional",
		description: "Reviewer agent ID (e.g., reviewer-holistic)",
		required: true,
	},
});

// ── Rubric commands ──────────────────────────────────────

registerCommand("rubric:list", "List all registered rubrics.", {
	...globalArgDefs,
	...listArgDefs,
});
registerCommand("rubric:show", "Show details for a specific rubric.", {
	...globalArgDefs,
	name: { type: "positional", description: "Rubric ID (e.g., holistic)", required: true },
});
registerCommand("rubric:validate", "Validate all rubrics.", {
	...globalArgDefs,
});

// ── Refine commands ──────────────────────────────────────

registerCommand("refine:start", "Start a new refinement round for an artifact.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name (mutually exclusive with --side-quest)" },
	"side-quest": { type: "string", description: "Side-quest name (mutually exclusive with --epic)" },
	"artifact-type": { type: "string", description: "Artifact type being refined", required: true },
});
registerCommand("refine:score", "Submit reviewer scores for the current refinement round.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name" },
	"side-quest": { type: "string", description: "Side-quest name" },
	"artifact-type": { type: "string", description: "Artifact type", required: true },
	reviewer: { type: "string", description: "Reviewer ID", required: true },
});
registerCommand("refine:synthesize", "Record feedback synthesis for the current round.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name" },
	"side-quest": { type: "string", description: "Side-quest name" },
	"artifact-type": { type: "string", description: "Artifact type", required: true },
});
registerCommand("refine:revise", "Record an artifact revision for the current round.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name" },
	"side-quest": { type: "string", description: "Side-quest name" },
	"artifact-type": { type: "string", description: "Artifact type", required: true },
});
registerCommand("refine:evaluate", "Evaluate convergence for the current round (read-only).", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name" },
	"side-quest": { type: "string", description: "Side-quest name" },
	"artifact-type": { type: "string", description: "Artifact type", required: true },
	"rubric-path": { type: "string", description: "Path to rubric YAML file" },
});
registerCommand("refine:converge", "Record convergence for the current round.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name" },
	"side-quest": { type: "string", description: "Side-quest name" },
	"artifact-type": { type: "string", description: "Artifact type", required: true },
	"rubric-path": { type: "string", description: "Path to rubric YAML file" },
});
registerCommand("refine:stuck", "Record a circuit breaker trip for the current round.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name" },
	"side-quest": { type: "string", description: "Side-quest name" },
	"artifact-type": { type: "string", description: "Artifact type", required: true },
	reason: { type: "string", description: "Explicit reason (if no auto-detected condition)" },
});
registerCommand("refine:override", "Override convergence evaluation with a manual decision.", {
	...globalArgDefs,
	epic: { type: "string", description: "Epic name" },
	"side-quest": { type: "string", description: "Side-quest name" },
	"artifact-type": { type: "string", description: "Artifact type", required: true },
	reason: { type: "string", description: "Reason for override", required: true },
});

// ── Side-quest commands ──────────────────────────────────

registerCommand("side-quest:create", "Create a new side-quest. Requires --name and --goal.", {
	...globalArgDefs,
	name: { type: "string", description: "Side-quest name (used as directory slug)", required: true },
	goal: { type: "string", description: "Side-quest goal description", required: true },
});
registerCommand("side-quest:list", "List all side-quests with status.", {
	...globalArgDefs,
});
registerCommand("side-quest:show", "Show side-quest details.", {
	...globalArgDefs,
	"side-quest": { type: "string", description: "Side-quest name", required: true },
});
registerCommand("side-quest:goal-commit", "Commit a side-quest goal. Stdin: {goal: ContentRef}.", {
	...globalArgDefs,
	"side-quest": { type: "string", description: "Side-quest name", required: true },
});
registerCommand("side-quest:plan-draft", "Draft a side-quest plan. Stdin: {plan: ContentRef}.", {
	...globalArgDefs,
	"side-quest": { type: "string", description: "Side-quest name", required: true },
});
registerCommand("side-quest:plan-shape-approve", "Approve the plan shape for a side-quest.", {
	...globalArgDefs,
	"side-quest": { type: "string", description: "Side-quest name", required: true },
});
registerCommand("side-quest:plan-commit", "Commit a side-quest plan. Stdin: {plan: ContentRef}.", {
	...globalArgDefs,
	"side-quest": { type: "string", description: "Side-quest name", required: true },
});
registerCommand("side-quest:implement-start", "Start implementation of a side-quest.", {
	...globalArgDefs,
	"side-quest": { type: "string", description: "Side-quest name", required: true },
});
registerCommand(
	"side-quest:chunk-start",
	"Start a chunk in a side-quest. Stdin: {chunkId, description}.",
	{
		...globalArgDefs,
		"side-quest": { type: "string", description: "Side-quest name", required: true },
	},
);
registerCommand(
	"side-quest:chunk-verify",
	"Verify a chunk in a side-quest. Stdin: {chunkId, evidence}.",
	{
		...globalArgDefs,
		"side-quest": { type: "string", description: "Side-quest name", required: true },
	},
);
registerCommand("side-quest:land", "Land (complete) a side-quest.", {
	...globalArgDefs,
	"side-quest": { type: "string", description: "Side-quest name", required: true },
});
registerCommand("side-quest:abandon", "Abandon a side-quest. Requires --reason.", {
	...globalArgDefs,
	"side-quest": { type: "string", description: "Side-quest name", required: true },
	reason: { type: "string", description: "Reason for abandoning", required: true },
});

// ── Event Schema Registry ───────────────────────────────────

/**
 * Maps event type names to their Zod payload schemas.
 * Used by `gp schema --events` to produce a JSON Schema catalog.
 */
export const eventSchemaRegistry: Record<string, z.ZodType> = {
	"project-initialized": projectInitializedPayloadSchema,
	"briefing-written": briefingWrittenPayloadSchema,
	"subsystem-registered": subsystemRegisteredPayloadSchema,
	"subsystem-maturity-updated": subsystemMaturityUpdatedPayloadSchema,
	"subsystem-retired": subsystemRetiredPayloadSchema,
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
