import { describe, expect, it } from "vitest";
import { buildBinary, runCommand } from "../../integration/helpers.js";

/**
 * CLI integration tests for reviewer and rubric commands.
 *
 * These commands read from the plugin directory (agents/ and rubrics/)
 * and do NOT require a .goodplan/ project directory.
 * The binary is built by globalSetup (tests/global-setup.ts).
 */
describe("reviewer CLI commands", () => {
	const bin = buildBinary();

	describe("reviewer:list", () => {
		it("returns ok with all reviewers", () => {
			const result = runCommand(bin, ["reviewer:list", "--json"]);
			expect(result.exitCode).toBe(0);
			const json = result.json as { ok: boolean; total: number; items: unknown[] };
			expect(json.ok).toBe(true);
			expect(json.total).toBe(20);
			expect(json.items).toHaveLength(20);
		});

		it("each item has id, domains, applies_to, rubric_ref", () => {
			const result = runCommand(bin, ["reviewer:list", "--json"]);
			const json = result.json as {
				items: Array<{ id: string; domains: string[]; applies_to: string[]; rubric_ref: string }>;
			};
			for (const item of json.items) {
				expect(typeof item.id).toBe("string");
				expect(Array.isArray(item.domains)).toBe(true);
				expect(Array.isArray(item.applies_to)).toBe(true);
				expect(typeof item.rubric_ref).toBe("string");
			}
		});
	});

	describe("reviewer:show", () => {
		it("returns full details for a known reviewer", () => {
			const result = runCommand(bin, ["reviewer:show", "reviewer-holistic", "--json"]);
			expect(result.exitCode).toBe(0);
			const json = result.json as {
				ok: boolean;
				id: string;
				domains: string[];
				score_range: [number, number];
				prompt_length: number;
			};
			expect(json.ok).toBe(true);
			expect(json.id).toBe("reviewer-holistic");
			expect(Array.isArray(json.domains)).toBe(true);
			expect(json.domains.length).toBeGreaterThan(0);
			expect(typeof json.prompt_length).toBe("number");
		});

		it("returns ENTITY_NOT_FOUND for unknown reviewer", () => {
			const result = runCommand(bin, ["reviewer:show", "nonexistent", "--json"]);
			expect(result.exitCode).toBe(1);
			const json = result.json as { ok: boolean; code: string; error: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("ENTITY_NOT_FOUND");
		});
	});
});

describe("rubric CLI commands", () => {
	const bin = buildBinary();

	describe("rubric:list", () => {
		it("returns ok with rubric items", () => {
			const result = runCommand(bin, ["rubric:list", "--json"]);
			expect(result.exitCode).toBe(0);
			const json = result.json as { ok: boolean; total: number; items: unknown[] };
			expect(json.ok).toBe(true);
			expect(json.total).toBeGreaterThan(0);
			expect(json.items.length).toBe(json.total);
		});

		it("each item has id, dimension_count, max_rounds", () => {
			const result = runCommand(bin, ["rubric:list", "--json"]);
			const json = result.json as {
				items: Array<{ id: string; dimension_count: number; max_rounds: number }>;
			};
			for (const item of json.items) {
				expect(typeof item.id).toBe("string");
				expect(typeof item.dimension_count).toBe("number");
				expect(typeof item.max_rounds).toBe("number");
			}
		});
	});

	describe("rubric:show", () => {
		it("returns full details for a known rubric", () => {
			const result = runCommand(bin, ["rubric:show", "holistic", "--json"]);
			expect(result.exitCode).toBe(0);
			const json = result.json as {
				ok: boolean;
				id: string;
				dimensions: Array<{ name: string }>;
				convergence: { max_rounds: number };
			};
			expect(json.ok).toBe(true);
			expect(json.id).toBe("holistic");
			expect(Array.isArray(json.dimensions)).toBe(true);
			expect(json.dimensions.length).toBeGreaterThan(0);
		});

		it("returns ENTITY_NOT_FOUND for unknown rubric", () => {
			const result = runCommand(bin, ["rubric:show", "nonexistent", "--json"]);
			expect(result.exitCode).toBe(1);
			const json = result.json as { ok: boolean; code: string; error: string };
			expect(json.ok).toBe(false);
			expect(json.code).toBe("ENTITY_NOT_FOUND");
		});
	});

	describe("rubric:validate", () => {
		it("returns valid for production rubrics", () => {
			const result = runCommand(bin, ["rubric:validate", "--json"]);
			expect(result.exitCode).toBe(0);
			const json = result.json as {
				ok: boolean;
				valid: boolean;
				errors: string[];
				warnings: string[];
			};
			expect(json.ok).toBe(true);
			expect(json.valid).toBe(true);
			expect(json.errors).toHaveLength(0);
		});
	});
});
