import { epicStatusSchema } from "../../schemas/entities/epic.js";
import { questStatusSchema } from "../../schemas/entities/quest.js";
import { sliceStatusSchema } from "../../schemas/entities/slice.js";
import { taskStatusSchema } from "../../schemas/entities/task.js";
import { decisionStatusValues } from "../../schemas/records/decision.js";
/**
 * Next commands registry and computation.
 * Derives available CLI commands from transition tables + command-to-event mappings.
 * Pure functions — no I/O (INV-003 preserved, INV-004 maintained).
 */
import type { StateEvent } from "../../schemas/state-events.js";
import type { Target } from "./types.js";
import { resolveEntityName } from "./types.js";

import { decisionTransitions } from "../state/transitions/decision.js";
// Transition table imports
import { createEpicTransitions } from "../state/transitions/epic-create.js";
import { epicLifecycleTransitions } from "../state/transitions/epic-lifecycle.js";
import { epicPhaseTransitions } from "../state/transitions/epic-phase.js";
import { epicRefineTransitions } from "../state/transitions/epic-refine.js";
import { epicVerifyTransitions } from "../state/transitions/epic-verify.js";
import { PRE_ACTIVATED_STATUSES } from "../state/transitions/epic-verify.js";
import { abandonQuestTransitions } from "../state/transitions/quest-abandon.js";
import { completeQuestTransitions } from "../state/transitions/quest-complete.js";
import { createQuestTransitions } from "../state/transitions/quest-create.js";
import { questExploreTransitions } from "../state/transitions/quest-explore.js";
import { questImplementTransitions } from "../state/transitions/quest-implement.js";
import { beginQuestPlanTransitions } from "../state/transitions/quest-plan.js";
import { abandonSliceTransitions } from "../state/transitions/slice-abandon.js";
import { completeSliceTransitions } from "../state/transitions/slice-complete.js";
import { createSliceTransitions } from "../state/transitions/slice-create.js";
import { sliceImplementTransitions } from "../state/transitions/slice-implement.js";
import { beginPlanTransitions } from "../state/transitions/slice-plan.js";
import {
	questSubmitTransitions,
	sliceSubmitTransitions,
} from "../state/transitions/slice-submit.js";
import { createTaskTransitions } from "../state/transitions/task-create.js";
import { taskLifecycleTransitions } from "../state/transitions/task-lifecycle.js";

// ── Types ────────────────────────────────────────────────────

/**
 * Metadata for a single CLI command entry in the registry.
 * @property template — Command template string. Placeholders:
 *   `{name}` and `{epic}` are auto-interpolated from Target;
 *   `<reason>` (angle brackets) are user-supplied values.
 */
export interface CommandMetadataEntry {
	template: `gp ${string}`;
	description: string;
	userFacing: boolean;
}

export interface CommandEntry {
	command: string;
	description: string;
}

export interface NextCommands {
	entity: CommandEntry[];
	other: CommandEntry[];
}

export type NextCommandsEntityType = Exclude<Target["type"], "project" | "rollup">;

// ── Command-to-event mapping ────────────────────────────────

