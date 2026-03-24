import { describe, expect, it } from "vitest";
import {
	checkCompatibility,
	parseSemver,
	semverGreaterThan,
} from "../../../src/util/semver.js";
import { GoodplanError } from "../../../src/util/errors.js";

describe("parseSemver", () => {
	it("parses valid semver strings", () => {
		expect(parseSemver("1.0.0")).toEqual({ major: 1, minor: 0, patch: 0 });
		expect(parseSemver("0.0.1")).toEqual({ major: 0, minor: 0, patch: 1 });
		expect(parseSemver("12.34.56")).toEqual({ major: 12, minor: 34, patch: 56 });
	});

	it("throws VALIDATION_INVALID_INPUT for invalid strings", () => {
		expect(() => parseSemver("")).toThrow(GoodplanError);
		expect(() => parseSemver("1.0")).toThrow(GoodplanError);
		expect(() => parseSemver("1.0.0.0")).toThrow(GoodplanError);
		expect(() => parseSemver("abc")).toThrow(GoodplanError);
		expect(() => parseSemver("v1.0.0")).toThrow(GoodplanError);
		expect(() => parseSemver("1.0.0-beta")).toThrow(GoodplanError);
	});

	it("throws with correct error code", () => {
		try {
			parseSemver("bad");
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(GoodplanError);
			expect((error as GoodplanError).code).toBe("VALIDATION_INVALID_INPUT");
		}
	});
});

describe("checkCompatibility", () => {
	it("returns 'compatible' when versions match", () => {
		expect(checkCompatibility("1.0.0", "1.0.0")).toBe("compatible");
	});

	it("returns 'compatible' when CLI minor is ahead", () => {
		expect(checkCompatibility("1.2.0", "1.0.0")).toBe("compatible");
		expect(checkCompatibility("1.2.5", "1.1.0")).toBe("compatible");
	});

	it("returns 'compatible' when CLI patch is ahead (same minor)", () => {
		expect(checkCompatibility("1.0.5", "1.0.0")).toBe("compatible");
	});

	it("returns 'cli-minor-behind' when data minor > CLI minor", () => {
		expect(checkCompatibility("1.0.0", "1.1.0")).toBe("cli-minor-behind");
		expect(checkCompatibility("1.0.0", "1.2.0")).toBe("cli-minor-behind");
	});

	it("returns 'major-ahead' when CLI major > data major", () => {
		expect(checkCompatibility("2.0.0", "1.0.0")).toBe("major-ahead");
		expect(checkCompatibility("3.0.0", "1.5.0")).toBe("major-ahead");
	});

	it("returns 'major-behind' when CLI major < data major", () => {
		expect(checkCompatibility("1.0.0", "2.0.0")).toBe("major-behind");
		expect(checkCompatibility("1.5.0", "3.0.0")).toBe("major-behind");
	});
});

describe("semverGreaterThan", () => {
	it("compares major", () => {
		expect(semverGreaterThan({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBe(true);
		expect(semverGreaterThan({ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 })).toBe(false);
	});

	it("compares minor when major equal", () => {
		expect(semverGreaterThan({ major: 1, minor: 2, patch: 0 }, { major: 1, minor: 1, patch: 0 })).toBe(true);
		expect(semverGreaterThan({ major: 1, minor: 1, patch: 0 }, { major: 1, minor: 2, patch: 0 })).toBe(false);
	});

	it("compares patch when major and minor equal", () => {
		expect(semverGreaterThan({ major: 1, minor: 0, patch: 2 }, { major: 1, minor: 0, patch: 1 })).toBe(true);
		expect(semverGreaterThan({ major: 1, minor: 0, patch: 1 }, { major: 1, minor: 0, patch: 2 })).toBe(false);
	});

	it("returns false when equal", () => {
		expect(semverGreaterThan({ major: 1, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBe(false);
	});
});
