import { describe, expect, it } from "vitest";
import { collectMarkdownEntries, resolveContentSource } from "../../../src/core/context/collect.js";
import type { ResolvedTarget } from "../../../src/core/context/priorities.js";
import type { ContentSource } from "../../../src/core/context/types.js";
import type { DirectoryEntry, ProjectState } from "../../../src/core/data/tree.js";

// ── Fixture ──────────────────────────────────────────────────

const fixture: ProjectState = {
	type: "directory",
	contents: {
		"conventions.md": { type: "markdown", content: "# Conventions\n\nUse TypeScript." },
		architecture: {
			type: "directory",
			contents: {
				"_overview.md": { type: "markdown", content: "# Architecture Overview" },
				"data-model.md": { type: "markdown", content: "# Data Model" },
				nested: {
					type: "directory",
					contents: {
						"deep.md": { type: "markdown", content: "# Deep nested" },
						"schema.json": { type: "json", content: { version: "1.0" } },
					},
				} satisfies DirectoryEntry,
			},
		} satisfies DirectoryEntry,
		epics: {
			type: "directory",
			contents: {
				"overview.json": { type: "json", content: { items: [] } },
				"my-epic": {
					type: "directory",
					contents: {
						"epic.json": {
							type: "json",
							content: { name: "my-epic", status: "activated", goal: "Build something great" },
						},
						architecture: {
							type: "directory",
							contents: {},
						} satisfies DirectoryEntry,
						research: {
							type: "directory",
							contents: {
								"topic.md": { type: "markdown", content: "# Research on topic" },
							},
						} satisfies DirectoryEntry,
					},
				} satisfies DirectoryEntry,
			},
		} satisfies DirectoryEntry,
		slices: {
			type: "directory",
			contents: {
				"overview.json": { type: "json", content: { items: [] } },
				"01-data-layer": {
					type: "directory",
					contents: {
						"slice.json": {
							type: "json",
							content: {
								name: "01-data-layer",
								status: "implementing",
								goal: "Implement data layer",
							},
						},
						"plan.md": { type: "markdown", content: "# Plan\n\nDo the thing." },
						"learnings.jsonl": { type: "jsonl", content: [] },
					},
				} satisfies DirectoryEntry,
			},
		} satisfies DirectoryEntry,
	},
};

// ── collectMarkdownEntries ───────────────────────────────────

describe("collectMarkdownEntries", () => {
	it("collects all markdown entries from a directory recursively", () => {
		const entries = collectMarkdownEntries(fixture, "architecture");
		expect(entries).toHaveLength(3);
		// Sorted by key
		expect(entries[0]?.key).toBe("architecture/_overview.md");
		expect(entries[1]?.key).toBe("architecture/data-model.md");
		expect(entries[2]?.key).toBe("architecture/nested/deep.md");
	});

	it("skips JSON and JSONL entries", () => {
		const entries = collectMarkdownEntries(fixture, "architecture");
		const keys = entries.map((e) => e.key);
		expect(keys).not.toContain("architecture/nested/schema.json");
	});

	it("handles empty directories", () => {
		const entries = collectMarkdownEntries(fixture, "epics/my-epic/architecture");
		expect(entries).toHaveLength(0);
	});

	it("handles missing paths", () => {
		const entries = collectMarkdownEntries(fixture, "nonexistent/path");
		expect(entries).toHaveLength(0);
	});

	it("handles path resolving to non-directory", () => {
		const entries = collectMarkdownEntries(fixture, "conventions.md");
		expect(entries).toHaveLength(0);
	});

	it("returns entries with correct content", () => {
		const entries = collectMarkdownEntries(fixture, "architecture");
		const overview = entries.find((e) => e.key === "architecture/_overview.md");
		expect(overview).toBeDefined();
		expect(overview?.content).toBe("# Architecture Overview");
	});

	it("handles nested directories with mixed content", () => {
		const entries = collectMarkdownEntries(fixture, "slices/01-data-layer");
		expect(entries).toHaveLength(1); // Only plan.md — slice.json and learnings.jsonl are skipped
		expect(entries[0]?.key).toBe("slices/01-data-layer/plan.md");
	});
});

// ── resolveContentSource ─────────────────────────────────────

describe("resolveContentSource", () => {
	const rt: ResolvedTarget = {
		target: { type: "slice", name: "01-data-layer", epic: "my-epic" },
		activeEpic: "my-epic",
	};

	it("resolves a markdown source to a single entry", () => {
		const source: ContentSource = {
			key: "conventions",
			path: "conventions.md",
			sourceType: "markdown",
		};
		const entries = resolveContentSource(fixture, source, rt);
		expect(entries).toHaveLength(1);
		expect(entries[0]?.key).toBe("conventions.md");
		expect(entries[0]?.content).toBe("# Conventions\n\nUse TypeScript.");
	});

	it("resolves a directory source to all markdown children", () => {
		const source: ContentSource = {
			key: "architecture",
			path: "architecture",
			sourceType: "directory",
		};
		const entries = resolveContentSource(fixture, source, rt);
		expect(entries).toHaveLength(3);
	});

	it("resolves a JSON file to its goal field", () => {
		const source: ContentSource = {
			key: "entity-goal",
			path: "slices/01-data-layer/slice.json",
			sourceType: "markdown",
		};
		const entries = resolveContentSource(fixture, source, rt);
		expect(entries).toHaveLength(1);
		expect(entries[0]?.content).toBe("Implement data layer");
	});

	it("returns empty for missing paths", () => {
		const source: ContentSource = {
			key: "missing",
			path: "does/not/exist.md",
			sourceType: "markdown",
		};
		const entries = resolveContentSource(fixture, source, rt);
		expect(entries).toHaveLength(0);
	});

	it("resolves dynamic path functions", () => {
		const source: ContentSource = {
			key: "research",
			path: () => "epics/my-epic/research",
			sourceType: "directory",
		};
		const entries = resolveContentSource(fixture, source, rt);
		expect(entries).toHaveLength(1);
		expect(entries[0]?.key).toBe("epics/my-epic/research/topic.md");
	});
});
