import { describe, expect, it } from "vitest";
import {
	ZERO_STATE,
	getDir,
	getJson,
	getJsonl,
	getMarkdown,
	hasChild,
	resolve,
	setEntry,
} from "../../../src/core/data/tree.js";
import type {
	DirectoryEntry,
	JsonEntry,
	JsonlEntry,
	MarkdownEntry,
	ProjectState,
} from "../../../src/core/data/tree.js";

// ── Fixture ──────────────────────────────────────────────────

const fixture: ProjectState = {
	type: "directory",
	contents: {
		"project.json": {
			type: "json",
			content: { name: "test", version: "1.0.0" },
		} satisfies JsonEntry<{ name: string; version: string }>,
		"activity-log.jsonl": {
			type: "jsonl",
			content: [
				{ ts: "2026-01-01T00:00:00Z", phase: "init" },
				{ ts: "2026-01-01T00:01:00Z", phase: "create-epic" },
			],
		} satisfies JsonlEntry<{ ts: string; phase: string }>,
		"idea.md": {
			type: "markdown",
			content: "# My Project\n\nA great idea.",
		} satisfies MarkdownEntry,
		"overview.json": {
			type: "json",
			content: { epics: [], quests: [], tasks: [] },
		} satisfies JsonEntry<{ epics: unknown[]; quests: unknown[]; tasks: unknown[] }>,
		epics: {
			type: "directory",
			contents: {
				"my-epic": {
					type: "directory",
					contents: {
						"epic.json": {
							type: "json",
							content: { name: "my-epic", status: "activated" },
						},
						architecture: {
							type: "directory",
							contents: {
								"_overview.md": {
									type: "markdown",
									content: "# Architecture",
								},
							},
						},
					},
				},
			},
		} satisfies DirectoryEntry,
	},
};

// ── ZERO_STATE ───────────────────────────────────────────────

describe("ZERO_STATE", () => {
	it("is an empty directory", () => {
		expect(ZERO_STATE.type).toBe("directory");
		expect(ZERO_STATE.contents).toEqual({});
	});
});

// ── resolve ──────────────────────────────────────────────────

describe("resolve", () => {
	it("resolves a top-level json entry", () => {
		const entry = resolve(fixture, "project.json");
		expect(entry).toBeDefined();
		expect(entry!.type).toBe("json");
		expect((entry as JsonEntry<unknown>).content).toEqual({
			name: "test",
			version: "1.0.0",
		});
	});

	it("resolves a nested directory", () => {
		const entry = resolve(fixture, "epics/my-epic");
		expect(entry).toBeDefined();
		expect(entry!.type).toBe("directory");
	});

	it("resolves a deeply nested entry", () => {
		const entry = resolve(fixture, "epics/my-epic/epic.json");
		expect(entry).toBeDefined();
		expect(entry!.type).toBe("json");
	});

	it("resolves a deeply nested markdown", () => {
		const entry = resolve(fixture, "epics/my-epic/architecture/_overview.md");
		expect(entry).toBeDefined();
		expect(entry!.type).toBe("markdown");
	});

	it("returns undefined for missing path", () => {
		expect(resolve(fixture, "nonexistent.json")).toBeUndefined();
	});

	it("returns undefined for missing intermediate directory", () => {
		expect(resolve(fixture, "foo/bar/baz.json")).toBeUndefined();
	});

	it("returns undefined when traversing through a non-directory", () => {
		expect(resolve(fixture, "project.json/nested")).toBeUndefined();
	});

	it("returns root for empty path", () => {
		const entry = resolve(fixture, "");
		expect(entry).toBe(fixture);
	});

	it("handles leading and trailing slashes", () => {
		const entry = resolve(fixture, "/project.json/");
		expect(entry).toBeDefined();
		expect(entry!.type).toBe("json");
	});
});

// ── getJson ──────────────────────────────────────────────────

