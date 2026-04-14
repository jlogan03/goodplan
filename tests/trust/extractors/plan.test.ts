import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { planExtractor } from "../../../src/trust/extractors/plan.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("planExtractor", () => {
	it("parses a valid plan artifact", () => {
		const md = readFixture("plan.md");
		const result = planExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.chunks).toHaveLength(2);
		expect(result.data.chunks[0]?.id).toBe("chunk-1");
		expect(result.data.chunks[0]?.verificationType).toBe("automated");
		expect(result.data.chunkDependencies).toHaveLength(1);
		expect(result.data.chunkDependencies[0]?.from).toBe("chunk-2");
		expect(result.data.chunkDependencies[0]?.to).toBe("chunk-1");
		expect(result.data.affectedSubsystems).toEqual(["trust", "schemas"]);
		expect(result.data.rollbackPath).toBeTruthy();
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# No frontmatter plan";
		const result = planExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: plan\n---\n# Plan without extract block";
		const result = planExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns SCHEMA_INVALID for bad verificationType", () => {
		const md = [
			"---",
			"type: plan",
			"---",
			"```yaml extract",
			"chunks:",
			"  - id: chunk-1",
			'    description: "Test"',
			'    expectation: "Test"',
			'    redTest: "Test"',
			"    verificationType: invalid-type",
			"chunkDependencies: []",
			"affectedSubsystems: []",
			'rollbackPath: "revert"',
			"```",
		].join("\n");
		const result = planExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when chunks are missing", () => {
		const md = [
			"---",
			"type: plan",
			"---",
			"```yaml extract",
			"chunkDependencies: []",
			"affectedSubsystems: []",
			'rollbackPath: "revert"',
			"```",
		].join("\n");
		const result = planExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(planExtractor.id).toBe("plan");
		expect(planExtractor.description).toBeTruthy();
	});
});
