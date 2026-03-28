import { describe, expect, it } from "vitest";
import { serializeStateTree } from "../../../src/core/data/serialize.js";
import type { SerializeOptions } from "../../../src/core/data/serialize.js";
import type {
	DirectoryEntry,
	JsonEntry,
	JsonlEntry,
	MarkdownEntry,
	ProjectState,
	StateEntry,
} from "../../../src/core/tree.js";

// ── Helpers ──────────────────────────────────────────────────

const INLINE: SerializeOptions = { inline: true };
const NO_INLINE: SerializeOptions = { inline: false };

function dir(contents: Record<string, StateEntry>): DirectoryEntry {
	return { type: "directory", contents };
}

function json<T>(content: T): JsonEntry<T> {
	return { type: "json", content };
}

function jsonl<T>(content: T[]): JsonlEntry<T> {
	return { type: "jsonl", content };
}

function md(content: string): MarkdownEntry {
	return { type: "markdown", content };
}

// ── Flat tree with json/jsonl entries ────────────────────────

describe("serializeStateTree", () => {
	it("unwraps json entries", () => {
		const state: ProjectState = dir({
			"project.json": json({ name: "test" }),
		});
		const result = serializeStateTree(state, NO_INLINE);
		expect(result["project.json"]).toEqual({ name: "test" });
	});

	it("unwraps jsonl entries", () => {
		const state: ProjectState = dir({
			"log.jsonl": jsonl([{ a: 1 }, { a: 2 }]),
		});
		const result = serializeStateTree(state, NO_INLINE);
		expect(result["log.jsonl"]).toEqual([{ a: 1 }, { a: 2 }]);
	});

	// ── Nested directories ───────────────────────────────────

	it("serializes nested directories recursively", () => {
		const state: ProjectState = dir({
			epics: dir({
				"overview.json": json({ items: [] }),
				e1: dir({
					"epic.json": json({ name: "e1" }),
				}),
			}),
		});
		const result = serializeStateTree(state, NO_INLINE);
		const epics = result.epics as Record<string, unknown>;
		expect(epics["overview.json"]).toEqual({ items: [] });
		const e1 = epics.e1 as Record<string, unknown>;
		expect(e1["epic.json"]).toEqual({ name: "e1" });
	});

	// ── Markdown handling ────────────────────────────────────

	it("returns true for markdown when inline is false", () => {
		const state: ProjectState = dir({
			"readme.md": md("# Hello"),
		});
		const result = serializeStateTree(state, NO_INLINE);
		expect(result["readme.md"]).toBe(true);
	});

	it("returns raw string for markdown when inline is true", () => {
		const state: ProjectState = dir({
			"readme.md": md("# Hello"),
		});
		const result = serializeStateTree(state, INLINE);
		expect(result["readme.md"]).toBe("# Hello");
	});

	// ── Mixed entry types ────────────────────────────────────

	it("handles mixed entry types in one tree", () => {
		const state: ProjectState = dir({
			"project.json": json({ name: "test" }),
			"log.jsonl": jsonl([{ ts: "1" }]),
			"readme.md": md("# Test"),
			sub: dir({
				"data.json": json({ x: 1 }),
			}),
		});
		const result = serializeStateTree(state, NO_INLINE);
		expect(result["project.json"]).toEqual({ name: "test" });
		expect(result["log.jsonl"]).toEqual([{ ts: "1" }]);
		expect(result["readme.md"]).toBe(true);
		const sub = result.sub as Record<string, unknown>;
		expect(sub["data.json"]).toEqual({ x: 1 });
	});

	// ── Exhaustive switch coverage ───────────────────────────

	it("covers all StateEntry types", () => {
		// Verify each type processes without error
		const state: ProjectState = dir({
			"a.json": json("val"),
			"b.jsonl": jsonl([1, 2]),
			"c.md": md("text"),
			d: dir({}),
		});
		const result = serializeStateTree(state, INLINE);
		expect(result["a.json"]).toBe("val");
		expect(result["b.jsonl"]).toEqual([1, 2]);
		expect(result["c.md"]).toBe("text");
		expect(result.d).toEqual({});
	});

	it("serializes empty directory in NO_INLINE mode", () => {
		const state: ProjectState = dir({
			empty: dir({}),
		});
		const result = serializeStateTree(state, NO_INLINE);
		expect(result.empty).toEqual({});
	});

	it("serializes empty tree as top-level input", () => {
		const state: ProjectState = dir({});
		const result = serializeStateTree(state, NO_INLINE);
		expect(result).toEqual({});
	});

	it("throws on invalid entry type", () => {
		// Intentional: testing runtime guard against invalid input
		const state: ProjectState = dir({
			// biome-ignore lint/suspicious/noExplicitAny: Intentional: testing runtime guard against invalid input
			"bad.txt": { type: "text", content: "nope" } as any,
		});
		expect(() => serializeStateTree(state, NO_INLINE)).toThrow(/Unknown StateEntry type/);
	});
});
