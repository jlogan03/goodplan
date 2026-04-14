import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { pressureTestExtractor } from "../../../src/trust/extractors/pressure-test.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("pressureTestExtractor", () => {
	it("parses a valid pressure test artifact", () => {
		const md = readFixture("pressure-test.md");
		const result = pressureTestExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.failureModes).toHaveLength(2);
		expect(result.data.failureModes[0]?.id).toBe("fm-01");
		expect(result.data.failureModes[0]?.likelihood).toBe("medium");
		expect(result.data.failureModes[1]?.impact).toBe("high");
		expect(result.data.scalingCliffs).toHaveLength(1);
		expect(result.data.optionalityLedger).toHaveLength(1);
		expect(result.data.errorClasses).toHaveLength(2);
		expect(result.data.lockedInAssumptions).toHaveLength(2);
		expect(result.data.findings).toHaveLength(2);
		expect(result.data.findings[0]?.severity).toBe("MINOR");
		expect(result.data.findings[1]?.severity).toBe("IMPORTANT");
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# No frontmatter\n\nJust content.";
		const result = pressureTestExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: pressure-test\n---\n# No extract block\n\nJust text.";
		const result = pressureTestExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns SCHEMA_INVALID for invalid severity value", () => {
		const md = [
			"---",
			"type: pressure-test",
			"---",
			"```yaml extract",
			"failureModes: []",
			"scalingCliffs: []",
			"optionalityLedger: []",
			"errorClasses: []",
			"lockedInAssumptions: []",
			"findings:",
			'  - description: "A finding"',
			"    severity: INVALID_SEVERITY",
			"```",
		].join("\n");
		const result = pressureTestExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID for invalid failure mode likelihood", () => {
		const md = [
			"---",
			"type: pressure-test",
			"---",
			"```yaml extract",
			"failureModes:",
			"  - id: fm-01",
			'    description: "test"',
			"    likelihood: extreme",
			"    impact: low",
			"scalingCliffs: []",
			"optionalityLedger: []",
			"errorClasses: []",
			"lockedInAssumptions: []",
			"findings: []",
			"```",
		].join("\n");
		const result = pressureTestExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when extract block has unexpected fields", () => {
		const md = [
			"---",
			"type: pressure-test",
			"---",
			"```yaml extract",
			"failureModes: []",
			"scalingCliffs: []",
			"optionalityLedger: []",
			"errorClasses: []",
			"lockedInAssumptions: []",
			"findings: []",
			"unexpectedField: true",
			"```",
		].join("\n");
		const result = pressureTestExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(pressureTestExtractor.id).toBe("pressure-test");
		expect(pressureTestExtractor.description).toBeTruthy();
	});
});
