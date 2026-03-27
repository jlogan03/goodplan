import { describe, expect, it } from "vitest";
import { deriveSlug } from "../../../src/util/slug.js";

describe("deriveSlug", () => {
	it("converts summary to kebab-case", () => {
		expect(deriveSlug("Data Layer Needs Caching", new Set())).toBe("data-layer-needs-caching");
	});

	it("strips non-alphanumeric characters", () => {
		expect(deriveSlug("Schema registry changes are load-bearing!", new Set())).toBe(
			"schema-registry-changes-are-load-bearing",
		);
	});

	it("collapses consecutive hyphens", () => {
		expect(deriveSlug("foo --- bar", new Set())).toBe("foo-bar");
	});

	it("trims leading and trailing hyphens", () => {
		expect(deriveSlug("  --hello world--  ", new Set())).toBe("hello-world");
	});

	it("truncates at word boundary before 60 chars", () => {
		const longSummary =
			"This is a very long summary that exceeds the sixty character limit and should be truncated at a word boundary";
		const slug = deriveSlug(longSummary, new Set());
		expect(slug.length).toBeLessThanOrEqual(60);
		// Should truncate at a hyphen boundary
		expect(slug).not.toContain(" ");
		expect(slug.endsWith("-")).toBe(false);
	});

	it("handles summary that is exactly 60 chars after normalization", () => {
		// 60 chars of kebab-case
		const summary = "a".repeat(60);
		const slug = deriveSlug(summary, new Set());
		expect(slug).toBe("a".repeat(60));
	});

	it("handles collision by appending -2", () => {
		const existing = new Set(["my-slug"]);
		expect(deriveSlug("My Slug", existing)).toBe("my-slug-2");
	});

	it("handles multiple collisions", () => {
		const existing = new Set(["my-slug", "my-slug-2", "my-slug-3"]);
		expect(deriveSlug("My Slug", existing)).toBe("my-slug-4");
	});

	it("returns fallback for all-special-character summary", () => {
		const slug = deriveSlug("!@#$%^&*()", new Set());
		expect(slug).toBe("learning");
	});

	it("returns fallback for empty summary", () => {
		const slug = deriveSlug("", new Set());
		expect(slug).toBe("learning");
	});

	it("fallback handles collision via standard loop", () => {
		const existing = new Set(["learning"]);
		const slug = deriveSlug("!!!", existing);
		expect(slug).toBe("learning-2");
	});

	it("fallback handles multiple collisions", () => {
		const existing = new Set(["learning", "learning-2"]);
		const slug = deriveSlug("!!!", existing);
		expect(slug).toBe("learning-3");
	});

	it("handles unicode characters", () => {
		const slug = deriveSlug("Zod v4 optional() vs exactOptionalPropertyTypes", new Set());
		expect(slug).toBe("zod-v4-optional-vs-exactoptionalpropertytypes");
	});

	it("truncates long slug at last hyphen before 60", () => {
		const summary = "this-word is-here and-more-words keep-going until-we-exceed the-sixty char-limit by-a-lot";
		const slug = deriveSlug(summary, new Set());
		expect(slug.length).toBeLessThanOrEqual(60);
		// Verify it ends at a word boundary (no trailing hyphen)
		expect(slug.endsWith("-")).toBe(false);
	});
});
