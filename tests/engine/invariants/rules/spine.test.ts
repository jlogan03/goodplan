import { describe, expect, it } from "vitest";
import { spineWriteOnlyViaMilestone } from "../../../../src/engine/invariants/rules/spine.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("spine.write-only-via-milestone", () => {
	it("passes when preceded by milestone-committed", () => {
		const milestone = makeEnvelope({
			type: "milestone-committed",
			domain: "milestone",
		});
		const event = makeEnvelope({
			type: "architecture-committed",
			domain: "spine",
		});
		const ctx = buildCheckContext([milestone]);
		expect(spineWriteOnlyViaMilestone.check(event, ctx)).toBeNull();
	});

	it("fails when preceded by a non-milestone event", () => {
		const other = makeEnvelope({
			type: "epic-created",
			domain: "entity-lifecycle",
		});
		const event = makeEnvelope({
			type: "architecture-committed",
			domain: "spine",
		});
		const ctx = buildCheckContext([other]);
		const result = spineWriteOnlyViaMilestone.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("milestone-committed");
	});

	it("fails when no prior events exist", () => {
		const event = makeEnvelope({
			type: "conventions-committed",
			domain: "spine",
		});
		const ctx = buildCheckContext([]);
		const result = spineWriteOnlyViaMilestone.check(event, ctx);
		expect(result).not.toBeNull();
	});

	it("ignores non-spine-mutation events", () => {
		const event = makeEnvelope({ type: "epic-created", domain: "entity-lifecycle" });
		const ctx = buildCheckContext([]);
		expect(spineWriteOnlyViaMilestone.check(event, ctx)).toBeNull();
	});

	it("has correct metadata", () => {
		expect(spineWriteOnlyViaMilestone.id).toBe("spine.write-only-via-milestone");
		expect(spineWriteOnlyViaMilestone.ruleType).toBe("custom");
		expect(spineWriteOnlyViaMilestone.appliesTo).toContain("spine");
		expect(spineWriteOnlyViaMilestone.appliesTo).toContain("milestone");
	});
});
