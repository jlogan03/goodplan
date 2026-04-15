import { describe, expect, it } from "vitest";
import { sideQuestSingleActivePerBranch } from "../../../../src/engine/invariants/rules/side-quest.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("side-quest.single-active-per-branch", () => {
	it("passes for first side-quest-created on a branch", () => {
		const event = makeEnvelope({ type: "side-quest-created", branch: "main" });
		const ctx = buildCheckContext([]);
		expect(sideQuestSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("fails when an active side quest already exists on same branch", () => {
		const prior = makeEnvelope({ type: "side-quest-created", branch: "main" });
		const event = makeEnvelope({ type: "side-quest-created", branch: "main" });
		const ctx = buildCheckContext([prior]);
		const result = sideQuestSingleActivePerBranch.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("active side quest");
	});

	it("passes when prior side quest was completed", () => {
		const created = makeEnvelope({ type: "side-quest-created", branch: "main" });
		const completed = makeEnvelope({ type: "side-quest-completed", branch: "main" });
		const event = makeEnvelope({ type: "side-quest-created", branch: "main" });
		const ctx = buildCheckContext([created, completed]);
		expect(sideQuestSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("passes when prior side quest was abandoned", () => {
		const created = makeEnvelope({ type: "side-quest-created", branch: "main" });
		const abandoned = makeEnvelope({ type: "side-quest-abandoned", branch: "main" });
		const event = makeEnvelope({ type: "side-quest-created", branch: "main" });
		const ctx = buildCheckContext([created, abandoned]);
		expect(sideQuestSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("passes for different branches", () => {
		const prior = makeEnvelope({ type: "side-quest-created", branch: "feat-a" });
		const event = makeEnvelope({ type: "side-quest-created", branch: "feat-b" });
		const ctx = buildCheckContext([prior]);
		expect(sideQuestSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("ignores non-side-quest-created events", () => {
		const event = makeEnvelope({ type: "side-quest-completed", branch: "main" });
		const ctx = buildCheckContext([]);
		expect(sideQuestSingleActivePerBranch.check(event, ctx)).toBeNull();
	});
});
