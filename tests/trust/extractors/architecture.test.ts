import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { architectureExtractor } from "../../../src/trust/extractors/architecture.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("architectureExtractor", () => {
	it("parses a valid architecture artifact", () => {
		const md = readFixture("architecture.md");
		const result = architectureExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.subsystems).toHaveLength(2);
		expect(result.data.subsystems[0]?.id).toBe("engine");
		expect(result.data.subsystems[0]?.maturity).toBe("foundational");
		expect(result.data.subsystems[1]?.id).toBe("trust");
		expect(result.data.communicationPatterns).toHaveLength(2);
		expect(result.data.proposedInvariants).toHaveLength(2);
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# No frontmatter\n\nJust content.";
		const result = architectureExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FRONTMATTER_MISSING when frontmatter is empty", () => {
		const md = "---\n---\n# Empty frontmatter";
		const result = architectureExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: architecture\n---\n# No extract block\n\nJust text.";
		const result = architectureExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns YAML_PARSE_ERROR for malformed YAML in extract block", () => {
		const md = [
			"---",
			"type: architecture",
			"---",
			"# Bad YAML",
			"```yaml extract",
			"subsystems:",
			"  - id: engine",
			"    maturity: foundational",
			"  bad: [unclosed",
			"```",
		].join("\n");
		const result = architectureExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("YAML_PARSE_ERROR");
	});

	it("returns SCHEMA_INVALID for invalid maturity value", () => {
		const md = readFixture("architecture-malformed.md");
		const result = architectureExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when extract block has unexpected fields", () => {
		const md = [
			"---",
			"type: architecture",
			"---",
			"```yaml extract",
			"subsystems: []",
			"communicationPatterns: []",
			"proposedInvariants: []",
			"unexpectedField: true",
			"```",
		].join("\n");
		const result = architectureExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(architectureExtractor.id).toBe("architecture");
		expect(architectureExtractor.description).toBeTruthy();
	});
});
