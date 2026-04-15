import { describe, expect, it } from "vitest";
import { estimateTokens } from "../../src/context/token-estimate.js";

describe("estimateTokens", () => {
	it("returns 0 for empty string", () => {
		expect(estimateTokens("")).toBe(0);
	});

	it("estimates ~1 token per 4 characters", () => {
		// 100 chars -> 25 tokens
		const input = "a".repeat(100);
		expect(estimateTokens(input)).toBe(25);
	});

	it("rounds up for non-divisible lengths", () => {
		// 5 chars -> ceil(5/4) = 2
		expect(estimateTokens("hello")).toBe(2);
	});

	it("handles single character", () => {
		expect(estimateTokens("x")).toBe(1);
	});

	it("handles longer content", () => {
		const content = "The quick brown fox jumps over the lazy dog.";
		// 44 chars -> ceil(44/4) = 11
		expect(estimateTokens(content)).toBe(11);
	});
});