export const commandToEvent = [
	// Epic lifecycle
	{
		command: "epic:create",
		event: "CREATE_EPIC",
		entityType: "epic",
		template: "gp epic:create",
		description: "Create a new epic",
		userFacing: true,
	},
	{
		command: "epic:explore",
		event: "BEGIN_EXPLORE",
		entityType: "epic",
		template: "gp epic:explore --epic {name}",
		description: "Explore this epic",
		userFacing: true,
	},
	{
		command: "epic:define-architecture",
		event: "BEGIN_ARCHITECTURE",
		entityType: "epic",
		template: "gp epic:define-architecture --epic {name}",
		description: "Define architecture",
		userFacing: true,
	},
	{
		command: "epic:refine-architecture",
		event: "BEGIN_REFINE_ARCHITECTURE",
		entityType: "epic",
		template: "gp epic:refine-architecture --epic {name}",
		description: "Refine architecture",
		userFacing: true,
	},
	{
		command: "epic:define-slices",
		event: "BEGIN_SLICING",
		entityType: "epic",
		template: "gp epic:define-slices --epic {name}",
		description: "Define slices",
		userFacing: true,
	},
	{
		command: "epic:refine-slices",
		event: "BEGIN_REFINE_SLICES",
		entityType: "epic",
		template: "gp epic:refine-slices --epic {name}",
		description: "Refine slices",
		userFacing: true,
	},
	{
		command: "epic:activate",
		event: "ACTIVATE_EPIC",
		entityType: "epic",
		template: "gp epic:activate --epic {name}",
		description: "Activate this epic",
		userFacing: true,
	},
	{
		command: "epic:complete",
		event: "COMPLETE_EPIC",
		entityType: "epic",
		template: "gp epic:complete --epic {name}",
		description: "Complete this epic",
		userFacing: true,
	},
	{
		command: "epic:abandon",
		event: "ABANDON_EPIC",
		entityType: "epic",
		template: "gp epic:abandon --epic {name} --reason <reason>",
		description: "Abandon this epic",
		userFacing: true,
	},
	{
		command: "epic:add-verification",
		event: "ADD_VERIFICATION",
		entityType: "epic",
		template: "gp epic:add-verification --epic {name}",
		description: "Add verification criterion",
		userFacing: true,
	},
	{
		command: "epic:update-verification",
		event: "UPDATE_VERIFICATION",
		entityType: "epic",
		template: "gp epic:update-verification --epic {name} --index <index>",
		description: "Update verification criterion",
		userFacing: true,
	},
	// Epic submit (subagent — not user-facing)
	{
		command: "submit-explore",
		event: "COMPLETE_EXPLORE",
		entityType: "epic",
		template: "gp submit-explore --epic {name}",
		description: "Submit exploration results",
		userFacing: false,
	},
	{
		command: "submit-architecture",
		event: "COMPLETE_ARCHITECTURE",
		entityType: "epic",
		template: "gp submit-architecture --epic {name}",
		description: "Submit architecture",
		userFacing: false,
	},
	{
		command: "submit-slices",
		event: "COMPLETE_SLICING",
		entityType: "epic",
		template: "gp submit-slices --epic {name}",
		description: "Submit slice definitions",
		userFacing: false,
	},
	{
		command: "submit-refine-architecture",
		event: "COMPLETE_REFINE_ARCHITECTURE",
		entityType: "epic",
		template: "gp submit-refine-architecture --epic {name}",
		description: "Submit architecture refinement",
		userFacing: false,
	},
	{
		command: "submit-refine-slices",
		event: "COMPLETE_REFINE_SLICES",
		entityType: "epic",
		template: "gp submit-refine-slices --epic {name}",
		description: "Submit slice refinement",
		userFacing: false,
	},

	// Slice lifecycle
	{
		command: "slice:create",
		event: "CREATE_SLICE",
		entityType: "slice",
		template: "gp slice:create --epic {epic}",
		description: "Create a new slice",
		userFacing: true,
	},
	{
		command: "slice:plan",
		event: "BEGIN_PLAN",
		entityType: "slice",
		template: "gp slice:plan --slice {name}",
		description: "Begin planning",
		userFacing: true,
	},
	{
		command: "slice:refine-plan",
		event: "BEGIN_REFINEMENT",
		entityType: "slice",
		template: "gp slice:refine-plan --slice {name}",
		description: "Refine the plan",
		userFacing: true,
	},
	{
		command: "slice:implement",
		event: "BEGIN_IMPLEMENTATION",
		entityType: "slice",
		template: "gp slice:implement --slice {name}",
		description: "Begin implementation",
		userFacing: true,
	},
	{
		command: "slice:complete",
		event: "COMPLETE_SLICE",
		entityType: "slice",
		template: "gp slice:complete --slice {name}",
		description: "Complete this slice",
		userFacing: true,
	},
	{
		command: "slice:abandon",
		event: "ABANDON_SLICE",
		entityType: "slice",
		template: "gp slice:abandon --slice {name} --reason <reason>",
		description: "Abandon this slice",
		userFacing: true,
	},
	// Slice submit (subagent — not user-facing)
	{
		command: "submit-plan",
		event: "COMPLETE_PLAN",
		entityType: "slice",
		template: "gp submit-plan --slice {name}",
		description: "Submit plan",
		userFacing: false,
	},
	{
		command: "submit-refinement",
		event: "COMPLETE_REFINEMENT_ROUND",
		entityType: "slice",
		template: "gp submit-refinement --slice {name}",
		description: "Submit refinement scores",
		userFacing: false,
	},
	{
		command: "submit-implementation",
		event: "COMPLETE_IMPLEMENTATION",
		entityType: "slice",
		template: "gp submit-implementation --slice {name}",
		description: "Submit implementation",
		userFacing: false,
	},

	// Quest lifecycle
	{
		command: "quest:create",
		event: "CREATE_QUEST",
		entityType: "quest",
		template: "gp quest:create",
		description: "Create a new quest",
		userFacing: true,
	},
	{
		command: "quest:explore",
		event: "BEGIN_QUEST_EXPLORE",
		entityType: "quest",
		template: "gp quest:explore --quest {name}",
		description: "Explore this quest",
		userFacing: true,
	},
	// Quest explore submit (subagent — not user-facing)
	{
		command: "submit-explore",
		event: "COMPLETE_QUEST_EXPLORE",
		entityType: "quest",
		template: "gp submit-explore --quest {name}",
		description: "Submit quest exploration results",
		userFacing: false,
	},
	{
		command: "quest:plan",
		event: "BEGIN_QUEST_PLAN",
		entityType: "quest",
		template: "gp quest:plan --quest {name}",
		description: "Begin planning",
		userFacing: true,
	},
	{
		command: "quest:refine-plan",
		event: "BEGIN_QUEST_REFINEMENT",
		entityType: "quest",
		template: "gp quest:refine-plan --quest {name}",
		description: "Refine the plan",
		userFacing: true,
	},
	{
		command: "quest:implement",
		event: "BEGIN_QUEST_IMPLEMENTATION",
		entityType: "quest",
		template: "gp quest:implement --quest {name}",
		description: "Begin implementation",
		userFacing: true,
	},
	{
		command: "quest:complete",
		event: "COMPLETE_QUEST",
		entityType: "quest",
		template: "gp quest:complete --quest {name}",
		description: "Complete this quest",
		userFacing: true,
	},
	{
		command: "quest:abandon",
		event: "ABANDON_QUEST",
		entityType: "quest",
		template: "gp quest:abandon --quest {name} --reason <reason>",
		description: "Abandon this quest",
		userFacing: true,
	},
	// Quest submit (subagent — not user-facing)
	{
		command: "submit-plan",
		event: "COMPLETE_QUEST_PLAN",
		entityType: "quest",
		template: "gp submit-plan --quest {name}",
		description: "Submit plan",
		userFacing: false,
	},
	{
		command: "submit-refinement",
		event: "COMPLETE_QUEST_REFINEMENT_ROUND",
		entityType: "quest",
		template: "gp submit-refinement --quest {name}",
		description: "Submit refinement scores",
		userFacing: false,
	},
	{
		command: "submit-implementation",
		event: "COMPLETE_QUEST_IMPLEMENTATION",
		entityType: "quest",
		template: "gp submit-implementation --quest {name}",
		description: "Submit implementation",
		userFacing: false,
	},

	// Task lifecycle
	{
		command: "task:create",
		event: "CREATE_TASK",
		entityType: "task",
		template: "gp task:create",
		description: "Create a new task",
		userFacing: true,
	},
	{
		command: "task:drop",
		event: "DROP_TASK",
		entityType: "task",
		template: "gp task:drop --task {name} --reason <reason>",
		description: "Drop this task",
		userFacing: true,
	},
	{
		command: "task:convert",
		event: "CONVERT_TASK",
		entityType: "task",
		template: "gp task:convert --task {name} --to <quest|epic>",
		description: "Convert to quest or epic",
		userFacing: true,
	},

	// Decision lifecycle
	{
		command: "decision:create",
		event: "CREATE_DECISION",
		entityType: "decision",
		template: "gp decision:create",
		description: "Create a new decision",
		userFacing: true,
	},
	{
		command: "decision:update",
		event: "UPDATE_DECISION",
		entityType: "decision",
		template: "gp decision:update --id {name}",
		description: "Update this decision",
		userFacing: true,
	},
] as const satisfies ReadonlyArray<{
	command: string;
	event: StateEvent["type"];
	entityType: NextCommandsEntityType;
	template: `gp ${string}`;
	description: string;
	userFacing: boolean;
}>;

