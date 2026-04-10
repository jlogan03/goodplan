import { describe, expect, it } from "vitest";
import { projectExists } from "../../../../src/engine/invariants/rules/project.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("project.exists", () => {
	it("passes for project-initialized event with empty history", () => {
		const event = makeEnvelope({ type: "project-initialized" });
		const ctx = buildCheckContext([]);
		expect(projectExists.check(event, ctx)).toBeNull();
	});

	it("passes when project-initialized exists in prior events", () => {
		const init = makeEnvelope({ type: "project-initialized" });
		const event = makeEnvelope({ type: "epic-created" });
		const ctx = buildCheckContext([init]);
		expect(projectExists.check(event, ctx)).toBeNull();
	});

	it("fails when no project-initialized exists and event is not project-initialized", () => {
		const event = makeEnvelope({ type: "epic-created" });
		const ctx = buildCheckContext([]);
		const result = projectExists.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("project-initialized");
	});

	it("has correct metadata", () => {
		expect(projectExists.id).toBe("project.exists");
		expect(projectExists.ruleType).toBe("precondition");
		expect(projectExists.appliesTo).toContain("entity-lifecycle");
	});
});
