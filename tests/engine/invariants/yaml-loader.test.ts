import { describe, expect, it } from "vitest";
import { buildCheckContext } from "../../../src/engine/invariants/types.js";
import {
	buildYamlInvariantRule,
	filterActiveInvariants,
	parseInvariantDefinitions,
} from "../../../src/engine/invariants/yaml-loader.js";
import type { YamlInvariantDef } from "../../../src/engine/invariants/yaml-loader.js";
import { makeEnvelope } from "./rules/_test-helpers.js";

describe("parseInvariantDefinitions", () => {
	it("parses a valid event-count definition", () => {
		const md = `# Invariants

\`\`\`yaml
- id: custom.max-epics
  description: Limit to 3 epics
  ruleType: count_limit
  appliesTo: [entity-lifecycle]
  checkType: event-count
  eventType: epic-created
  comparison: lte
  value: 3
\`\`\`
`;
		const defs = parseInvariantDefinitions(md);
		expect(defs).toHaveLength(1);
		const def = defs[0];
		if (def === undefined) throw new Error("Expected 1 def");
		expect(def.id).toBe("custom.max-epics");
		expect(def.description).toBe("Limit to 3 epics");
		expect(def.ruleType).toBe("count_limit");
		expect(def.appliesTo).toEqual(["entity-lifecycle"]);
		expect(def.check).toEqual({
			checkType: "event-count",
			eventType: "epic-created",
			comparison: "lte",
			value: 3,
		});
	});

	it("parses a valid field-exists definition", () => {
		const md = `\`\`\`yaml
- id: custom.require-name
  description: Name required
  ruleType: required
  appliesTo: [entity-lifecycle]
  checkType: field-exists
  field: name
\`\`\``;
		const defs = parseInvariantDefinitions(md);
		expect(defs).toHaveLength(1);
		expect(defs[0]?.check).toEqual({ checkType: "field-exists", field: "name" });
	});

	it("parses a valid field-matches definition", () => {
		const md = `\`\`\`yaml
- id: custom.version-check
  description: Version must be 1
  ruleType: custom
  appliesTo: [spine]
  checkType: field-matches
  field: version
  expected: 1
\`\`\``;
		const defs = parseInvariantDefinitions(md);
		expect(defs).toHaveLength(1);
		expect(defs[0]?.check).toEqual({
			checkType: "field-matches",
			field: "version",
			expected: 1,
		});
	});

	it("parses multiple definitions", () => {
		const md = `\`\`\`yaml
- id: a
  description: First
  ruleType: custom
  appliesTo: []
  checkType: field-exists
  field: x
- id: b
  description: Second
  ruleType: custom
  appliesTo: []
  checkType: field-exists
  field: y
\`\`\``;
		const defs = parseInvariantDefinitions(md);
		expect(defs).toHaveLength(2);
		expect(defs[0]?.id).toBe("a");
		expect(defs[1]?.id).toBe("b");
	});

	it("returns empty array for markdown without yaml block", () => {
		const md = "# Just some markdown\n\nNo yaml here.";
		expect(parseInvariantDefinitions(md)).toEqual([]);
	});

	it("skips malformed definitions (missing required fields)", () => {
		const md = `\`\`\`yaml
- id: incomplete
  description: Missing checkType
  ruleType: custom
  appliesTo: []
\`\`\``;
		expect(parseInvariantDefinitions(md)).toEqual([]);
	});

	it("skips definitions with unknown checkType", () => {
		const md = `\`\`\`yaml
- id: bad
  description: Unknown check
  ruleType: custom
  appliesTo: []
  checkType: unknown-type
  field: x
\`\`\``;
		expect(parseInvariantDefinitions(md)).toEqual([]);
	});
});

