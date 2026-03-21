import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { readEntity, writeEntity } from "../../../src/core/data/json.js";
import { deterministicStringify } from "../../../src/util/json.js";

const testSchema = z.object({
	alpha: z.string(),
	beta: z.number(),
	gamma: z.boolean(),
});

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-json-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

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

describe("readEntity", () => {
	it("reads and validates a JSON file", () => {
		const filePath = path.join(tmpDir, "test.json");
		fs.writeFileSync(filePath, JSON.stringify({ alpha: "a", beta: 1, gamma: true }));

		const result = readEntity(filePath, testSchema);
		expect(result).toEqual({ alpha: "a", beta: 1, gamma: true });
	});

	it("throws on file not found", () => {
		expect(() => readEntity(path.join(tmpDir, "nope.json"), testSchema)).toThrow("File not found");
	});

	it("throws on invalid JSON", () => {
		const filePath = path.join(tmpDir, "bad.json");
		fs.writeFileSync(filePath, "not json {{{");

		expect(() => readEntity(filePath, testSchema)).toThrow("Invalid JSON");
	});

	it("throws on schema validation failure", () => {
		const filePath = path.join(tmpDir, "invalid.json");
		fs.writeFileSync(filePath, JSON.stringify({ alpha: 123, beta: "wrong", gamma: "nope" }));

		expect(() => readEntity(filePath, testSchema)).toThrow("Validation failed");
	});
});

describe("writeEntity", () => {
	it("writes valid data with deterministic key ordering", () => {
		const filePath = path.join(tmpDir, "out.json");
		writeEntity(filePath, { alpha: "a", beta: 1, gamma: true }, testSchema);

		const raw = fs.readFileSync(filePath, "utf-8");
		const keys = Object.keys(JSON.parse(raw));
		expect(keys).toEqual(["alpha", "beta", "gamma"]);
	});

	it("throws on invalid data (validates before writing)", () => {
		const filePath = path.join(tmpDir, "bad-write.json");

		expect(() =>
			writeEntity(filePath, { alpha: 123 as unknown as string, beta: 1, gamma: true }, testSchema),
		).toThrow("Validation failed");

		// File should not have been created
		expect(fs.existsSync(filePath)).toBe(false);
	});

	it("accepts _expected param and succeeds without checking it (stub behavior)", () => {
		// TODO: when concurrent modification detection is implemented, this test
		// should be updated to verify the check is actually performed. Until then,
		// passing any value for _expected is a no-op — the write still succeeds even
		// if the on-disk state has diverged from the provided expected value.
		const filePath = path.join(tmpDir, "expected-stub.json");
		const data = { alpha: "a", beta: 1, gamma: true };
		const divergedExpected = { alpha: "stale", beta: 0, gamma: false };

		// Write initial data
		writeEntity(filePath, data, testSchema);

		// Re-write with a stale _expected — should succeed today (check not implemented)
		expect(() => writeEntity(filePath, data, testSchema, divergedExpected)).not.toThrow();
	});

	it("produces byte-identical output on round-trip", () => {
		const filePath = path.join(tmpDir, "roundtrip.json");
		const data = { alpha: "hello", beta: 42, gamma: false };

		writeEntity(filePath, data, testSchema);
		const firstWrite = fs.readFileSync(filePath, "utf-8");

		const readBack = readEntity(filePath, testSchema);
		writeEntity(filePath, readBack, testSchema);
		const secondWrite = fs.readFileSync(filePath, "utf-8");

		expect(firstWrite).toBe(secondWrite);
	});
});
