/**
 * Fitness function: Invariant engine slice rule registration.
 *
 * Verifies that all slice-related invariant rules are properly registered
 * in the core registry and use the correct event names from the TDD chunk model.
 */
import { describe, expect, it } from "vitest";
import { createCoreRegistry } from "../../src/engine/invariants/core-rules.js";

describe("Invariant engine: slice rule registration", () => {
	const registry = createCoreRegistry();
	const allRules = registry.getAll();
	const ruleIds = allRules.map((r) => r.id);

	/** Expected slice invariant rule IDs. */
	const EXPECTED_SLICE_RULES = [
		"slice.single-active-per-branch",
		"slice.created-before-plan",
		"slice.plan-drafted-before-commit",
		"slice.plan-drafted-before-shape",
		"slice.plan-shape-approval-required",
		"slice.plan-shape-checkpoint-active",
		"slice.plan-converged-before-implement",
		"slice.plan-chunks-decidable",
		"slice.chunks-all-decided-before-code-refine",
		"slice.code-refinement-started-before-converged",
		"slice.code-refinement-converged-before-land",
		"slice.deps-landed-before-start",
		"slice.implementation-started-before-chunk",
	];

	/** Expected chunk invariant rule IDs. */
	const EXPECTED_CHUNK_RULES = ["chunk.evidence-non-empty", "chunk.red-test-failed-before-green"];

	it("all slice invariant rules are registered", () => {
		const missing: string[] = [];
		for (const id of EXPECTED_SLICE_RULES) {
			if (!ruleIds.includes(id)) {
				missing.push(id);
			}
		}
		expect(missing, `Missing slice invariant rules: ${missing.join(", ")}`).toEqual([]);
	});

	it("all chunk invariant rules are registered", () => {
		const missing: string[] = [];
		for (const id of EXPECTED_CHUNK_RULES) {
			if (!ruleIds.includes(id)) {
				missing.push(id);
			}
		}
		expect(missing, `Missing chunk invariant rules: ${missing.join(", ")}`).toEqual([]);
	});

	it("chunk.red-test-failed-before-green applies to entity-lifecycle domain", () => {
		const rule = registry.getById("chunk.red-test-failed-before-green");
		expect(rule).toBeDefined();
		expect(rule?.appliesTo).toContain("entity-lifecycle");
	});

	it("slice.chunks-all-decided-before-code-refine applies to entity-lifecycle domain", () => {
		const rule = registry.getById("slice.chunks-all-decided-before-code-refine");
		expect(rule).toBeDefined();
		expect(rule?.appliesTo).toContain("entity-lifecycle");
	});

	it("slice.implementation-started-before-chunk applies to entity-lifecycle domain", () => {
		const rule = registry.getById("slice.implementation-started-before-chunk");
		expect(rule).toBeDefined();
		expect(rule?.appliesTo).toContain("entity-lifecycle");
	});

	it("all registered rules have unique IDs (no duplicates possible via registry)", () => {
		const idSet = new Set(ruleIds);
		expect(idSet.size).toBe(allRules.length);
	});

	it("every slice/chunk rule has a non-empty description", () => {
		const relevantRules = allRules.filter(
			(r) => r.id.startsWith("slice.") || r.id.startsWith("chunk."),
		);
		for (const rule of relevantRules) {
			expect(rule.description.length, `Rule ${rule.id} has empty description`).toBeGreaterThan(0);
		}
	});

	it("every rule has a valid ruleType", () => {
		const validTypes = new Set([
			"unique",
			"count_limit",
			"required",
			"foreign_key",
			"all_match",
			"precondition",
			"custom",
		]);
		const relevantRules = allRules.filter(
			(r) => r.id.startsWith("slice.") || r.id.startsWith("chunk."),
		);
		for (const rule of relevantRules) {
			expect(
				validTypes.has(rule.ruleType),
				`Rule ${rule.id} has invalid ruleType: ${rule.ruleType}`,
			).toBe(true);
		}
	});
});
