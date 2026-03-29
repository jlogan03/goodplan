import { describe, expect, it } from "vitest";
import {
	applyPagination,
	formatPaginationFooter,
	parseNonNegativeInt,
} from "../../../src/util/pagination.js";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("parseNonNegativeInt", () => {
	it("returns undefined for undefined", () => {
		expect(parseNonNegativeInt(undefined, "test")).toBeUndefined();
	});

	it("returns undefined for empty string", () => {
		expect(parseNonNegativeInt("", "test")).toBeUndefined();
	});

	it("parses '0' as 0", () => {
		expect(parseNonNegativeInt("0", "test")).toBe(0);
	});

	it("parses positive integers", () => {
		expect(parseNonNegativeInt("5", "test")).toBe(5);
		expect(parseNonNegativeInt("100", "test")).toBe(100);
	});

	it("throws on negative values", () => {
		expect(() => parseNonNegativeInt("-1", "test")).toThrow(
			expect.objectContaining({ code: "VALIDATION_INVALID_INPUT" }),
		);
	});

	it("throws on float values", () => {
		expect(() => parseNonNegativeInt("1.5", "test")).toThrow(
			expect.objectContaining({ code: "VALIDATION_INVALID_INPUT" }),
		);
	});

	it("throws on 'true' (bare flag)", () => {
		expect(() => parseNonNegativeInt("true", "test")).toThrow(
			expect.objectContaining({ code: "VALIDATION_INVALID_INPUT" }),
		);
	});

	it("throws on non-numeric strings", () => {
		expect(() => parseNonNegativeInt("abc", "test")).toThrow(
			expect.objectContaining({ code: "VALIDATION_INVALID_INPUT" }),
		);
	});

	it("parses very large numbers", () => {
		expect(parseNonNegativeInt("999999999", "test")).toBe(999999999);
	});
});

describe("applyPagination", () => {
	const items = ["a", "b", "c", "d", "e"];

	it("returns all items + total when no pagination args", () => {
		const result = applyPagination(items, {});
		expect(result.items).toEqual(["a", "b", "c", "d", "e"]);
		expect(result.total).toBe(5);
		expect(result).not.toHaveProperty("offset");
		expect(result).not.toHaveProperty("limit");
	});

	it("applies limit only — includes both limit and offset in result", () => {
		const result = applyPagination(items, { limit: "3" });
		expect(result.items).toEqual(["a", "b", "c"]);
		expect(result.total).toBe(5);
		expect(result.offset).toBe(0);
		expect(result.limit).toBe(3);
	});

	it("applies offset only — includes both offset and limit in result", () => {
		const result = applyPagination(items, { offset: "2" });
		expect(result.items).toEqual(["c", "d", "e"]);
		expect(result.total).toBe(5);
		expect(result.offset).toBe(2);
		expect(result.limit).toBe(5);
	});

	it("applies limit + offset together", () => {
		const result = applyPagination(items, { offset: "1", limit: "2" });
		expect(result.items).toEqual(["b", "c"]);
		expect(result.total).toBe(5);
		expect(result.offset).toBe(1);
		expect(result.limit).toBe(2);
	});

	it("offset beyond array length returns empty items, total unchanged", () => {
		const result = applyPagination(items, { offset: "10", limit: "3" });
		expect(result.items).toEqual([]);
		expect(result.total).toBe(5);
		expect(result.offset).toBe(10);
		expect(result.limit).toBe(3);
	});

	it("limit larger than array returns all items", () => {
		const result = applyPagination(items, { limit: "100" });
		expect(result.items).toEqual(["a", "b", "c", "d", "e"]);
		expect(result.total).toBe(5);
		expect(result.limit).toBe(100);
		expect(result.offset).toBe(0);
	});

	it("zero limit returns empty items", () => {
		const result = applyPagination(items, { limit: "0" });
		expect(result.items).toEqual([]);
		expect(result.total).toBe(5);
		expect(result.offset).toBe(0);
		expect(result.limit).toBe(0);
	});

	it("throws on negative limit", () => {
		expect(() => applyPagination(items, { limit: "-1" })).toThrow(
			expect.objectContaining({ code: "VALIDATION_INVALID_INPUT" }),
		);
	});

	it("throws on negative offset", () => {
		expect(() => applyPagination(items, { offset: "-1" })).toThrow(
			expect.objectContaining({ code: "VALIDATION_INVALID_INPUT" }),
		);
	});

	it("offset on empty array produces limit: 0", () => {
		const result = applyPagination([], { offset: "0" });
		expect(result.items).toEqual([]);
		expect(result.total).toBe(0);
		expect(result.offset).toBe(0);
		// limit defaults to total (0) when only offset is given
		expect(result.limit).toBe(0);
	});

	it("offset/limit keys are absent (not undefined) when no pagination args", () => {
		const result = applyPagination(items, {});
		const keys = Object.keys(result);
		expect(keys).not.toContain("offset");
		expect(keys).not.toContain("limit");
	});
});

describe("formatPaginationFooter", () => {
	it("returns undefined when not paginated", () => {
		const result = formatPaginationFooter({ items: ["a", "b"], total: 2 });
		expect(result).toBeUndefined();
	});

	it("returns undefined when all items shown", () => {
		const result = formatPaginationFooter({ items: ["a", "b"], total: 2, offset: 0, limit: 5 });
		expect(result).toBeUndefined();
	});

	it("returns footer when truncated", () => {
		const result = formatPaginationFooter({ items: ["a", "b"], total: 5, offset: 0, limit: 2 });
		expect(result).toBeDefined();
		// Strip ANSI codes for content check
		const stripped = stripAnsi(String(result));
		expect(stripped).toBe("\nShowing 1-2 of 5");
	});

	it("returns footer with offset", () => {
		const result = formatPaginationFooter({
			items: ["c", "d", "e"],
			total: 10,
			offset: 2,
			limit: 3,
		});
		const stripped = stripAnsi(String(result));
		expect(stripped).toBe("\nShowing 3-5 of 10");
	});

	it("returns footer when offset beyond total (empty items)", () => {
		const result = formatPaginationFooter({ items: [], total: 5, offset: 10, limit: 3 });
		expect(result).toBeDefined();
		const stripped = stripAnsi(String(result));
		expect(stripped).toBe("\nShowing 0 of 5");
	});
});
