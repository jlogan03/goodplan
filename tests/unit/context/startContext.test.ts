import { describe, expect, it } from "vitest";
import { startContext } from "../../../src/core/context/index.js";
import type { DirectoryEntry, ProjectState } from "../../../src/core/data/tree.js";

// ── Realistic state fixture ──────────────────────────────────

const state: ProjectState = {
	type: "directory",
	contents: {
		"project.json": {
			type: "json",
			content: { name: "test-project", version: "1.0.0", activeEpic: "my-epic", activeSlice: "01-data-layer", activeQuest: null, created: "2026-03-20T00:00:00Z", updated: "2026-03-20T12:00:00Z" },
		},
		"conventions.md": { type: "markdown", content: "# Conventions\n\nUse TypeScript strict mode." },
		"decisions.jsonl": {
			type: "jsonl",
			content: [
				{ id: "dec-1", status: "active", domain: "arch", title: "Layered architecture", summary: "Use 4-layer stack", date: "2026-03-20", supersededBy: null },
				{ id: "dec-2", status: "superseded", domain: "arch", title: "Old approach", summary: "Was flat", date: "2026-03-19", supersededBy: "dec-1" },
			],
		},
		"learnings.jsonl": {
			type: "jsonl",
			content: [
				{ category: "worked", summary: "Vitest is fast", file: "learnings/vitest-is-fast.md", tags: ["testing"], source: "project", rollup: false, rollupTo: [] },
			],
		},
		architecture: {
			type: "directory",
			contents: {
				"_overview.md": { type: "markdown", content: "# Current Architecture\n\nProject-level overview." },
			},
		} satisfies DirectoryEntry,
		epics: {
			type: "directory",
			contents: {
				"overview.json": { type: "json", content: { items: [{ name: "my-epic", status: "activated", created: "2026-03-20T00:00:00Z", completed: null, slices: [{ name: "01-data-layer", status: "implementing", created: "2026-03-20T00:00:00Z", completed: null }] }] } },
				"my-epic": {
					type: "directory",
					contents: {
						"epic.json": {
							type: "json",
							content: { name: "my-epic", status: "activated", goal: "Build a CLI tool", verifications: [], created: "2026-03-20T00:00:00Z", activated: "2026-03-20T12:00:00Z", updated: "2026-03-20T12:00:00Z" },
						},
						architecture: {
							type: "directory",
							contents: {
								"_overview.md": { type: "markdown", content: "# Target Architecture\n\nEpic-level architecture." },
								"data-model.md": { type: "markdown", content: "# Data Model\n\nEntities and relations." },
							},
						} satisfies DirectoryEntry,
						research: {
							type: "directory",
							contents: {
								"topic.md": { type: "markdown", content: "# Research\n\nFindings here." },
							},
						} satisfies DirectoryEntry,
						brainstorm: {
							type: "directory",
							contents: {},
						} satisfies DirectoryEntry,
						slices: {
							type: "directory",
							contents: {
								"01-data-layer": {
									type: "directory",
									contents: {
										"slice.json": {
											type: "json",
											content: { name: "01-data-layer", epic: "my-epic", status: "implementing", goal: "Implement data layer with Zod", deferred: [], refinement: null, created: "2026-03-20T00:00:00Z", updated: "2026-03-20T12:00:00Z" },
										},
										"plan.md": { type: "markdown", content: "# Plan\n\nImplement the data layer." },
										"plan-refined.md": { type: "markdown", content: "# Refined Plan\n\nDetailed implementation plan for the data layer." },
										"learnings.jsonl": {
											type: "jsonl",
											content: [
												{ category: "domain", summary: "JSONL is merge-friendly", file: "learnings/jsonl-is-merge-friendly.md", tags: ["data"], source: "epics/my-epic/slices/01-data-layer", rollup: false, rollupTo: [] },
											],
										},
									},
								} satisfies DirectoryEntry,
							},
						} satisfies DirectoryEntry,
					},
				} satisfies DirectoryEntry,
			},
		} satisfies DirectoryEntry,
		quests: {
			type: "directory",
			contents: {
				"overview.json": { type: "json", content: { items: [] } },
			},
		} satisfies DirectoryEntry,
	},
};

// ── startContext tests ────────────────────────────────────────

