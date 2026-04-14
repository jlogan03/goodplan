import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sideQuestGoalExtractor } from "../../../src/trust/extractors/side-quest-goal.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("sideQuestGoalExtractor", () => {
	it("parses a valid side-quest goal artifact", () => {
		const md = readFixture("side-quest-goal.md");
		const result = sideQuestGoalExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.description).toBe("Fix flaky test suite in CI pipeline");
		expect(result.data.scope).toHaveLength(2);
		expect(result.data.verificationMethod).toBe("Run CI suite 10 times with zero failures");
		expect(result.data.parentEpicRef).toBe("workflow-bug-fixes");
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# No frontmatter\n\nJust content.";
		const result = sideQuestGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: side-quest-goal\n---\n# No extract block\n\nJust text.";
		const result = sideQuestGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns SCHEMA_INVALID when required fields are missing", () => {
		const md = [
			"---",
			"type: side-quest-goal",
			"---",
			"```yaml extract",
			'description: "A quest"',
			"```",
		].join("\n");
		const result = sideQuestGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when extract block has unexpected fields", () => {
		const md = [
			"---",
			"type: side-quest-goal",
			"---",
			"```yaml extract",
			'description: "A quest"',
			"scope: []",
			'verificationMethod: "test"',
			'parentEpicRef: "epic"',
			"unexpectedField: true",
			"```",
		].join("\n");
		const result = sideQuestGoalExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(sideQuestGoalExtractor.id).toBe("side-quest-goal");
		expect(sideQuestGoalExtractor.description).toBeTruthy();
	});
});
