/**
 * Fitness function: Slice command registration completeness.
 *
 * Asserts that all 21 slice commands are registered in the commandRegistry
 * (which backs `gp schema --json`). This prevents regressions where a command
 * file is added but its registration in schema.ts is missed.
 */
import { describe, expect, it } from "vitest";

// Import schema.ts to trigger registration side effects
import "../../src/commands/global/schema.js";
import { commandRegistry } from "../../src/commands/global/schema.js";

/** The complete set of 21 slice commands (19 mutating + 2 read-only). */
const EXPECTED_SLICE_COMMANDS = [
	"slice:create",
	"slice:list",
	"slice:show",
	"slice:abandon",
	"slice:plan-draft",
	"slice:plan-commit",
	"slice:plan-shape-start",
	"slice:plan-shape-revise",
	"slice:plan-shape-approve",
	"slice:plan-shape-auto",
	"slice:implement-start",
	"slice:chunk-start",
	"slice:chunk-red-written",
	"slice:chunk-red-failed",
	"slice:chunk-green",
	"slice:chunk-verify",
	"slice:chunk-unverifiable",
	"slice:chunk-decide",
	"slice:code-refine-start",
	"slice:code-refine-commit",
	"slice:land",
] as const;

describe("Slice command registration completeness", () => {
	it("commandRegistry is populated", () => {
		expect(commandRegistry.size).toBeGreaterThan(0);
	});

	it("all 21 slice commands are registered", () => {
		const registeredNames = new Set(commandRegistry.keys());
		const missing: string[] = [];

		for (const cmd of EXPECTED_SLICE_COMMANDS) {
			if (!registeredNames.has(cmd)) {
				missing.push(cmd);
			}
		}

		expect(missing, `Missing slice commands: ${missing.join(", ")}`).toEqual([]);
	});

	it("exactly 21 slice: commands exist (no unexpected extras)", () => {
		const sliceCommands = [...commandRegistry.keys()].filter((name) => name.startsWith("slice:"));
		expect(sliceCommands.length).toBe(EXPECTED_SLICE_COMMANDS.length);
	});

	for (const cmd of EXPECTED_SLICE_COMMANDS) {
		it(`${cmd} has description and args`, () => {
			const entry = commandRegistry.get(cmd);
			expect(entry, `${cmd} not found in registry`).toBeDefined();
			expect(entry?.description.length).toBeGreaterThan(0);
			expect(typeof entry?.args).toBe("object");
		});
	}

	it("all slice mutation commands require --epic flag", () => {
		const mutationCommands = EXPECTED_SLICE_COMMANDS.filter((cmd) => cmd !== "slice:list");

		for (const cmd of mutationCommands) {
			const entry = commandRegistry.get(cmd);
			expect(entry, `${cmd} not found`).toBeDefined();
			expect(entry?.args.epic, `${cmd} should have --epic arg`).toBeDefined();
		}
	});

	it("chunk commands require --chunk flag", () => {
		const chunkCommands = EXPECTED_SLICE_COMMANDS.filter((cmd) => cmd.includes(":chunk-"));

		for (const cmd of chunkCommands) {
			const entry = commandRegistry.get(cmd);
			expect(entry, `${cmd} not found`).toBeDefined();
			expect(entry?.args.chunk, `${cmd} should have --chunk arg`).toBeDefined();
		}
	});
});
