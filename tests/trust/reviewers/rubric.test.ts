import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ReviewerRegistry } from "../../../src/trust/reviewers/registry.js";
import { loadAllRubrics, loadRubric } from "../../../src/trust/reviewers/rubric-loader.js";
import { validateRubrics } from "../../../src/trust/reviewers/rubric-validator.js";
import type { ReviewerRegistryEntry } from "../../../src/trust/reviewers/types.js";

const PLUGIN_RUBRICS_DIR = join(import.meta.dirname, "../../../plugin/rubrics");
const FIXTURE_RUBRICS_DIR = join(import.meta.dirname, "../fixtures/rubrics");

describe("rubric-loader", () => {
	describe("loadAllRubrics", () => {
		it("loads all production rubric files successfully", () => {
			const rubrics = loadAllRubrics(PLUGIN_RUBRICS_DIR);
			expect(rubrics.size).toBeGreaterThanOrEqual(5);

			// Every rubric should have required fields
			for (const [id, rubric] of rubrics) {
				expect(rubric.id).toBe(id);
				expect(rubric.version).toBe(1);
				expect(rubric.dimensions.length).toBeGreaterThanOrEqual(1);
				expect(rubric.convergence.max_rounds).toBeGreaterThanOrEqual(1);
			}
		});
	});

	describe("loadRubric", () => {
		it("loads a valid rubric fixture", () => {
			const result = loadRubric(join(FIXTURE_RUBRICS_DIR, "valid.yaml"));
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.rubric.id).toBe("test-valid");
				expect(result.rubric.dimensions).toHaveLength(1);
			}
		});

		it("returns errors for invalid schema (missing version)", () => {
			const result = loadRubric(join(FIXTURE_RUBRICS_DIR, "invalid-schema.yaml"));
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors.length).toBeGreaterThan(0);
				expect(result.errors.some((e) => e.includes("version"))).toBe(true);
			}
		});

		it("returns errors for empty dimensions array", () => {
			const result = loadRubric(join(FIXTURE_RUBRICS_DIR, "invalid-dimensions.yaml"));
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors.length).toBeGreaterThan(0);
			}
		});

		it("returns errors for nonexistent file", () => {
			const result = loadRubric(join(FIXTURE_RUBRICS_DIR, "nonexistent.yaml"));
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors[0]).toContain("Failed to read");
			}
		});
	});
});

describe("rubric-validator", () => {
	function makeEntry(
		id: string,
		rubricRef: string,
		thresholds: Record<string, number>,
	): ReviewerRegistryEntry {
		return {
			id,
			filePath: `/fake/${id}.md`,
			promptContent: "test prompt",
			frontmatter: {
				id,
				version: 1,
				domains: ["test"],
				applies_to: ["code"],
				rubric_ref: rubricRef,
				score_range: [1, 10],
				passing_threshold_per_dimension: thresholds,
			},
		};
	}

	describe("validateRubrics", () => {
		it("returns valid when all rubric_refs resolve and dimensions match", () => {
			const registry = new ReviewerRegistry();
			registry.register(makeEntry("rev-1", "holistic", { alignment: 7, completeness: 7 }));

			const rubrics = loadAllRubrics(PLUGIN_RUBRICS_DIR);
			const result = validateRubrics(registry, rubrics);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("detects missing rubric_ref", () => {
			const registry = new ReviewerRegistry();
			registry.register(makeEntry("rev-1", "nonexistent-rubric", { foo: 5 }));

			const rubrics = loadAllRubrics(PLUGIN_RUBRICS_DIR);
			const result = validateRubrics(registry, rubrics);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("nonexistent-rubric");
			expect(result.errors[0]).toContain("rev-1");
		});

		it("detects dimension mismatch", () => {
			const registry = new ReviewerRegistry();
			registry.register(makeEntry("rev-1", "holistic", { alignment: 7, "nonexistent-dim": 5 }));

			const rubrics = loadAllRubrics(PLUGIN_RUBRICS_DIR);
			const result = validateRubrics(registry, rubrics);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes("nonexistent-dim"))).toBe(true);
		});

		it("warns about orphaned rubrics", () => {
			const registry = new ReviewerRegistry();
			// Only reference one rubric — the others become orphans
			registry.register(makeEntry("rev-1", "holistic", { alignment: 7 }));

			const rubrics = loadAllRubrics(PLUGIN_RUBRICS_DIR);
			const result = validateRubrics(registry, rubrics);

			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.includes("not referenced"))).toBe(true);
		});
	});
});
