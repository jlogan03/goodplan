import { describe, expect, it } from "vitest";
import { GoodplanError, isGoodplanError } from "../../../src/util/errors.js";

describe("GoodplanError", () => {
	it("stores code, message, and detail", () => {
		const err = new GoodplanError("DATA_READ_ERROR", "Something went wrong", "extra detail");
		expect(err.code).toBe("DATA_READ_ERROR");
		expect(err.message).toBe("Something went wrong");
		expect(err.detail).toBe("extra detail");
		expect(err.name).toBe("GoodplanError");
	});

	it("has undefined detail when not provided", () => {
		const err = new GoodplanError("DATA_READ_ERROR", "Something went wrong");
		expect(err.detail).toBeUndefined();
	});

	it("is an instance of Error", () => {
		const err = new GoodplanError("DATA_READ_ERROR", "msg");
		expect(err).toBeInstanceOf(Error);
	});

	it("preserves cause when provided", () => {
		const original = new Error("original");
		const err = new GoodplanError("DATA_READ_ERROR", "wrapped", undefined, original);
		expect(err.cause).toBe(original);
	});

	it("has no cause when not provided", () => {
		const err = new GoodplanError("DATA_READ_ERROR", "msg");
		expect(err.cause).toBeUndefined();
	});
});

describe("isGoodplanError", () => {
	it("returns true for GoodplanError instances", () => {
		expect(isGoodplanError(new GoodplanError("DATA_READ_ERROR", "msg"))).toBe(true);
	});

	it("returns false for plain errors", () => {
		expect(isGoodplanError(new Error("plain"))).toBe(false);
	});

	it("returns false for non-error values", () => {
		expect(isGoodplanError(null)).toBe(false);
		expect(isGoodplanError("string")).toBe(false);
		expect(isGoodplanError({ code: "CODE", message: "msg" })).toBe(false);
	});
});
