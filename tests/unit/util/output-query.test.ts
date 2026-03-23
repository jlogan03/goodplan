import { describe, expect, it, vi } from "vitest";
import { output } from "../../../src/util/output.js";

describe("output with --query", () => {
	it("applies jq expression and outputs filtered result", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		output({ items: [{ name: "a" }, { name: "b" }] }, { query: ".items[0].name" });

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(JSON.parse(written)).toBe("a");

		writeSpy.mockRestore();
	});

	it("--query auto-implies json mode (works without explicit --json)", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		// Pass string data but with query — should still produce JSON output from structured data
		output({ project: { name: "test" } }, { query: ".project.name" });

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(JSON.parse(written)).toBe("test");

		writeSpy.mockRestore();
	});

	it("--query overrides --quiet", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		output({ value: 42 }, { query: ".value", quiet: true });

		// Should still produce output despite --quiet
		expect(writeSpy).toHaveBeenCalled();
		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(JSON.parse(written)).toBe(42);

		writeSpy.mockRestore();
	});

	it("returns null for empty query result with exit 0", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		output({ a: 1 }, { query: ".nonexistent.deep.path" });

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(JSON.parse(written)).toBeNull();

		writeSpy.mockRestore();
	});

	it("throws VALIDATION_INVALID_QUERY for invalid jq expression", () => {
		expect(() => {
			output({ a: 1 }, { query: ".[invalid!!!" });
		}).toThrow("Invalid jq expression");
	});

	it("returns multiple results as array", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		output({ items: ["x", "y", "z"] }, { query: ".items[]" });

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(JSON.parse(written)).toEqual(["x", "y", "z"]);

		writeSpy.mockRestore();
	});
});
