import { describe, expect, it } from "vitest";
import { createCoreRegistry } from "../../../src/engine/invariants/core-rules.js";

describe("createCoreRegistry", () => {
	it("registers exactly 24 core rules", () => {
		const registry = createCoreRegistry();
		expect(registry.getAll()).toHaveLength(24);
	});

	it("has no duplicate IDs", () => {
		const registry = createCoreRegistry();
		const ids = registry.getAll().map((r) => r.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("contains all expected rule IDs", () => {
		const registry = createCoreRegistry();
		const ids = new Set(registry.getAll().map((r) => r.id));

		const expected = [
			// Entity-lifecycle (17)
			"project.exists",
			"epic.single-active-per-branch",
			"epic.dir.unique",
			"epic.goal.committed-before-explore",
			"epic.architecture-target-required-before-slice-set",
			"epic.pressure-test-required-before-slice-set",
			"epic.architecture-shape-approval-required",
			"epic.slice-shape-approval-required",
			"epic.all-slices-landed-before-complete",
			"slice.single-active-per-branch",
			"slice.plan-shape-approval-required",
			"slice.plan-converged-before-implement",
			"slice.plan-chunks-decidable",
			"slice.chunks-all-decided-before-code-refine",
			"slice.code-refinement-converged-before-land",
			"slice.deps-landed-before-start",
			"side-quest.single-active-per-branch",
			// Domain invariants (7)
			"chunk.evidence-non-empty",
			"chunk.red-test-failed-before-green",
			"refinement.bar-matches-rubric",
			"spine.write-only-via-milestone",
			"event.prev-id-chain",
			"pressure-test.findings-all-accepted-before-slice-set",
			"briefing.written-at-pause",
		];

		for (const id of expected) {
			expect(ids.has(id)).toBe(true);
		}
	});

	it("returns rules retrievable by domain", () => {
		const registry = createCoreRegistry();
		const entityLifecycle = registry.getByDomain("entity-lifecycle");
		// 17 entity-lifecycle rules + pressure-test rule + event.prev-id-chain (empty appliesTo = all)
		expect(entityLifecycle.length).toBeGreaterThanOrEqual(17);
	});

	it("returns a fresh registry each call (no shared state)", () => {
		const a = createCoreRegistry();
		const b = createCoreRegistry();
		expect(a).not.toBe(b);
		expect(a.getAll()).toHaveLength(24);
		expect(b.getAll()).toHaveLength(24);
	});
});
