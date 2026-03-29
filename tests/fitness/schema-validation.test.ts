/**
 * Fitness function: INV-005 — Schema validation on every read.
 * Feeds malformed JSON to assembleState() and verifies Zod validation
 * errors are produced with field paths.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assembleState } from "../../src/core/data/assemble.js";
import { GoodplanError } from "../../src/util/errors.js";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../fixtures/fresh-init");

describe("INV-005: Schema validation — malformed JSON rejected on read", () => {
	let tmpDir: string;
	let projectDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-schema-val-"));
		fs.cpSync(FIXTURE_DIR, tmpDir, { recursive: true });
		projectDir = path.join(tmpDir, ".goodplan");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("rejects project.json with missing required fields", () => {
		// Write invalid project.json (missing 'name')
		fs.writeFileSync(
			path.join(projectDir, "project.json"),
			JSON.stringify({ version: 1 }),
		);

		expect(() => assembleState(projectDir)).toThrow(GoodplanError);

		try {
			assembleState(projectDir);
		} catch (err) {
			expect(err).toBeInstanceOf(GoodplanError);
			const ge = err as GoodplanError;
			expect(ge.code).toBe("DATA_VALIDATION_ERROR");
			expect(ge.message).toContain("project.json");
		}
	});

	it("rejects project.json with wrong field types", () => {
		// Write project.json with wrong type for 'name'
		fs.writeFileSync(
			path.join(projectDir, "project.json"),
			JSON.stringify({ version: 1, name: 123, initialized: "2026-01-01T00:00:00.000Z" }),
		);

		expect(() => assembleState(projectDir)).toThrow(GoodplanError);
	});

	it("rejects activity-log.jsonl with invalid entries", () => {
		// Write invalid JSONL
		fs.writeFileSync(
			path.join(projectDir, "activity-log.jsonl"),
			'{"not": "valid activity"}\n',
		);

		expect(() => assembleState(projectDir)).toThrow(GoodplanError);

		try {
			assembleState(projectDir);
		} catch (err) {
			const ge = err as GoodplanError;
			expect(ge.code).toBe("DATA_VALIDATION_ERROR");
			expect(ge.message).toContain("activity-log.jsonl");
		}
	});

	it("rejects unparseable JSON", () => {
		fs.writeFileSync(
			path.join(projectDir, "project.json"),
			"{ this is not json",
		);

		expect(() => assembleState(projectDir)).toThrow(GoodplanError);
	});

	it("error detail includes file paths", () => {
		fs.writeFileSync(
			path.join(projectDir, "project.json"),
			JSON.stringify({ invalid: true }),
		);

		try {
			assembleState(projectDir);
			expect.fail("Should have thrown");
		} catch (err) {
			const ge = err as GoodplanError;
			expect(ge.code).toBe("DATA_VALIDATION_ERROR");
			expect(ge.detail).toBeDefined();
			const detail = ge.detail as Record<string, unknown>;
			expect(detail["errors"]).toBeDefined();
			const errors = detail["errors"] as Array<{ file: string; message: string }>;
			expect(errors.length).toBeGreaterThan(0);
			const fileNames = errors.map((e) => e.file);
			expect(fileNames.some((f) => f.includes("project.json"))).toBe(true);
		}
	});
});