describe("getJson", () => {
	it("returns typed content for a json entry", () => {
		const content = getJson<{ name: string; version: string }>(
			fixture,
			"project.json",
		);
		expect(content).toEqual({ name: "test", version: "1.0.0" });
	});

	it("returns undefined for missing path", () => {
		expect(getJson(fixture, "missing.json")).toBeUndefined();
	});

	it("returns undefined for non-json entry", () => {
		expect(getJson(fixture, "idea.md")).toBeUndefined();
	});

	it("returns undefined for directory", () => {
		expect(getJson(fixture, "epics")).toBeUndefined();
	});
});

// ── getJsonl ─────────────────────────────────────────────────

describe("getJsonl", () => {
	it("returns content array for a jsonl entry", () => {
		const content = getJsonl<{ ts: string; phase: string }>(
			fixture,
			"activity-log.jsonl",
		);
		expect(content).toHaveLength(2);
		expect(content![0]!.phase).toBe("init");
	});

	it("returns undefined for missing path", () => {
		expect(getJsonl(fixture, "missing.jsonl")).toBeUndefined();
	});

	it("returns undefined for non-jsonl entry", () => {
		expect(getJsonl(fixture, "project.json")).toBeUndefined();
	});
});

// ── getDir ───────────────────────────────────────────────────

describe("getDir", () => {
	it("returns a directory entry", () => {
		const dir = getDir(fixture, "epics");
		expect(dir).toBeDefined();
		expect(dir!.type).toBe("directory");
		expect(dir!.contents["my-epic"]).toBeDefined();
	});

	it("returns root for empty path", () => {
		const dir = getDir(fixture, "");
		expect(dir).toBe(fixture);
	});

	it("returns undefined for non-directory", () => {
		expect(getDir(fixture, "project.json")).toBeUndefined();
	});

	it("returns undefined for missing path", () => {
		expect(getDir(fixture, "nonexistent")).toBeUndefined();
	});
});

// ── getMarkdown ──────────────────────────────────────────────

describe("getMarkdown", () => {
	it("returns raw text content", () => {
		const md = getMarkdown(fixture, "idea.md");
		expect(md).toBe("# My Project\n\nA great idea.");
	});

	it("returns undefined for non-markdown entry", () => {
		expect(getMarkdown(fixture, "project.json")).toBeUndefined();
	});

	it("returns undefined for missing path", () => {
		expect(getMarkdown(fixture, "missing.md")).toBeUndefined();
	});
});

// ── hasChild ─────────────────────────────────────────────────

describe("hasChild", () => {
	it("returns true for existing child in root", () => {
		expect(hasChild(fixture, "", "project.json")).toBe(true);
	});

	it("returns true for existing child in nested directory", () => {
		expect(hasChild(fixture, "epics/my-epic", "epic.json")).toBe(true);
	});

	it("returns true for directory child", () => {
		expect(hasChild(fixture, "epics", "my-epic")).toBe(true);
	});

	it("returns false for missing child", () => {
		expect(hasChild(fixture, "", "nonexistent")).toBe(false);
	});

	it("returns false for missing directory path", () => {
		expect(hasChild(fixture, "nonexistent/dir", "child")).toBe(false);
	});

	it("returns false when dirPath points to a non-directory", () => {
		expect(hasChild(fixture, "project.json", "anything")).toBe(false);
	});

	it("returns false for deeply nested missing child", () => {
		expect(
			hasChild(fixture, "epics/my-epic/architecture", "missing.md"),
		).toBe(false);
	});

	it("returns true for deeply nested existing child", () => {
		expect(
			hasChild(fixture, "epics/my-epic/architecture", "_overview.md"),
		).toBe(true);
	});
});

// ── setEntry ─────────────────────────────────────────────────

