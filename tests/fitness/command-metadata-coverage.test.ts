/**
 * Fitness function: Command metadata coverage.
 * Bidirectional check ensuring commandToEvent stays in sync with
 * command files and transition tables.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { commandToEvent } from "../../src/core/rpc/next-commands.js";
import { collectTsFiles } from "./helpers.js";

// Import commandRegistry — must import schema.ts to trigger registration side effects
import "../../src/commands/global/schema.js";
import { commandRegistry } from "../../src/commands/global/schema.js";

import { decisionTransitions } from "../../src/core/state/transitions/decision.js";
// Import all transition arrays for reachability checks
import { createEpicTransitions } from "../../src/core/state/transitions/epic-create.js";
import { epicLifecycleTransitions } from "../../src/core/state/transitions/epic-lifecycle.js";
import { epicPhaseTransitions } from "../../src/core/state/transitions/epic-phase.js";
import { epicRefineTransitions } from "../../src/core/state/transitions/epic-refine.js";
import { epicVerifyTransitions } from "../../src/core/state/transitions/epic-verify.js";
import { abandonQuestTransitions } from "../../src/core/state/transitions/quest-abandon.js";
import { completeQuestTransitions } from "../../src/core/state/transitions/quest-complete.js";
import { createQuestTransitions } from "../../src/core/state/transitions/quest-create.js";
import { questImplementTransitions } from "../../src/core/state/transitions/quest-implement.js";
import { beginQuestPlanTransitions } from "../../src/core/state/transitions/quest-plan.js";
import { abandonSliceTransitions } from "../../src/core/state/transitions/slice-abandon.js";
import { completeSliceTransitions } from "../../src/core/state/transitions/slice-complete.js";
import { createSliceTransitions } from "../../src/core/state/transitions/slice-create.js";
import { sliceImplementTransitions } from "../../src/core/state/transitions/slice-implement.js";
import { beginPlanTransitions } from "../../src/core/state/transitions/slice-plan.js";
import {
	questSubmitTransitions,
	sliceSubmitTransitions,
} from "../../src/core/state/transitions/slice-submit.js";
import { createTaskTransitions } from "../../src/core/state/transitions/task-create.js";
import { taskLifecycleTransitions } from "../../src/core/state/transitions/task-lifecycle.js";

const SRC_DIR = path.resolve(import.meta.dirname, "../../src");
const COMMANDS_DIR = path.join(SRC_DIR, "commands");

/** Collect all events from all transition tables. */
function collectAllTransitionEvents(): Set<string> {
	const events = new Set<string>();
	const allTables = [
		createEpicTransitions,
		epicPhaseTransitions,
		epicRefineTransitions,
		epicLifecycleTransitions,
		epicVerifyTransitions,
		createSliceTransitions,
		beginPlanTransitions,
		sliceImplementTransitions,
		sliceSubmitTransitions,
		completeSliceTransitions,
		abandonSliceTransitions,
		createQuestTransitions,
		beginQuestPlanTransitions,
		questImplementTransitions,
		questSubmitTransitions,
		completeQuestTransitions,
		abandonQuestTransitions,
		createTaskTransitions,
		taskLifecycleTransitions,
		decisionTransitions,
	];
	for (const table of allTables) {
		for (const row of table) {
			events.add(row.event);
		}
	}
	return events;
}

