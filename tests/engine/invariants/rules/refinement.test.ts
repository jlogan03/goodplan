import { describe, expect, it } from "vitest";
import { refinementBarMatchesRubric } from "../../../../src/engine/invariants/rules/refinement.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("refinement.bar-matches-rubric", () => {
	it("passes with valid rubric ref and scored dimensions", () => {
		const event = makeEnvelope({
			type: "refinement-converged",
			domain: "refinement",
			payload: {
				rubricRef: "rubrics/holistic.yaml",
				dimensions: [
					{ name: "alignment", score: 4 },
					{ name: "completeness", score: 5 },
				],
			},
		});
		const ctx = buildCheckContext([]);
		expect(refinementBarMatchesRubric.check(event, ctx)).toBeNull();
	});

	it("fails when payload is missing rubricRef", () => {
		const event = makeEnvelope({
			type: "refinement-converged",
			domain: "refinement",
			payload: {
				dimensions: [{ name: "alignment", score: 4 }],
			},
		});
		const ctx = buildCheckContext([]);
		const result = refinementBarMatchesRubric.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("rubricRef");
	});

	it("fails when payload is missing dimensions", () => {
		const event = makeEnvelope({
			type: "refinement-converged",
			domain: "refinement",
			payload: { rubricRef: "rubrics/holistic.yaml" },
		});
		const ctx = buildCheckContext([]);
		const result = refinementBarMatchesRubric.check(event, ctx);
		expect(result).not.toBeNull();
	});

	it("fails when dimensions array is empty", () => {
		const event = makeEnvelope({
			type: "refinement-converged",
			domain: "refinement",
			payload: {
				rubricRef: "rubrics/holistic.yaml",
				dimensions: [],
			},
		});
		const ctx = buildCheckContext([]);
		const result = refinementBarMatchesRubric.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("dimension");
	});

	it("ignores non-refinement-converged events", () => {
		const event = makeEnvelope({ type: "epic-created", domain: "entity-lifecycle" });
		const ctx = buildCheckContext([]);
		expect(refinementBarMatchesRubric.check(event, ctx)).toBeNull();
	});

	it("has correct metadata", () => {
		expect(refinementBarMatchesRubric.id).toBe("refinement.bar-matches-rubric");
		expect(refinementBarMatchesRubric.ruleType).toBe("required");
		expect(refinementBarMatchesRubric.appliesTo).toContain("refinement");
	});
});
