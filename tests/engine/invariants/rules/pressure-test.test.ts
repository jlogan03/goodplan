import { describe, expect, it } from "vitest";
import { pressureTestFindingsAllAcceptedBeforeSliceSet } from "../../../../src/engine/invariants/rules/pressure-test.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("pressure-test.findings-all-accepted-before-slice-set", () => {
	it("passes when no findings exist", () => {
		const event = makeEnvelope({ type: "slice-set-committed" });
		const ctx = buildCheckContext([]);
		expect(pressureTestFindingsAllAcceptedBeforeSliceSet.check(event, ctx)).toBeNull();
	});

	it("passes when all findings are triaged", () => {
		const captured = makeEnvelope({
			type: "finding-captured",
			domain: "finding",
			payload: { findingId: "f-1" },
		});
		const triaged = makeEnvelope({
			type: "finding-triaged",
			domain: "finding",
			payload: { findingId: "f-1" },
		});
		const event = makeEnvelope({ type: "slice-set-committed" });
		const ctx = buildCheckContext([captured, triaged]);
		expect(pressureTestFindingsAllAcceptedBeforeSliceSet.check(event, ctx)).toBeNull();
	});

	it("fails when a finding is not triaged", () => {
		const captured = makeEnvelope({
			type: "finding-captured",
			domain: "finding",
			payload: { findingId: "f-1" },
		});
		const event = makeEnvelope({ type: "slice-set-committed" });
		const ctx = buildCheckContext([captured]);
		const result = pressureTestFindingsAllAcceptedBeforeSliceSet.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("1 finding(s)");
	});

	it("fails when some findings are triaged but not all", () => {
		const c1 = makeEnvelope({
			type: "finding-captured",
			domain: "finding",
			payload: { findingId: "f-1" },
		});
		const c2 = makeEnvelope({
			type: "finding-captured",
			domain: "finding",
			payload: { findingId: "f-2" },
		});
		const t1 = makeEnvelope({
			type: "finding-triaged",
			domain: "finding",
			payload: { findingId: "f-1" },
		});
		const event = makeEnvelope({ type: "slice-set-committed" });
		const ctx = buildCheckContext([c1, c2, t1]);
		const result = pressureTestFindingsAllAcceptedBeforeSliceSet.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.context?.unresolvedFindings).toEqual(["f-2"]);
	});

	it("ignores non-slice-set-committed events", () => {
		const event = makeEnvelope({ type: "epic-created" });
		const ctx = buildCheckContext([]);
		expect(pressureTestFindingsAllAcceptedBeforeSliceSet.check(event, ctx)).toBeNull();
	});

	it("has correct metadata", () => {
		expect(pressureTestFindingsAllAcceptedBeforeSliceSet.id).toBe(
			"pressure-test.findings-all-accepted-before-slice-set",
		);
		expect(pressureTestFindingsAllAcceptedBeforeSliceSet.ruleType).toBe("all_match");
		expect(pressureTestFindingsAllAcceptedBeforeSliceSet.appliesTo).toContain("entity-lifecycle");
		expect(pressureTestFindingsAllAcceptedBeforeSliceSet.appliesTo).toContain("finding");
	});
});