// ── Status sets for wildcard expansion ──────────────────────

const ENTITY_STATUSES: Record<NextCommandsEntityType, readonly string[]> = {
	epic: epicStatusSchema.options,
	slice: sliceStatusSchema.options,
	quest: questStatusSchema.options,
	task: taskStatusSchema.options,
	decision: decisionStatusValues,
};

const TERMINAL_STATUSES: Record<NextCommandsEntityType, ReadonlySet<string>> = {
	epic: new Set(["completed", "abandoned"]),
	slice: new Set(["completed", "abandoned"]),
	quest: new Set(["completed", "abandoned"]),
	task: new Set(["converted", "dropped"]),
	decision: new Set(["superseded"]),
};

// ── Derived registry ────────────────────────────────────────

/** Map<entityType, Map<fromStatus, CommandMetadataEntry[]>> — keyed by status the entity is IN when command is available */
const commandMappings: Map<NextCommandsEntityType, Map<string, CommandMetadataEntry[]>> = new Map();

/** All transition entries with entityType tagged, for derivation */
interface TaggedTransition {
	entityType: NextCommandsEntityType;
	from: string;
	event: string;
	to: string;
}

function collectAllTransitions(): TaggedTransition[] {
	const result: TaggedTransition[] = [];

	// Helper to tag and push
	function addAll(
		entityType: NextCommandsEntityType,
		transitions: ReadonlyArray<{ from: string; event: string; to: string }>,
	): void {
		for (const t of transitions) {
			result.push({ entityType, from: t.from, event: t.event, to: t.to });
		}
	}

	addAll("epic", createEpicTransitions);
	addAll("epic", epicPhaseTransitions);
	addAll("epic", epicRefineTransitions);
	addAll("epic", epicLifecycleTransitions);
	addAll("epic", epicVerifyTransitions);
	addAll("slice", createSliceTransitions);
	addAll("slice", beginPlanTransitions);
	addAll("slice", sliceImplementTransitions);
	addAll("slice", sliceSubmitTransitions);
	addAll("slice", completeSliceTransitions);
	addAll("slice", abandonSliceTransitions);
	addAll("quest", createQuestTransitions);
	addAll("quest", questExploreTransitions);
	addAll("quest", beginQuestPlanTransitions);
	addAll("quest", questImplementTransitions);
	addAll("quest", questSubmitTransitions);
	addAll("quest", completeQuestTransitions);
	addAll("quest", abandonQuestTransitions);
	addAll("task", createTaskTransitions);
	addAll("task", taskLifecycleTransitions);
	addAll("decision", decisionTransitions);

	return result;
}

