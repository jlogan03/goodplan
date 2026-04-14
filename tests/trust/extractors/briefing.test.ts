import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { briefingExtractor } from "../../../src/trust/extractors/briefing.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("briefingExtractor", () => {
	it("parses a valid briefing artifact", () => {
		const md = readFixture("briefing.md");
		const result = briefingExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.timeContext).toBe("2026-04-10 morning session");
		expect(result.data.currentPosition).toBe("Slice 04, Phase 3 implementation");
		expect(result.data.lastAction).toBe("Completed Phase 2 core extractors");
		expect(result.data.whereStopped).toBe("All 5 core extractors passing tests");
		expect(result.data.nextAction).toBe("Implement remaining 5 extractors");
		expect(result.data.attentionItems).toHaveLength(2);
		expect(result.data.deepLinks).toHaveLength(2);
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# No frontmatter\n\nJust content.";
		const result = briefingExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: briefing\n---\n# No extract block\n\nJust text.";
		const result = briefingExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns SCHEMA_INVALID when required fields are missing", () => {
		const md = [
			"---",
			"type: briefing",
			"---",
			"```yaml extract",
			'timeContext: "now"',
			"```",
		].join("\n");
		const result = briefingExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when extract block has unexpected fields", () => {
		const md = [
			"---",
			"type: briefing",
			"---",
			"```yaml extract",
			'timeContext: "now"',
			'currentPosition: "here"',
			'lastAction: "did"',
			'whereStopped: "there"',
			'nextAction: "next"',
			"attentionItems: []",
			"deepLinks: []",
			"extraField: true",
			"```",
		].join("\n");
		const result = briefingExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(briefingExtractor.id).toBe("briefing");
		expect(briefingExtractor.description).toBeTruthy();
	});
});
