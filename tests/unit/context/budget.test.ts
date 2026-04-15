import { describe, expect, it } from "vitest";
import { DEFAULT_INLINE_BUDGET, applyBudget } from "../../../src/core/context/budget.js";
import type { CollectedEntry } from "../../../src/core/context/collect.js";

describe("applyBudget", () => {
	const entries: CollectedEntry[] = [
		{ key: "a.md", content: "Short content" },
		{ key: "b.md", content: "Medium content here for testing budget" },
		{ key: "c.md", content: "Another entry with some content" },
	];

	it("inlines all entries when they fit within budget", () => {
		const result = applyBudget(entries, 10000);
		expect(Object.keys(result.inline)).toHaveLength(3);
		expect(result.references).toHaveLength(0);
		expect(result.inline["a.md"]).toBe("Short content");
		expect(result.inline["b.md"]).toBe("Medium content here for testing budget");
		expect(result.inline["c.md"]).toBe("Another entry with some content");
	});

	it("overflows entries to references when budget exceeded", () => {
		// Budget just enough for first entry (13 bytes for "Short content")
		const result = applyBudget(entries, 14);
		expect(Object.keys(result.inline)).toHaveLength(1);
		expect(result.inline["a.md"]).toBe("Short content");
		expect(result.references).toEqual(["b.md", "c.md"]);
	});

	it("returns all references with zero budget (except first entry)", () => {
		const result = applyBudget(entries, 0);
		// First entry is always inlined regardless of budget
		expect(Object.keys(result.inline)).toHaveLength(1);
		expect(result.inline["a.md"]).toBe("Short content");
		expect(result.references).toEqual(["b.md", "c.md"]);
	});

	it("always inlines the first entry even if it exceeds budget", () => {
		const bigEntry: CollectedEntry[] = [
			{ key: "big.md", content: "x".repeat(50000) },
			{ key: "small.md", content: "tiny" },
		];
		const result = applyBudget(bigEntry, 100);
		expect(Object.keys(result.inline)).toHaveLength(1);
		expect(result.inline["big.md"]).toBe("x".repeat(50000));
		expect(result.references).toEqual(["small.md"]);
	});

	it("returns empty inline and references for empty entries", () => {
		const result = applyBudget([], 10000);
		expect(result.inline).toEqual({});
		expect(result.references).toEqual([]);
	});

	it("uses Buffer.byteLength for budget calculation (multi-byte chars)", () => {
		// Each emoji is 4 bytes in UTF-8
		const multiByteEntries: CollectedEntry[] = [
			{ key: "first.md", content: "ok" },
			// 10 emoji chars = 40 bytes in UTF-8 but 20 in string.length
			{
				key: "emoji.md",
				content:
					"\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}",
			},
		];
		// Budget: 2 (for "ok") + 30 = 32. String.length of emojis is 20 but byte size is 40.
		// So with budget 32, the emoji entry should NOT fit.
		const result = applyBudget(multiByteEntries, 32);
		expect(Object.keys(result.inline)).toHaveLength(1);
		expect(result.references).toEqual(["emoji.md"]);
	});

	it("has DEFAULT_INLINE_BUDGET of 20480", () => {
		expect(DEFAULT_INLINE_BUDGET).toBe(20480);
	});
});
