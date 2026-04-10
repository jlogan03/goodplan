import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { subsystemExtractor } from "../../../src/trust/extractors/subsystem.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES, name), "utf-8");
}

describe("subsystemExtractor", () => {
	it("parses a valid subsystem artifact", () => {
		const md = readFixture("subsystem.md");
		const result = subsystemExtractor.extract(md);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.id).toBe("trust");
		expect(result.data.name).toBe("Trust Layer");
		expect(result.data.maturity).toBe("experimental");
		expect(result.data.description).toBe(
			"Convergence evaluation, extractors, and circuit breaker logic",
		);
		expect(result.data.owns).toHaveLength(2);
		expect(result.data.dependsOn).toHaveLength(2);
		expect(result.data.dependentCount).toBe(0);
	});

	it("returns FRONTMATTER_MISSING when no frontmatter", () => {
		const md = "# No frontmatter\n\nJust content.";
		const result = subsystemExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FRONTMATTER_MISSING");
	});

	it("returns FENCED_BLOCK_MISSING when no yaml extract block", () => {
		const md = "---\ntype: subsystem\n---\n# No extract block\n\nJust text.";
		const result = subsystemExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("FENCED_BLOCK_MISSING");
	});

	it("returns SCHEMA_INVALID when required fields are missing", () => {
		const md = [
			"---",
			"type: subsystem",
			"---",
			"```yaml extract",
			"id: trust",
			'name: "Trust"',
			"```",
		].join("\n");
		const result = subsystemExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID for invalid maturity value", () => {
		const md = [
			"---",
			"type: subsystem",
			"---",
			"```yaml extract",
			"id: trust",
			'name: "Trust"',
			"maturity: unknown",
			'description: "desc"',
			"owns: []",
			"dependsOn: []",
			"dependentCount: 0",
			"```",
		].join("\n");
		const result = subsystemExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("returns SCHEMA_INVALID when extract block has unexpected fields", () => {
		const md = [
			"---",
			"type: subsystem",
			"---",
			"```yaml extract",
			"id: trust",
			'name: "Trust"',
			"maturity: experimental",
			'description: "desc"',
			"owns: []",
			"dependsOn: []",
			"dependentCount: 0",
			"unexpectedField: true",
			"```",
		].join("\n");
		const result = subsystemExtractor.extract(md);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("SCHEMA_INVALID");
	});

	it("has correct id and description", () => {
		expect(subsystemExtractor.id).toBe("subsystem");
		expect(subsystemExtractor.description).toBeTruthy();
	});
});
