import { describe, expect, it } from "vitest";
import { briefingWrittenAtPause } from "../../../../src/engine/invariants/rules/briefing.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("briefing.written-at-pause", () => {
	it("passes when briefing-written follows pause-entered", () => {
		const pause = makeEnvelope({
			type: "pause-entered",
			domain: "pause-steering",
		});
		const event = makeEnvelope({
			type: "briefing-written",
			domain: "briefing",
		});
		const ctx = buildCheckContext([pause]);
		expect(briefingWrittenAtPause.check(event, ctx)).toBeNull();
	});

	it("passes when last event is not pause-entered", () => {
		const other = makeEnvelope({
			type: "epic-created",
			domain: "entity-lifecycle",
		});
		const event = makeEnvelope({
			type: "chunk-verified",
			domain: "spine",
		});
		const ctx = buildCheckContext([other]);
		expect(briefingWrittenAtPause.check(event, ctx)).toBeNull();
	});

	it("passes when no prior events exist", () => {
		const event = makeEnvelope({
			type: "epic-created",
			domain: "entity-lifecycle",
		});
		const ctx = buildCheckContext([]);
		expect(briefingWrittenAtPause.check(event, ctx)).toBeNull();
	});

	it("passes for pause-entered event itself", () => {
		const event = makeEnvelope({
			type: "pause-entered",
			domain: "pause-steering",
		});
		const ctx = buildCheckContext([]);
		expect(briefingWrittenAtPause.check(event, ctx)).toBeNull();
	});

	it("fails when non-briefing event follows pause-entered", () => {
		const pause = makeEnvelope({
			type: "pause-entered",
			domain: "pause-steering",
		});
		const event = makeEnvelope({
			type: "epic-created",
			domain: "entity-lifecycle",
		});
		const ctx = buildCheckContext([pause]);
		const result = briefingWrittenAtPause.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("briefing-written");
		expect(result?.context?.pauseEventId).toBe(pause.id);
	});

	it("has correct metadata", () => {
		expect(briefingWrittenAtPause.id).toBe("briefing.written-at-pause");
		expect(briefingWrittenAtPause.ruleType).toBe("precondition");
		expect(briefingWrittenAtPause.appliesTo).toContain("briefing");
		expect(briefingWrittenAtPause.appliesTo).toContain("pause-steering");
	});
});
