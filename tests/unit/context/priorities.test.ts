import { describe, expect, it } from "vitest";
import { getPriorityTable } from "../../../src/core/context/priorities.js";
import type { SubmitPhase } from "../../../src/core/context/types.js";

const ALL_PHASES: SubmitPhase[] = [
	"plan",
	"refinement",
	"implementation",
	"complete",
	"explore",
	"architecture",
	"slices",
	"refine-architecture",
	"refine-slices",
];

describe("getPriorityTable", () => {
	it("returns a non-empty table for every phase", () => {
		for (const phase of ALL_PHASES) {
			const table = getPriorityTable(phase);
			expect(table.length).toBeGreaterThan(0);
		}
	});

	it("all 9 phases have valid priority tables", () => {
		expect(ALL_PHASES).toHaveLength(9);
		for (const phase of ALL_PHASES) {
			const table = getPriorityTable(phase);
			expect(table).toBeDefined();
		}
	});

	it("each source has key, path, and sourceType", () => {
		for (const phase of ALL_PHASES) {
			const table = getPriorityTable(phase);
			for (const source of table) {
				expect(source.key).toBeDefined();
				expect(typeof source.key).toBe("string");
				expect(source.path).toBeDefined();
				expect(source.sourceType).toMatch(/^(markdown|directory)$/);
			}
		}
	});

	it("plan phase starts with entity-goal", () => {
		const table = getPriorityTable("plan");
		expect(table[0]!.key).toBe("entity-goal");
	});

	it("refinement phase starts with plan", () => {
		const table = getPriorityTable("refinement");
		expect(table[0]!.key).toBe("plan");
	});

	it("implementation phase starts with refined-plan", () => {
		const table = getPriorityTable("implementation");
		expect(table[0]!.key).toBe("refined-plan");
	});

	it("complete phase starts with entity-goal", () => {
		const table = getPriorityTable("complete");
		expect(table[0]!.key).toBe("entity-goal");
	});

	it("explore phase starts with epic-goal", () => {
		const table = getPriorityTable("explore");
		expect(table[0]!.key).toBe("epic-goal");
	});

	it("architecture phase starts with epic-goal", () => {
		const table = getPriorityTable("architecture");
		expect(table[0]!.key).toBe("epic-goal");
	});

	it("slices phase starts with epic-goal", () => {
		const table = getPriorityTable("slices");
		expect(table[0]!.key).toBe("epic-goal");
	});

	it("refine-architecture phase starts with epic-goal", () => {
		const table = getPriorityTable("refine-architecture");
		expect(table[0]!.key).toBe("epic-goal");
	});

	it("refine-slices phase starts with epic-goal", () => {
		const table = getPriorityTable("refine-slices");
		expect(table[0]!.key).toBe("epic-goal");
	});

	it("all phases include conventions except complete", () => {
		for (const phase of ALL_PHASES) {
			const table = getPriorityTable(phase);
			const hasConventions = table.some((s) => s.key === "conventions");
			if (phase === "complete") {
				expect(hasConventions).toBe(false);
			} else {
				expect(hasConventions).toBe(true);
			}
		}
	});
});
