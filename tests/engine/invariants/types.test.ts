import { describe, expect, it } from "vitest";
import { InvariantError, buildCheckContext } from "../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./rules/_test-helpers.js";

describe("buildCheckContext", () => {
	it("returns empty maps for an empty event array", () => {
		const ctx = buildCheckContext([]);
		expect(ctx.allEvents).toEqual([]);
		expect(ctx.eventsByType.size).toBe(0);
		expect(ctx.eventsByScopeRef.size).toBe(0);
	});

	it("indexes events by type", () => {
		const e1 = makeEnvelope({ type: "epic-created" });
		const e2 = makeEnvelope({ type: "slice-created" });
		const e3 = makeEnvelope({ type: "epic-created" });

		const ctx = buildCheckContext([e1, e2, e3]);

		expect(ctx.eventsByType.get("epic-created")).toEqual([e1, e3]);
		expect(ctx.eventsByType.get("slice-created")).toEqual([e2]);
		expect(ctx.eventsByType.get("nonexistent")).toBeUndefined();
	});

	it("indexes events by scopeRef, skipping null scopeRef", () => {
		const e1 = makeEnvelope({ scopeRef: "my-epic", type: "epic-created" });
		const e2 = makeEnvelope({ scopeRef: null, type: "project-initialized" });
		const e3 = makeEnvelope({ scopeRef: "my-epic", type: "epic-activated" });

		const ctx = buildCheckContext([e1, e2, e3]);

		expect(ctx.eventsByScopeRef.get("my-epic")).toEqual([e1, e3]);
		expect(ctx.eventsByScopeRef.has("project")).toBe(false);
	});

	it("preserves event order in allEvents", () => {
		const e1 = makeEnvelope({ type: "a" });
		const e2 = makeEnvelope({ type: "b" });
		const e3 = makeEnvelope({ type: "c" });

		const ctx = buildCheckContext([e1, e2, e3]);

		expect(ctx.allEvents).toEqual([e1, e2, e3]);
	});
});

describe("InvariantError", () => {
	it("includes all violation messages in the error summary", () => {
		const err = new InvariantError([
			{ ruleId: "rule-a", message: "first violation" },
			{ ruleId: "rule-b", message: "second violation" },
		]);

		expect(err.name).toBe("InvariantError");
		expect(err.message).toContain("[rule-a] first violation");
		expect(err.message).toContain("[rule-b] second violation");
		expect(err.violations).toHaveLength(2);
	});

	it("is an instance of Error", () => {
		const err = new InvariantError([{ ruleId: "r", message: "m" }]);
		expect(err).toBeInstanceOf(Error);
	});

	it("preserves violation context when present", () => {
		const err = new InvariantError([
			{ ruleId: "r", message: "m", context: { epicSlug: "my-epic" } },
		]);
		const violation = err.violations[0];
		expect(violation).toBeDefined();
		expect(violation?.context).toEqual({ epicSlug: "my-epic" });
	});
});