describe("filterActiveInvariants", () => {
	const defA: YamlInvariantDef = {
		id: "rule-a",
		description: "A",
		ruleType: "custom",
		appliesTo: [],
		check: { checkType: "field-exists", field: "x" },
	};
	const defB: YamlInvariantDef = {
		id: "rule-b",
		description: "B",
		ruleType: "custom",
		appliesTo: [],
		check: { checkType: "field-exists", field: "y" },
	};

	it("returns all definitions when no activation/deactivation events exist", () => {
		const result = filterActiveInvariants([defA, defB], []);
		expect(result).toHaveLength(2);
	});

	it("filters out deactivated invariants", () => {
		const events = [
			makeEnvelope({
				type: "invariant-deactivated",
				payload: { invariantId: "rule-a" },
			}),
		];
		const result = filterActiveInvariants([defA, defB], events);
		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe("rule-b");
	});

	it("re-activated invariant is included", () => {
		const events = [
			makeEnvelope({
				type: "invariant-deactivated",
				payload: { invariantId: "rule-a" },
			}),
			makeEnvelope({
				type: "invariant-activated",
				payload: { invariantId: "rule-a" },
			}),
		];
		const result = filterActiveInvariants([defA, defB], events);
		expect(result).toHaveLength(2);
	});

	it("last event wins for activation state", () => {
		const events = [
			makeEnvelope({
				type: "invariant-activated",
				payload: { invariantId: "rule-b" },
			}),
			makeEnvelope({
				type: "invariant-deactivated",
				payload: { invariantId: "rule-b" },
			}),
		];
		const result = filterActiveInvariants([defA, defB], events);
		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe("rule-a");
	});
});

