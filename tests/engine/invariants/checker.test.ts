import { describe, expect, it } from "vitest";
import { checkInvariants } from "../../../src/engine/invariants/checker.js";
import type { CheckContext, InvariantRule } from "../../../src/engine/invariants/types.js";
import { buildCheckContext } from "../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./rules/_test-helpers.js";

function passingRule(id: string): InvariantRule {
	return {
		id,
		ruleType: "custom",
		description: `Passing: ${id}`,
		appliesTo: [],
		check: () => null,
	};
}

function failingRule(id: string, message: string): InvariantRule {
	return {
		id,
		ruleType: "custom",
		description: `Failing: ${id}`,
		appliesTo: [],
		check: () => ({ message }),
	};
}

describe("checkInvariants", () => {
	const event = makeEnvelope({ type: "epic-created" });
	const ctx: CheckContext = buildCheckContext([]);

	it("returns passed: true with empty rule set", () => {
		const result = checkInvariants(event, ctx, []);
		expect(result).toEqual({ passed: true });
	});

	it("returns passed: true when all rules pass", () => {
		const result = checkInvariants(event, ctx, [passingRule("a"), passingRule("b")]);
		expect(result).toEqual({ passed: true });
	});

	it("returns passed: false with single failing rule", () => {
		const result = checkInvariants(event, ctx, [failingRule("rule-x", "boom")]);
		expect(result.passed).toBe(false);
		if (!result.passed) {
			expect(result.violations).toHaveLength(1);
			expect(result.violations[0]?.ruleId).toBe("rule-x");
			expect(result.violations[0]?.message).toBe("boom");
		}
	});

	it("collects all violations, not just the first", () => {
		const result = checkInvariants(event, ctx, [
			failingRule("fail-1", "first"),
			passingRule("pass-1"),
			failingRule("fail-2", "second"),
		]);
		expect(result.passed).toBe(false);
		if (!result.passed) {
			expect(result.violations).toHaveLength(2);
			expect(result.violations.map((v) => v.ruleId)).toEqual(["fail-1", "fail-2"]);
		}
	});

	it("preserves violation context via conditional spread", () => {
		const ruleWithContext: InvariantRule = {
			id: "ctx-rule",
			ruleType: "custom",
			description: "Rule with context",
			appliesTo: [],
			check: () => ({
				message: "failed",
				context: { epicSlug: "my-epic", count: 2 },
			}),
		};

		const result = checkInvariants(event, ctx, [ruleWithContext]);
		expect(result.passed).toBe(false);
		if (!result.passed) {
			expect(result.violations[0]?.context).toEqual({ epicSlug: "my-epic", count: 2 });
		}
	});

	it("omits context key when violation data has no context", () => {
		const result = checkInvariants(event, ctx, [failingRule("no-ctx", "no context")]);
		expect(result.passed).toBe(false);
		if (!result.passed) {
			const violation = result.violations[0];
			expect(violation).toBeDefined();
			// With exactOptionalPropertyTypes, context should not be present at all
			expect("context" in (violation ?? {})).toBe(false);
		}
	});
});