/**
 * Expand wildcard `from` values to concrete status sets.
 * Handles: `*(non-terminal)`, `* (non-terminal)`, `*(pre-activated)`, `* (pre-activated)`.
 * `* (terminal)` wildcards are always paired with `to: "(error)"` and eliminated by the error filter.
 */
function expandWildcard(from: string, entityType: NextCommandsEntityType): string[] {
	const normalized = from.replace(/\s+/g, "");
	if (normalized === "*(non-terminal)") {
		const terminal = TERMINAL_STATUSES[entityType];
		return (ENTITY_STATUSES[entityType] ?? []).filter((s) => !terminal.has(s));
	}
	if (normalized === "*(pre-activated)") {
		return [...PRE_ACTIVATED_STATUSES];
	}
	// *(terminal) wildcards are always paired with to:"(error)" and eliminated by
	// the error filter — no expansion needed.
	// Not a wildcard
	return [from];
}

function buildCommandMappings(): void {
	const allTransitions = collectAllTransitions();

	for (const t of allTransitions) {
		// Filter out (error) rows
		if (t.to === "(error)") continue;

		// Expand wildcard from values
		const fromStatuses = expandWildcard(t.from, t.entityType);

		for (const fromStatus of fromStatuses) {
			// Find matching commandToEvent entries
			for (const cmd of commandToEvent) {
				if (cmd.event === t.event && cmd.entityType === t.entityType) {
					let entityMap = commandMappings.get(t.entityType);
					if (entityMap === undefined) {
						entityMap = new Map();
						commandMappings.set(t.entityType, entityMap);
					}

					let entries = entityMap.get(fromStatus);
					if (entries === undefined) {
						entries = [];
						entityMap.set(fromStatus, entries);
					}

					// Avoid duplicates (same command+template for same entityType+status)
					const alreadyPresent = entries.some(
						(e) => e.template === cmd.template && e.description === cmd.description,
					);
					if (!alreadyPresent) {
						entries.push({
							template: cmd.template,
							description: cmd.description,
							userFacing: cmd.userFacing,
						});
					}
				}
			}
		}
	}
}

