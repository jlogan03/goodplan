import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateInput } from "../../../src/util/validate.js";

const testSchema = z.object({
	name: z.string(),
	count: z.number().optional(),
	active: z.boolean().optional(),
});

describe("validateInput", () => {
	it("validates args-only input", () => {
		const result = validateInput(testSchema, { name: "test", count: 5 }, {});
		expect(result).toEqual({ name: "test", count: 5 });
	});

	it("validates stdin-only input", () => {
		const result = validateInput(testSchema, {}, { name: "from-stdin", count: 10 });
		expect(result).toEqual({ name: "from-stdin", count: 10 });
	});

	it("CLI flags override stdin values", () => {
		const result = validateInput(
			testSchema,
			{ name: "from-flags" },
			{ name: "from-stdin", count: 10 },
		);
		expect(result).toEqual({ name: "from-flags", count: 10 });
	});

	it("undefined flag values do not override stdin", () => {
		const result = validateInput(testSchema, { name: undefined, count: 3 }, { name: "from-stdin" });
		expect(result).toEqual({ name: "from-stdin", count: 3 });
	});

	it("throws VALIDATION_INVALID_INPUT on schema failure", () => {
		expect(() => validateInput(testSchema, {}, {})).toThrow(
			expect.objectContaining({
				code: "VALIDATION_INVALID_INPUT",
			}),
		);
	});

	it("throws VALIDATION_INVALID_INPUT for wrong types", () => {
		expect(() => validateInput(testSchema, { name: 123 }, {})).toThrow(
			expect.objectContaining({
				code: "VALIDATION_INVALID_INPUT",
			}),
		);
	});

	it("strips global flags before validation", () => {
		const strictSchema = z.object({ name: z.string() }).strict();
		// With global flags present, strict schema would fail without stripping
		const result = validateInput(
			strictSchema,
			{ name: "test", json: true, quiet: false, verbose: false, help: false, version: false },
			{},
		);
		expect(result).toEqual({ name: "test" });
	});
});