describe("setEntry", () => {
	it("adds a new entry at root level", () => {
		const newEntry: JsonEntry<{ test: boolean }> = {
			type: "json",
			content: { test: true },
		};
		const result = setEntry(fixture, "new-file.json", newEntry);

		// New entry is present
		expect(resolve(result, "new-file.json")).toEqual(newEntry);

		// Original is not mutated
		expect(resolve(fixture, "new-file.json")).toBeUndefined();
	});

	it("replaces an existing entry", () => {
		const replacement: JsonEntry<{ name: string }> = {
			type: "json",
			content: { name: "replaced" },
		};
		const result = setEntry(fixture, "project.json", replacement);

		expect(resolve(result, "project.json")).toEqual(replacement);
		// Original unchanged
		expect(
			(resolve(fixture, "project.json") as JsonEntry<unknown>).content,
		).toEqual({ name: "test", version: "1.0.0" });
	});

	it("adds a nested entry within existing directory", () => {
		const newEpicJson: JsonEntry<{ name: string }> = {
			type: "json",
			content: { name: "new-epic" },
		};
		const result = setEntry(
			fixture,
			"epics/new-epic/epic.json",
			newEpicJson,
		);

		expect(resolve(result, "epics/new-epic/epic.json")).toEqual(newEpicJson);
		// Intermediate directory was created
		expect(getDir(result, "epics/new-epic")).toBeDefined();
		// Existing sibling preserved
		expect(resolve(result, "epics/my-epic/epic.json")).toBeDefined();
	});

	it("auto-creates intermediate directories for deep paths", () => {
		const entry: MarkdownEntry = {
			type: "markdown",
			content: "# Plan",
		};
		const result = setEntry(
			ZERO_STATE,
			"a/b/c/d/plan.md",
			entry,
		);

		expect(getDir(result, "a")).toBeDefined();
		expect(getDir(result, "a/b")).toBeDefined();
		expect(getDir(result, "a/b/c")).toBeDefined();
		expect(getDir(result, "a/b/c/d")).toBeDefined();
		expect(getMarkdown(result, "a/b/c/d/plan.md")).toBe("# Plan");
	});

	it("does not mutate the original tree on nested set", () => {
		const entry: JsonEntry<string> = { type: "json", content: "new" };
		const original = structuredClone(fixture);
		setEntry(fixture, "epics/my-epic/new.json", entry);

		// Original should be structurally identical (deep compare against deep clone)
		expect(fixture).toEqual(original);
	});

	it("preserves sibling entries when adding to a directory", () => {
		const entry: JsonEntry<string> = { type: "json", content: "added" };
		const result = setEntry(fixture, "epics/another.json", entry);

		// New entry present
		expect(resolve(result, "epics/another.json")).toEqual(entry);
		// Siblings preserved
		expect(resolve(result, "epics/my-epic/epic.json")).toBeDefined();
		expect(resolve(result, "epics/my-epic/epic.json")).toBeDefined();
	});

	it("throws when a non-directory exists at an intermediate path", () => {
		// "project.json" is a json entry; setting "project.json/child" should throw
		const entry: JsonEntry<string> = { type: "json", content: "deep" };
		expect(() => setEntry(fixture, "project.json/child.json", entry)).toThrow(
			'setEntry: non-directory entry exists at intermediate path "project.json"',
		);
	});

	it("throws when setting root to a non-directory", () => {
		const entry: JsonEntry<string> = { type: "json", content: "bad" };
		expect(() => setEntry(fixture, "", entry)).toThrow(
			"Cannot replace root with a non-directory entry",
		);
	});

	it("does not mutate sibling entries (same object references)", () => {
		const entry: JsonEntry<string> = { type: "json", content: "added" };
		const epicsBefore = resolve(fixture, "epics");
		const slicesBefore = resolve(fixture, "slices");
		const result = setEntry(fixture, "new-top.json", entry);

		// Sibling entries in the new tree should be the exact same object references
		expect(resolve(result, "epics")).toBe(epicsBefore);
		expect(resolve(result, "slices")).toBe(slicesBefore);
	});

	it("setting root to a directory replaces the tree", () => {
		const newRoot: DirectoryEntry = {
			type: "directory",
			contents: { "only.json": { type: "json", content: "only" } },
		};
		const result = setEntry(fixture, "", newRoot);
		expect(result).toEqual(newRoot);
	});
});
