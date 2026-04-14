import { describe, expect, it } from "vitest";
import { InvariantRegistry } from "../../../src/engine/invariants/registry.js";
import type { InvariantRule } from "../../../src/engine/invariants/types.js";

function mockRule(id: string, appliesTo: InvariantRule["appliesTo"] = []): InvariantRule {
	return {
		id,
		ruleType: "custom",
		description: `Mock rule: ${id}`,
		appliesTo,
		check: () => null,
	};
}

describe("InvariantRegistry", () => {
	it("registers and retrieves rules by ID", () => {
		const registry = new InvariantRegistry();
		const rule = mockRule("test.rule");
		registry.register(rule);

		expect(registry.getById("test.rule")).toBe(rule);
	});

	it("returns undefined for unknown rule IDs", () => {
		const registry = new InvariantRegistry();
		expect(registry.getById("nonexistent")).toBeUndefined();
	});

	it("throws on duplicate rule ID", () => {
		const registry = new InvariantRegistry();
		registry.register(mockRule("dup.rule"));

		expect(() => registry.register(mockRule("dup.rule"))).toThrow(
			'Duplicate invariant rule ID: "dup.rule"',
		);
	});

	it("getAll returns all registered rules", () => {
		const registry = new InvariantRegistry();
		registry.register(mockRule("a"));
		registry.register(mockRule("b"));
		registry.register(mockRule("c"));

		expect(registry.getAll()).toHaveLength(3);
	});

	it("getAll returns empty array when no rules registered", () => {
		const registry = new InvariantRegistry();
		expect(registry.getAll()).toEqual([]);
	});

	describe("getByDomain", () => {
		it("returns rules that include the given domain", () => {
			const registry = new InvariantRegistry();
			registry.register(mockRule("lifecycle-rule", ["entity-lifecycle"]));
			registry.register(mockRule("spine-rule", ["spine"]));
			registry.register(mockRule("multi-domain", ["entity-lifecycle", "spine"]));

			const lifecycleRules = registry.getByDomain("entity-lifecycle");
			expect(lifecycleRules.map((r) => r.id).sort()).toEqual(["lifecycle-rule", "multi-domain"]);
		});

		it("returns rules with empty appliesTo (applies to all domains)", () => {
			const registry = new InvariantRegistry();
			registry.register(mockRule("universal", []));
			registry.register(mockRule("specific", ["spine"]));

			const lifecycleRules = registry.getByDomain("entity-lifecycle");
			expect(lifecycleRules.map((r) => r.id)).toEqual(["universal"]);
		});

		it("returns empty array when no rules match", () => {
			const registry = new InvariantRegistry();
			registry.register(mockRule("spine-only", ["spine"]));

			expect(registry.getByDomain("entity-lifecycle")).toEqual([]);
		});
	});
});
