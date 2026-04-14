import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { architectureTargetExtractor } from "../../../src/trust/extractors/architecture-target.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("architectureTargetExtractor", () => {
	it("parses a valid architecture artifact (same format as architecture)", () => {
		// Architecture target has same shape — reuse the valid architecture fixture
		const md = readFixture("architecture.md");
		const result = architectureTargetExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.subsystems).toHaveLength(2);
		expect(result.data.subsystems[0]?.id).toBe("engine");
		expect(result.data.communicationPatterns).toHaveLength(2);
		expect(result.data.proposedInvariants).toHaveLength(2);
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# No frontmatter\n\nJust content.";
		const result = architectureTargetExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: architecture-target\n---\n# No extract block\n\nJust text.";
		const result = architectureTargetExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns SCHEMA_INVALID for invalid maturity value", () => {
		const md = readFixture("architecture-malformed.md");
		const result = architectureTargetExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when extract block has unexpected fields", () => {
		const md = [
			"---",
			"type: architecture-target",
			"---",
			"```yaml extract",
			"subsystems: []",
			"communicationPatterns: []",
			"proposedInvariants: []",
			"extra: oops",
			"```",
		].join("\n");
		const result = architectureTargetExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(architectureTargetExtractor.id).toBe("architecture-target");
		expect(architectureTargetExtractor.description).toBeTruthy();
	});
});
