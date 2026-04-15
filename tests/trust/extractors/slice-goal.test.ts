import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sliceGoalExtractor } from "../../../src/trust/extractors/slice-goal.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("sliceGoalExtractor", () => {
	it("parses a valid slice goal artifact", () => {
		const md = readFixture("slice-goal.md");
		const result = sliceGoalExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.description).toBe("Implement the 5 core extractors for the trust layer");
		expect(result.data.acceptanceCriteria).toHaveLength(3);
		expect(result.data.affectedSubsystems).toEqual(["trust", "schemas"]);
		expect(result.data.dependencies).toHaveLength(1);
		expect(result.data.scopeExclusions).toHaveLength(2);
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# Slice goal without frontmatter";
		const result = sliceGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: slice-goal\n---\n# Slice goal without extract";
		const result = sliceGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns SCHEMA_INVALID when required fields are missing", () => {
		const md = [
			"---",
			"type: slice-goal",
			"---",
			"```yaml extract",
			'description: "Test slice"',
			"acceptanceCriteria: []",
			"```",
		].join("\n");
		const result = sliceGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when unexpected fields present", () => {
		const md = [
			"---",
			"type: slice-goal",
			"---",
			"```yaml extract",
			'description: "Test"',
			"acceptanceCriteria: []",
			"affectedSubsystems: []",
			"dependencies: []",
			"scopeExclusions: []",
			"bonus: surprise",
			"```",
		].join("\n");
		const result = sliceGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(sliceGoalExtractor.id).toBe("slice-goal");
		expect(sliceGoalExtractor.description).toBeTruthy();
	});
});
