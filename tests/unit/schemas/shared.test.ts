import { describe, expect, it } from "vitest";
import { timestampSchema, versionSchema } from "../../../src/schemas/shared.js";

describe("timestampSchema", () => {
	it("accepts valid ISO 8601 timestamps", () => {
		expect(timestampSchema.safeParse("2026-03-20T00:00:00Z").success).toBe(true);
		expect(timestampSchema.safeParse("2026-03-20T12:34:56.789Z").success).toBe(true);
	});

	it("rejects invalid timestamps", () => {
		expect(timestampSchema.safeParse("not-a-date").success).toBe(false);
		expect(timestampSchema.safeParse("").success).toBe(false);
		expect(timestampSchema.safeParse(123).success).toBe(false);
	});
});

describe("versionSchema", () => {
	it("accepts valid semver strings", () => {
		expect(versionSchema.safeParse("1.0.0").success).toBe(true);
		expect(versionSchema.safeParse("0.0.1").success).toBe(true);
		expect(versionSchema.safeParse("10.20.30").success).toBe(true);
	});

	it("rejects invalid version strings", () => {
		expect(versionSchema.safeParse("1.0").success).toBe(false);
		expect(versionSchema.safeParse("v1.0.0").success).toBe(false);
		expect(versionSchema.safeParse("").success).toBe(false);
		expect(versionSchema.safeParse("abc").success).toBe(false);
	});
});
