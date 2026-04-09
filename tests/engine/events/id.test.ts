import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateEventId, generateTimestamp } from "../../../src/engine/events/id.js";

describe("generateEventId", () => {
	it("returns a valid UUID v4 string", () => {
		const id = generateEventId();
		expect(() => z.string().uuid().parse(id)).not.toThrow();
	});

	it("produces unique values across 100 calls", () => {
		const ids = new Set<string>();
		for (let i = 0; i < 100; i++) {
			ids.add(generateEventId());
		}
		expect(ids.size).toBe(100);
	});
});

describe("generateTimestamp", () => {
	it("returns an ISO-8601 UTC string that passes datetime schema", () => {
		const ts = generateTimestamp();
		expect(() => z.string().datetime({ precision: 3 }).parse(ts)).not.toThrow();
	});

	it("ends with Z (UTC)", () => {
		const ts = generateTimestamp();
		expect(ts.endsWith("Z")).toBe(true);
	});
});