describe("startContext", () => {
	describe("plan phase (slice target)", () => {
		it("returns references without budget", () => {
			const bundle = startContext(state, "plan", { type: "slice", name: "01-data-layer", epic: "my-epic" });
			expect(bundle.inline).toEqual({});
			expect(bundle.references.length).toBeGreaterThan(0);
			// Should include entity goal, architecture, conventions
			expect(bundle.references).toContain("conventions.md");
		});

		it("inlines content with budget", () => {
			const bundle = startContext(state, "plan", { type: "slice", name: "01-data-layer", epic: "my-epic" }, { inlineBudget: 50000 });
			expect(Object.keys(bundle.inline).length).toBeGreaterThan(0);
			// Entity goal (slice.json) should be first priority — always inlined
			expect(bundle.inline["epics/my-epic/slices/01-data-layer/slice.json"]).toBe("Implement data layer with Zod");
		});

		it("includes active decisions", () => {
			const bundle = startContext(state, "plan", { type: "slice", name: "01-data-layer", epic: "my-epic" });
			expect(bundle.decisions).toHaveLength(1);
			expect(bundle.decisions[0]!.id).toBe("dec-1");
		});

		it("includes learnings (project + scope)", () => {
			const bundle = startContext(state, "plan", { type: "slice", name: "01-data-layer", epic: "my-epic" });
			expect(bundle.learnings).toHaveLength(2); // 1 project + 1 scope
		});
	});

	describe("refinement phase (slice target)", () => {
		it("prioritizes plan content first", () => {
			const bundle = startContext(state, "refinement", { type: "slice", name: "01-data-layer", epic: "my-epic" }, { inlineBudget: 50000 });
			const inlineKeys = Object.keys(bundle.inline);
			expect(inlineKeys[0]).toBe("epics/my-epic/slices/01-data-layer/plan.md");
		});
	});

	describe("implementation phase (slice target)", () => {
		it("prioritizes refined plan first", () => {
			const bundle = startContext(state, "implementation", { type: "slice", name: "01-data-layer", epic: "my-epic" }, { inlineBudget: 50000 });
			const inlineKeys = Object.keys(bundle.inline);
			expect(inlineKeys[0]).toBe("epics/my-epic/slices/01-data-layer/plan-refined.md");
		});
	});

	describe("explore phase (epic target)", () => {
		it("includes epic goal and research", () => {
			const bundle = startContext(state, "explore", { type: "epic", name: "my-epic" }, { inlineBudget: 50000 });
			expect(bundle.inline["epics/my-epic/epic.json"]).toBe("Build a CLI tool");
			expect(bundle.inline["epics/my-epic/research/topic.md"]).toBe("# Research\n\nFindings here.");
		});
	});

	describe("architecture phase (epic target)", () => {
		it("includes epic goal, research, conventions, and existing architecture", () => {
			const bundle = startContext(state, "architecture", { type: "epic", name: "my-epic" }, { inlineBudget: 50000 });
			expect(bundle.inline["epics/my-epic/epic.json"]).toBeDefined();
			expect(bundle.inline["conventions.md"]).toBeDefined();
		});
	});

	describe("slices phase (epic target)", () => {
		it("includes epic goal and architecture", () => {
			const bundle = startContext(state, "slices", { type: "epic", name: "my-epic" }, { inlineBudget: 50000 });
			expect(bundle.inline["epics/my-epic/epic.json"]).toBe("Build a CLI tool");
			expect(bundle.inline["epics/my-epic/architecture/_overview.md"]).toBeDefined();
		});
	});

	describe("refine-architecture phase (epic target)", () => {
		it("starts with epic goal", () => {
			const bundle = startContext(state, "refine-architecture", { type: "epic", name: "my-epic" }, { inlineBudget: 50000 });
			const inlineKeys = Object.keys(bundle.inline);
			expect(inlineKeys[0]).toBe("epics/my-epic/epic.json");
		});
	});

	describe("refine-slices phase (epic target)", () => {
		it("includes slice definitions", () => {
			const bundle = startContext(state, "refine-slices", { type: "epic", name: "my-epic" }, { inlineBudget: 50000 });
			// Should expand epics/my-epic/slices directory to find markdown entries
			expect(bundle.inline["epics/my-epic/slices/01-data-layer/plan.md"]).toBeDefined();
		});
	});

	describe("complete phase", () => {
		it("includes entity goal and architecture", () => {
			const bundle = startContext(state, "complete", { type: "slice", name: "01-data-layer", epic: "my-epic" }, { inlineBudget: 50000 });
			expect(bundle.inline["epics/my-epic/slices/01-data-layer/slice.json"]).toBe("Implement data layer with Zod");
		});
	});

	describe("budget edge cases", () => {
		it("with tiny budget, first entry is still inlined", () => {
			const bundle = startContext(state, "plan", { type: "slice", name: "01-data-layer", epic: "my-epic" }, { inlineBudget: 1 });
			// First entry (entity goal) should always be inlined
			expect(Object.keys(bundle.inline).length).toBe(1);
			expect(bundle.references.length).toBeGreaterThan(0);
		});

		it("deduplicates entries by key", () => {
			// If a path appears in multiple sources, it should only appear once
			const bundle = startContext(state, "plan", { type: "slice", name: "01-data-layer", epic: "my-epic" }, { inlineBudget: 50000 });
			const allKeys = [...Object.keys(bundle.inline), ...bundle.references];
			const uniqueKeys = new Set(allKeys);
			expect(allKeys.length).toBe(uniqueKeys.size);
		});
	});
});
