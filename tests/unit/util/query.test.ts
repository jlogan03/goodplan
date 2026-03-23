import { describe, expect, it } from "vitest";
import { applyQuery } from "../../../src/util/query.js";

describe("applyQuery", () => {
	const sampleData = {
		project: { name: "test", version: "1.0.0" },
		activeEpic: null,
		recommendations: ["Do something", "Do another thing"],
	};

	it("extracts a nested field", () => {
		const result = applyQuery(sampleData, ".project.name");
		expect(result).toBe("test");
	});

	it("returns null when expression matches nothing", () => {
		const result = applyQuery(sampleData, ".nonexistent.field");
		expect(result).toBeNull();
	});

	it("returns array for multiple results", () => {
		const result = applyQuery(sampleData, ".recommendations[]");
		expect(result).toEqual(["Do something", "Do another thing"]);
	});

	it("throws VALIDATION_INVALID_QUERY for invalid expression", () => {
		expect(() => applyQuery(sampleData, ".[invalid!!!")).toThrow("Invalid jq expression");
	});

	it("handles identity expression", () => {
		const result = applyQuery(sampleData, ".");
		expect(result).toEqual(sampleData);
	});

	it("handles null values", () => {
		const result = applyQuery(sampleData, ".activeEpic");
		expect(result).toBeNull();
	});
});
