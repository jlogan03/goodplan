import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { epicGoalExtractor } from "../../../src/trust/extractors/epic-goal.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("epicGoalExtractor", () => {
	it("parses a valid epic goal artifact", () => {
		const md = readFixture("epic-goal.md");
		const result = epicGoalExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.description).toBe("Build the trust layer for goodplan v2");
		expect(result.data.scope).toHaveLength(3);
		expect(result.data.nonGoals).toHaveLength(2);
		expect(result.data.successCriteria).toHaveLength(2);
		expect(result.data.initialSubsystems).toEqual(["trust", "schemas"]);
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# Epic goal without frontmatter";
		const result = epicGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: epic-goal\n---\n# Epic goal without extract";
		const result = epicGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns SCHEMA_INVALID when required fields are missing", () => {
		const md = [
			"---",
			"type: epic-goal",
			"---",
			"```yaml extract",
			'description: "Test epic"',
			"scope: []",
			"```",
		].join("\n");
		const result = epicGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when unexpected fields present", () => {
		const md = [
			"---",
			"type: epic-goal",
			"---",
			"```yaml extract",
			'description: "Test"',
			"scope: []",
			"nonGoals: []",
			"successCriteria: []",
			"initialSubsystems: []",
			"unexpectedField: true",
			"```",
		].join("\n");
		const result = epicGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(epicGoalExtractor.id).toBe("epic-goal");
		expect(epicGoalExtractor.description).toBeTruthy();
	});
});
