import { describe, expect, it } from "vitest";
import { eventPrevIdChain } from "../../../../src/engine/invariants/rules/structural.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("event.prev-id-chain", () => {
	it("passes when prevId is null and no prior events exist", () => {
		const event = makeEnvelope({ type: "project-initialized", prevId: null });
		const ctx = buildCheckContext([]);
		expect(eventPrevIdChain.check(event, ctx)).toBeNull();
	});

	it("passes when prevId matches last event id", () => {
		const first = makeEnvelope({ type: "project-initialized", prevId: null });
		const event = makeEnvelope({ type: "epic-created", prevId: first.id });
		const ctx = buildCheckContext([first]);
		expect(eventPrevIdChain.check(event, ctx)).toBeNull();
	});

	it("fails when prevId does not match last event id", () => {
		const first = makeEnvelope({ type: "project-initialized", prevId: null });
		const event = makeEnvelope({
			type: "epic-created",
			prevId: "00000000-0000-0000-0000-000000000000",
		});
		const ctx = buildCheckContext([first]);
		const result = eventPrevIdChain.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("does not match");
	});

	it("fails when prevId is null but prior events exist", () => {
		const first = makeEnvelope({ type: "project-initialized", prevId: null });
		const event = makeEnvelope({ type: "epic-created", prevId: null });
		const ctx = buildCheckContext([first]);
		const result = eventPrevIdChain.check(event, ctx);
		expect(result).not.toBeNull();
	});

	it("fails when prevId is set but no prior events exist", () => {
		const event = makeEnvelope({
			type: "project-initialized",
			prevId: "00000000-0000-0000-0000-000000000000",
		});
		const ctx = buildCheckContext([]);
		const result = eventPrevIdChain.check(event, ctx);
		expect(result).not.toBeNull();
	});

	it("has correct metadata", () => {
		expect(eventPrevIdChain.id).toBe("event.prev-id-chain");
		expect(eventPrevIdChain.ruleType).toBe("custom");
		// appliesTo empty means applies to all domains
		expect(eventPrevIdChain.appliesTo).toHaveLength(0);
	});
});