describe("Command metadata coverage", () => {
	it("commandRegistry is populated (side-effect imports fired)", () => {
		expect(commandRegistry.size).toBeGreaterThan(0);
	});

	describe("forward check: every mutation command file has a commandToEvent entry", () => {
		const commandFiles = collectTsFiles(COMMANDS_DIR);
		const mutationFiles = commandFiles.filter((f) => {
			const source = fs.readFileSync(f, "utf-8");
			return (
				/\bbegin\s*\(/.test(source) ||
				/\bsubmit\s*\(/.test(source) ||
				/\bcomplete\s*\(/.test(source)
			);
		});

		it("should find mutation command files", () => {
			expect(mutationFiles.length).toBeGreaterThan(0);
		});

		// Build a set of commandToEvent command names for lookup
		const registeredCommands = new Set(commandToEvent.map((c) => c.command));

		for (const file of mutationFiles) {
			const relativePath = path.relative(SRC_DIR, file);
			// Derive command name from file path (e.g., "commands/epic/create.ts" -> "epic:create")
			const parts = relativePath
				.replace(/^commands\//, "")
				.replace(/\.ts$/, "")
				.split("/");
			let commandName: string;
			if (parts.length === 2) {
				const dir = parts[0];
				const base = parts[1];
				if (dir === undefined || base === undefined) continue;
				if (dir === "subagent") {
					commandName = base;
				} else if (dir === "global") {
					// Global commands like init, migrate — skip if not mutation
					continue;
				} else {
					commandName = `${dir}:${base}`;
				}
			} else {
				continue;
			}

			// Skip start-* commands (read-only context assembly)
			if (commandName.startsWith("start-")) continue;
			// Skip learning:rollup (uses RollupResult)
			if (commandName === "learning:rollup") continue;

			it(`${commandName} (${relativePath}) has a commandToEvent entry`, () => {
				expect(
					registeredCommands.has(commandName),
					`Mutation command "${commandName}" at ${relativePath} has no commandToEvent entry`,
				).toBe(true);
			});
		}
	});

	describe("reverse check: every user-facing commandToEvent entry has a command file", () => {
		const userFacingEntries = commandToEvent.filter((c) => c.userFacing);

		for (const entry of userFacingEntries) {
			it(`commandToEvent entry "${entry.command}" has a corresponding command file`, () => {
				// Derive expected file path
				let expectedPath: string;
				if (entry.command.includes(":")) {
					const colonIdx = entry.command.indexOf(":");
					const ns = entry.command.slice(0, colonIdx);
					const cmd = entry.command.slice(colonIdx + 1);
					expectedPath = path.join(COMMANDS_DIR, ns, `${cmd}.ts`);
				} else {
					expectedPath = path.join(COMMANDS_DIR, "subagent", `${entry.command}.ts`);
				}

				expect(
					fs.existsSync(expectedPath),
					`Expected command file at ${path.relative(SRC_DIR, expectedPath)} for commandToEvent entry "${entry.command}"`,
				).toBe(true);
			});
		}
	});

	describe("transition reachability: every commandToEvent event exists in transition tables", () => {
		const transitionEvents = collectAllTransitionEvents();

		for (const entry of commandToEvent) {
			it(`event "${entry.event}" for command "${entry.command}" exists in transition tables`, () => {
				expect(
					transitionEvents.has(entry.event),
					`Event "${entry.event}" from commandToEvent entry "${entry.command}" not found in any transition table`,
				).toBe(true);
			});
		}
	});

	describe("no (error) status keys in commandMappings", () => {
		// We test this indirectly by checking computeNextCommands for each entity type
		// doesn't produce commands for "(error)" status
		it("computeNextCommands returns empty for (error) status on all entity types", async () => {
			const { computeNextCommands } = await import("../../src/core/rpc/next-commands.js");
			const entityTypes: Array<{ target: Parameters<typeof computeNextCommands>[0] }> = [
				{ target: { type: "epic", name: "test" } },
				{ target: { type: "slice", name: "test", epic: "test" } },
				{ target: { type: "quest", name: "test" } },
				{ target: { type: "task", name: "test" } },
				{ target: { type: "decision", id: "test" } },
			];

			for (const { target } of entityTypes) {
				const result = computeNextCommands(target, "(error)");
				// Should not have any mutation commands (only show if present)
				const nonShowEntity = result.entity.filter(
					(c) => !c.command.includes(":show") && !c.command.includes("decision:show"),
				);
				expect(
					nonShowEntity.length,
					`Entity type "${target.type}" has mutation commands for "(error)" status`,
				).toBe(0);
			}
		});
	});

	describe("description drift check: descriptions are action-oriented, not schema help text", () => {
		const userFacingEntries = commandToEvent.filter((c) => c.userFacing);

		for (const entry of userFacingEntries) {
			it(`"${entry.command}" description is non-empty and action-oriented`, () => {
				expect(entry.description.length).toBeGreaterThan(0);

				const registryEntry = commandRegistry.get(entry.command);
				if (registryEntry !== undefined) {
					// Only flag exact matches that are long enough to be schema-level help text
					// (includes stdin format hints, usage details). Short action-oriented descriptions
					// like "Create a new epic" may legitimately match — that's fine.
					if (registryEntry.description.length > 40) {
						expect(
							entry.description,
							`commandToEvent description for "${entry.command}" appears to be copy-pasted from commandRegistry schema help text`,
						).not.toBe(registryEntry.description);
					}
				}
			});
		}
	});
});