describe("buildYamlInvariantRule", () => {
	describe("event-count check", () => {
		it("passes when count satisfies condition", () => {
			const def: YamlInvariantDef = {
				id: "count-rule",
				description: "At most 2",
				ruleType: "count_limit",
				appliesTo: [],
				check: { checkType: "event-count", eventType: "epic-created", comparison: "lte", value: 2 },
			};
			const rule = buildYamlInvariantRule(def);
			const event = makeEnvelope({ type: "epic-created" });
			const ctx = buildCheckContext([makeEnvelope({ type: "epic-created" })]);
			expect(rule.check(event, ctx)).toBeNull();
		});

		it("fails when count exceeds condition", () => {
			const def: YamlInvariantDef = {
				id: "count-rule",
				description: "At most 1",
				ruleType: "count_limit",
				appliesTo: [],
				check: { checkType: "event-count", eventType: "epic-created", comparison: "lte", value: 1 },
			};
			const rule = buildYamlInvariantRule(def);
			const event = makeEnvelope({ type: "epic-created" });
			const ctx = buildCheckContext([
				makeEnvelope({ type: "epic-created" }),
				makeEnvelope({ type: "epic-created" }),
			]);
			const result = rule.check(event, ctx);
			expect(result).not.toBeNull();
			expect(result?.message).toContain("At most 1");
		});

		it("supports all comparison operators", () => {
			const makeDef = (
				comparison: "eq" | "lt" | "lte" | "gt" | "gte",
				value: number,
			): YamlInvariantDef => ({
				id: "test",
				description: "test",
				ruleType: "custom",
				appliesTo: [],
				check: { checkType: "event-count", eventType: "x", comparison, value },
			});

			const ctx = buildCheckContext([makeEnvelope({ type: "x" }), makeEnvelope({ type: "x" })]); // count = 2
			const event = makeEnvelope({ type: "x" });

			// eq 2 -> pass
			expect(buildYamlInvariantRule(makeDef("eq", 2)).check(event, ctx)).toBeNull();
			// eq 3 -> fail
			expect(buildYamlInvariantRule(makeDef("eq", 3)).check(event, ctx)).not.toBeNull();
			// lt 3 -> pass
			expect(buildYamlInvariantRule(makeDef("lt", 3)).check(event, ctx)).toBeNull();
			// lt 2 -> fail
			expect(buildYamlInvariantRule(makeDef("lt", 2)).check(event, ctx)).not.toBeNull();
			// gt 1 -> pass
			expect(buildYamlInvariantRule(makeDef("gt", 1)).check(event, ctx)).toBeNull();
			// gt 2 -> fail
			expect(buildYamlInvariantRule(makeDef("gt", 2)).check(event, ctx)).not.toBeNull();
			// gte 2 -> pass
			expect(buildYamlInvariantRule(makeDef("gte", 2)).check(event, ctx)).toBeNull();
			// gte 3 -> fail
			expect(buildYamlInvariantRule(makeDef("gte", 3)).check(event, ctx)).not.toBeNull();
		});
	});

	describe("field-exists check", () => {
		it("passes when field exists in payload", () => {
			const def: YamlInvariantDef = {
				id: "field-rule",
				description: "Need name",
				ruleType: "required",
				appliesTo: [],
				check: { checkType: "field-exists", field: "name" },
			};
			const rule = buildYamlInvariantRule(def);
			const event = makeEnvelope({ payload: { name: "test" } });
			const ctx = buildCheckContext([]);
			expect(rule.check(event, ctx)).toBeNull();
		});

		it("fails when field is missing from payload", () => {
			const def: YamlInvariantDef = {
				id: "field-rule",
				description: "Need name",
				ruleType: "required",
				appliesTo: [],
				check: { checkType: "field-exists", field: "name" },
			};
			const rule = buildYamlInvariantRule(def);
			const event = makeEnvelope({ payload: { other: "test" } });
			const ctx = buildCheckContext([]);
			const result = rule.check(event, ctx);
			expect(result).not.toBeNull();
			expect(result?.message).toContain("name");
		});

		it("fails when payload is null", () => {
			const def: YamlInvariantDef = {
				id: "field-rule",
				description: "Need name",
				ruleType: "required",
				appliesTo: [],
				check: { checkType: "field-exists", field: "name" },
			};
			const rule = buildYamlInvariantRule(def);
			const event = makeEnvelope({ payload: null });
			const ctx = buildCheckContext([]);
			expect(rule.check(event, ctx)).not.toBeNull();
		});
	});

	describe("field-matches check", () => {
		it("passes when field matches expected string", () => {
			const def: YamlInvariantDef = {
				id: "match-rule",
				description: "Status active",
				ruleType: "custom",
				appliesTo: [],
				check: { checkType: "field-matches", field: "status", expected: "active" },
			};
			const rule = buildYamlInvariantRule(def);
			const event = makeEnvelope({ payload: { status: "active" } });
			const ctx = buildCheckContext([]);
			expect(rule.check(event, ctx)).toBeNull();
		});

		it("fails when field does not match", () => {
			const def: YamlInvariantDef = {
				id: "match-rule",
				description: "Status active",
				ruleType: "custom",
				appliesTo: [],
				check: { checkType: "field-matches", field: "status", expected: "active" },
			};
			const rule = buildYamlInvariantRule(def);
			const event = makeEnvelope({ payload: { status: "inactive" } });
			const ctx = buildCheckContext([]);
			const result = rule.check(event, ctx);
			expect(result).not.toBeNull();
			expect(result?.message).toContain("active");
		});

		it("matches boolean values", () => {
			const def: YamlInvariantDef = {
				id: "bool-rule",
				description: "Must be true",
				ruleType: "custom",
				appliesTo: [],
				check: { checkType: "field-matches", field: "enabled", expected: true },
			};
			const rule = buildYamlInvariantRule(def);
			const event = makeEnvelope({ payload: { enabled: true } });
			const ctx = buildCheckContext([]);
			expect(rule.check(event, ctx)).toBeNull();
		});

		it("matches numeric values", () => {
			const def: YamlInvariantDef = {
				id: "num-rule",
				description: "Version 2",
				ruleType: "custom",
				appliesTo: [],
				check: { checkType: "field-matches", field: "version", expected: 2 },
			};
			const rule = buildYamlInvariantRule(def);
			const event = makeEnvelope({ payload: { version: 2 } });
			const ctx = buildCheckContext([]);
			expect(rule.check(event, ctx)).toBeNull();
		});
	});
});
