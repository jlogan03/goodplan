import { describe, expect, it } from "vitest";
import { findSchema, schemaRegistry } from "../../../src/core/data/schema-registry.js";
import { projectSchema } from "../../../src/schemas/entities/project.js";
import { epicSchema } from "../../../src/schemas/entities/epic.js";
import { sliceSchema } from "../../../src/schemas/entities/slice.js";
import { questSchema } from "../../../src/schemas/entities/quest.js";
import { overviewSchema } from "../../../src/schemas/entities/overview.js";
import { activityEntrySchema } from "../../../src/schemas/records/activity-log.js";
import { decisionEntrySchema } from "../../../src/schemas/records/decision.js";
import { learningEntrySchema } from "../../../src/schemas/records/learning.js";
import { architectureDeltaSchema } from "../../../src/schemas/records/architecture-delta.js";

describe("findSchema", () => {
	// JSON entity schemas
	it("resolves project.json", () => {
		expect(findSchema("project.json")).toBe(projectSchema);
	});

	it("resolves epics/overview.json", () => {
		expect(findSchema("epics/overview.json")).toBe(overviewSchema);
	});

	it("resolves slices/overview.json", () => {
		expect(findSchema("slices/overview.json")).toBe(overviewSchema);
	});

	it("resolves quests/overview.json", () => {
		expect(findSchema("quests/overview.json")).toBe(overviewSchema);
	});

	it("resolves epics/<name>/epic.json", () => {
		expect(findSchema("epics/goodplan-cli/epic.json")).toBe(epicSchema);
	});

	it("resolves slices/<name>/slice.json", () => {
		expect(findSchema("slices/01-data-layer/slice.json")).toBe(sliceSchema);
	});

	it("resolves quests/<name>/quest.json", () => {
		expect(findSchema("quests/fix-logging/quest.json")).toBe(questSchema);
	});

	// JSONL record schemas
	it("resolves activity-log.jsonl", () => {
		expect(findSchema("activity-log.jsonl")).toBe(activityEntrySchema);
	});

	it("resolves decisions.jsonl", () => {
		expect(findSchema("decisions.jsonl")).toBe(decisionEntrySchema);
	});

	it("resolves project-level learnings.jsonl", () => {
		expect(findSchema("learnings.jsonl")).toBe(learningEntrySchema);
	});

	it("resolves per-slice learnings.jsonl", () => {
		expect(findSchema("slices/01-data-layer/learnings.jsonl")).toBe(
			learningEntrySchema,
		);
	});

	it("resolves per-quest learnings.jsonl", () => {
		expect(findSchema("quests/fix-logging/learnings.jsonl")).toBe(
			learningEntrySchema,
		);
	});

	it("resolves per-slice architecture-deltas.jsonl", () => {
		expect(
			findSchema("slices/01-data-layer/architecture-deltas.jsonl"),
		).toBe(architectureDeltaSchema);
	});

	it("resolves per-quest architecture-deltas.jsonl", () => {
		expect(
			findSchema("quests/fix-logging/architecture-deltas.jsonl"),
		).toBe(architectureDeltaSchema);
	});

	// Unknown paths
	it("returns undefined for unknown paths", () => {
		expect(findSchema("unknown.json")).toBeUndefined();
	});

	it("returns undefined for nested unknown paths", () => {
		expect(findSchema("epics/goodplan-cli/unknown.json")).toBeUndefined();
	});

	it("returns undefined for markdown files", () => {
		expect(findSchema("slices/01-data-layer/plan.md")).toBeUndefined();
	});

	it("returns undefined for deeply nested unknown files", () => {
		expect(findSchema("a/b/c/d/unknown.json")).toBeUndefined();
	});
});

describe("schemaRegistry", () => {
	it("has entries for all expected patterns", () => {
		// Ensure the registry has a reasonable number of entries
		expect(schemaRegistry.length).toBeGreaterThanOrEqual(12);
	});

	it("all entries have pattern and schema", () => {
		for (const entry of schemaRegistry) {
			expect(entry.pattern).toBeInstanceOf(RegExp);
			expect(entry.schema).toBeDefined();
		}
	});
});
