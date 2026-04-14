import { describe, expect, it } from "vitest";
import { ExtractorRegistry } from "../../../src/trust/extractors/registry.js";
import type { ExtractorDefinition } from "../../../src/trust/extractors/types.js";

function makeDef(id: string): ExtractorDefinition<unknown> {
	return {
		id,
		description: `Test extractor: ${id}`,
		extract: (markdown: string) => ({
			success: true as const,
			data: { raw: markdown },
		}),
	};
}

function makeFailingDef(id: string): ExtractorDefinition<unknown> {
	return {
		id,
		description: `Failing extractor: ${id}`,
		extract: () => ({
			success: false as const,
			error: {
				code: "FRONTMATTER_MISSING" as const,
				message: "No frontmatter",
			},
		}),
	};
}

describe("ExtractorRegistry", () => {
	it("register + getById returns the definition", () => {
		const registry = new ExtractorRegistry();
		const def = makeDef("test-1");
		registry.register(def);
		expect(registry.getById("test-1")).toBe(def);
	});

	it("register + getAll returns all definitions", () => {
		const registry = new ExtractorRegistry();
		const def1 = makeDef("test-1");
		const def2 = makeDef("test-2");
		registry.register(def1);
		registry.register(def2);
		const all = registry.getAll();
		expect(all).toHaveLength(2);
		expect(all).toContain(def1);
		expect(all).toContain(def2);
	});

	it("duplicate ID throws", () => {
		const registry = new ExtractorRegistry();
		registry.register(makeDef("dup"));
		expect(() => registry.register(makeDef("dup"))).toThrow('Duplicate extractor ID: "dup"');
	});

	it("getById for unknown ID returns undefined", () => {
		const registry = new ExtractorRegistry();
		expect(registry.getById("nonexistent")).toBeUndefined();
	});

	it("extract convenience method runs the extractor and returns ExtractResult<unknown>", () => {
		const registry = new ExtractorRegistry();
		registry.register(makeDef("test-ext"));
		const result = registry.extract("test-ext", "# Hello");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({ raw: "# Hello" });
		}
	});

	it("extract returns failure for unknown extractor ID", () => {
		const registry = new ExtractorRegistry();
		const result = registry.extract("missing", "# Hello");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.code).toBe("SCHEMA_INVALID");
			expect(result.error.message).toContain("missing");
		}
	});

	it("extract propagates extractor failure result", () => {
		const registry = new ExtractorRegistry();
		registry.register(makeFailingDef("fail-ext"));
		const result = registry.extract("fail-ext", "no frontmatter here");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.code).toBe("FRONTMATTER_MISSING");
		}
	});
});
