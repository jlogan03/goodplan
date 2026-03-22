import { describe, expect, it } from "vitest";
import { deterministicStringify } from "../../../src/util/json.js";

describe("deterministicStringify", () => {
	it("sorts keys alphabetically", () => {
		const input = { zebra: 1, apple: 2, mango: 3 };
		const output = deterministicStringify(input);
		const keys = Object.keys(JSON.parse(output));
		expect(keys).toEqual(["apple", "mango", "zebra"]);
	});

	it("sorts nested object keys", () => {
		const input = { z: { b: 1, a: 2 }, a: { d: 3, c: 4 } };
		const output = deterministicStringify(input);
		const parsed = JSON.parse(output);
		expect(Object.keys(parsed)).toEqual(["a", "z"]);
		expect(Object.keys(parsed.a)).toEqual(["c", "d"]);
		expect(Object.keys(parsed.z)).toEqual(["a", "b"]);
	});

	it("handles arrays without reordering elements", () => {
		const input = { items: [{ z: 1, a: 2 }, { b: 3 }] };
		const output = deterministicStringify(input);
		const parsed = JSON.parse(output);
		expect(parsed.items[0]).toEqual({ a: 2, z: 1 });
		expect(parsed.items[1]).toEqual({ b: 3 });
	});

	it("handles null and primitives", () => {
		expect(deterministicStringify(null)).toBe("null");
		expect(deterministicStringify("hello")).toBe('"hello"');
		expect(deterministicStringify(42)).toBe("42");
	});
});