// Build at module init — deterministic derivation from static transition tables.
// Tradeoff: no lazy init or test reset seam. Acceptable since inputs are immutable.
buildCommandMappings();

// ── Read commands (static per entity type) ──────────────────

const READ_COMMANDS: Record<
	NextCommandsEntityType,
	{ template: `gp ${string}`; description: string }
> = {
	epic: { template: "gp epic:show --epic {name}", description: "Show epic details" },
	slice: { template: "gp slice:show --slice {name}", description: "Show slice details" },
	quest: { template: "gp quest:show --quest {name}", description: "Show quest details" },
	task: { template: "gp task:show --task {name}", description: "Show task details" },
	decision: { template: "gp decision:show --id {name}", description: "Show decision details" },
};

// ── Creation commands for "other" section ───────────────────
// Deliberately excludes decision:create — decisions are context-specific (tied to
// a particular architectural question), not general-purpose "create next" suggestions.

const CREATION_COMMANDS: Array<{
	entityType: NextCommandsEntityType;
	command: string;
	description: string;
}> = [
	{ entityType: "epic", command: "gp epic:create", description: "Create a new epic" },
	{ entityType: "quest", command: "gp quest:create", description: "Create a new quest" },
	{ entityType: "task", command: "gp task:create", description: "Create a new task" },
];

// ── Template interpolation ──────────────────────────────────

function interpolateTemplate(template: string, target: Target): string {
	const name = resolveEntityName(target);
	let result = template.replace(/\{name\}/g, name);
	if (target.type === "slice") {
		result = result.replace(/\{epic\}/g, target.epic);
	}
	return result;
}

// ── Main exported function ──────────────────────────────────

/**
 * Compute available next commands for an entity after a mutation.
 * Pure function — takes explicit params, no ambient state (INV-004).
 */
export function computeNextCommands(target: Target, newStatus: string): NextCommands {
	// Guard on target.type first, then let TypeScript narrow naturally
	if (target.type === "project" || target.type === "rollup") {
		return { entity: [], other: [] };
	}
	const entityType: NextCommandsEntityType = target.type;

	const terminal = TERMINAL_STATUSES[entityType];
	const isTerminal = terminal.has(newStatus);

	// Entity section
	const entityMap = commandMappings.get(entityType);
	const statusEntries = entityMap?.get(newStatus);

	// Unknown status: graceful degradation — return empty (no guesses)
	if (statusEntries === undefined && !isTerminal) {
		return { entity: [], other: [] };
	}

	const entityCommands: CommandEntry[] = [];

	// Add user-facing commands from registry (preserves transition table order)
	for (const entry of statusEntries ?? []) {
		if (entry.userFacing) {
			entityCommands.push({
				command: interpolateTemplate(entry.template, target),
				description: entry.description,
			});
		}
	}

	// Add read command (always, for both terminal and non-terminal)
	const readCmd = READ_COMMANDS[entityType];
	if (readCmd !== undefined) {
		entityCommands.push({
			command: interpolateTemplate(readCmd.template, target),
			description: readCmd.description,
		});
	}

	// For terminal statuses, entity is show-only, other is empty
	if (isTerminal) {
		return { entity: entityCommands, other: [] };
	}

	// Other section: curated creation commands, excluding current entity type
	const otherCommands: CommandEntry[] = CREATION_COMMANDS.filter((c) => c.entityType !== entityType)
		.map((c) => ({ command: c.command, description: c.description }))
		.sort((a, b) => a.command.localeCompare(b.command));

	return { entity: entityCommands, other: otherCommands };
}
