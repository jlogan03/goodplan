import { describe, expect, it } from "vitest";
import { errorSchema } from "../../../src/schemas/error-output.js";

describe("errorSchema", () => {
	it("accepts error with code and message", () => {
		const result = errorSchema.safeParse({ code: "DATA_NOT_FOUND", message: "Not found" });
		expect(result.success).toBe(true);
	});

	it("accepts error with detail", () => {
		const result = errorSchema.safeParse({
			code: "DATA_NOT_FOUND",
			message: "Not found",
			detail: "/path/to/file",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing code", () => {
		expect(errorSchema.safeParse({ message: "Not found" }).success).toBe(false);
	});

	it("rejects missing message", () => {
		expect(errorSchema.safeParse({ code: "ERR" }).success).toBe(false);
	});
});
