import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createReviewerRegistry, loadReviewerAgents } from "../../../src/trust/reviewers/loader.js";
import { ReviewerRegistry } from "../../../src/trust/reviewers/registry.js";
import type { ReviewerRegistryEntry } from "../../../src/trust/reviewers/types.js";

const PLUGIN_DIR = resolve(import.meta.dirname, "../../../plugin");

describe("ReviewerRegistry", () => {
	it("createReviewerRegistry loads all 26 reviewers from plugin/agents/", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const all = registry.getAll();
		expect(all.length).toBe(26);
	});

	it("getById('reviewer-holistic') returns entry with expected domains", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const entry = registry.getById("reviewer-holistic");
		expect(entry).toBeDefined();
		expect(entry?.frontmatter.domains).toContain("alignment");
		expect(entry?.frontmatter.domains).toContain("completeness");
		expect(entry?.frontmatter.domains).toContain("coherence");
	});

	it("getByArtifactType('plan') includes holistic, excludes typescript-only reviewers", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const planReviewers = registry.getByArtifactType("plan");
		const ids = planReviewers.map((e) => e.id);
		expect(ids).toContain("reviewer-holistic");
		expect(ids).not.toContain("reviewer-typescript");
	});

	it("duplicate registration throws", () => {
		const registry = new ReviewerRegistry();
		const entry: ReviewerRegistryEntry = {
			id: "test-reviewer",
			frontmatter: {
				id: "test-reviewer",
				version: 1,
				domains: ["test"],
				applies_to: ["code"],
				rubric_ref: "test",
				score_range: [1, 5],
				passing_threshold_per_dimension: { quality: 4 },
			},
			filePath: "/fake/path.md",
			promptContent: "test content",
		};
		registry.register(entry);
		expect(() => registry.register(entry)).toThrow("Duplicate reviewer ID");
	});

	it("loadReviewerAgents returns entries with filePath and promptContent", () => {
		const entries = loadReviewerAgents(PLUGIN_DIR);
		expect(entries.length).toBe(26);
		for (const entry of entries) {
			expect(entry.filePath).toBeTruthy();
			expect(entry.promptContent).toBeTruthy();
			expect(entry.frontmatter.score_range).toEqual([1, 5]);
		}
	});
});
