import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findingExtractor } from "../../../src/trust/extractors/finding.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("findingExtractor", () => {
	it("parses a valid finding artifact", () => {
		const md = readFixture("finding.md");
		const result = findingExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.classification.blocking).toBe(true);
		expect(result.data.classification.inScope).toBe(true);
		expect(result.data.reshapeOption).toBe("Add input size validation before parsing");
		expect(result.data.relatedSubsystems).toHaveLength(2);
		expect(result.data.relatedSubsystems[0]).toBe("trust");
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# No frontmatter\n\nJust content.";
		const result = findingExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: finding\n---\n# No extract block\n\nJust text.";
		const result = findingExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns SCHEMA_INVALID when required fields are missing", () => {
		const md = [
			"---",
			"type: finding",
			"---",
			"```yaml extract",
			"classification:",
			"  blocking: true",
			"```",
		].join("\n");
		const result = findingExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when classification has unexpected fields", () => {
		const md = [
			"---",
			"type: finding",
			"---",
			"```yaml extract",
			"classification:",
			"  blocking: true",
			"  inScope: true",
			"  extraField: false",
			'reshapeOption: "option"',
			"relatedSubsystems: []",
			"```",
		].join("\n");
		const result = findingExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when extract block has unexpected fields", () => {
		const md = [
			"---",
			"type: finding",
			"---",
			"```yaml extract",
			"classification:",
			"  blocking: true",
			"  inScope: true",
			'reshapeOption: "option"',
			"relatedSubsystems: []",
			"unexpectedField: true",
			"```",
		].join("\n");
		const result = findingExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(findingExtractor.id).toBe("finding");
		expect(findingExtractor.description).toBeTruthy();
	});
});
