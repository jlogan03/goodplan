/**
 * Fitness function: INV-007 — Structured error output.
 * Verifies every GoodplanError code maps to exit code 1, 2, or 3,
 * and that the binary produces structured JSON errors with the correct exit codes.
 */

import { describe, expect, it } from "vitest";
import {
	ALL_ERROR_CODES,
	EXPECTED_ERROR_CODE_COUNT,
	GoodplanError,
} from "../../src/util/errors.js";
import { exitCodeForError } from "../../src/util/output.js";
import { buildBinary, runCommand } from "../integration/helpers.js";

describe("INV-007: Structured error output", () => {
	describe("Static: every error code maps to exit code 1, 2, or 3", () => {
		it("ALL_ERROR_CODES covers every GoodplanErrorCode (count check)", () => {
			expect(ALL_ERROR_CODES.length).toBe(EXPECTED_ERROR_CODE_COUNT);
		});

		for (const code of ALL_ERROR_CODES) {
			it(`${code} has a valid exit code`, () => {
				const error = new GoodplanError(code, "test");
				const exitCode = exitCodeForError(error);
				expect([1, 2, 3]).toContain(exitCode);
				expect(exitCode).not.toBe(0);
			});
		}

		it("VALIDATION_* codes map to exit 2", () => {
			for (const code of ALL_ERROR_CODES.filter((c) => c.startsWith("VALIDATION_"))) {
				const error = new GoodplanError(code, "test");
				expect(exitCodeForError(error)).toBe(2);
			}
		});

		it("STATE_* codes map to exit 3", () => {
			for (const code of ALL_ERROR_CODES.filter((c) => c.startsWith("STATE_"))) {
				const error = new GoodplanError(code, "test");
				expect(exitCodeForError(error)).toBe(3);
			}
		});

		it("DATA_* codes map to exit 1", () => {
			for (const code of ALL_ERROR_CODES.filter((c) => c.startsWith("DATA_"))) {
				const error = new GoodplanError(code, "test");
				expect(exitCodeForError(error)).toBe(1);
			}
		});

		it("INTERNAL_* codes map to exit 1", () => {
			for (const code of ALL_ERROR_CODES.filter((c) => c.startsWith("INTERNAL_"))) {
				const error = new GoodplanError(code, "test");
				expect(exitCodeForError(error)).toBe(1);
			}
		});
	});

	describe("Dynamic: binary produces structured JSON errors with correct exit codes", () => {
		const bin = buildBinary();

		it("VALIDATION_UNKNOWN_COMMAND → exit 2 with structured error", () => {
			const result = runCommand(bin, ["nonexistent-command", "--json"]);
			expect(result.exitCode).toBe(2);

			const parsed = JSON.parse(result.stdout) as {
				error: { code: string; message: string };
			};
			expect(parsed.error).toBeDefined();
			expect(parsed.error.code).toBe("VALIDATION_UNKNOWN_COMMAND");
			expect(typeof parsed.error.message).toBe("string");
			expect(parsed.error.message.length).toBeGreaterThan(0);
		});

		it("STATE_* error → exit 3 with structured error (init on already-initialized project)", () => {
			// Use the repo's own .project/ — init should fail with STATE_ALREADY_INITIALIZED
			const result = runCommand(bin, ["init", "--json"]);
			expect(result.exitCode).toBe(3);

			const parsed = JSON.parse(result.stdout) as {
				error: { code: string; message: string };
			};
			expect(parsed.error).toBeDefined();
			expect(parsed.error.code).toBe("STATE_ALREADY_INITIALIZED");
			expect(typeof parsed.error.message).toBe("string");
		});

		it("DATA_NO_PROJECT → exit 1 with structured error (status in empty dir)", () => {
			const result = runCommand(bin, ["status", "--json"], {
				env: { GOODPLAN_DIR: "/tmp/goodplan-nonexistent-dir-fitness-test" },
			});
			expect(result.exitCode).toBe(1);

			const parsed = JSON.parse(result.stdout) as {
				error: { code: string; message: string };
			};
			expect(parsed.error).toBeDefined();
			expect(parsed.error.code).toBe("DATA_NO_PROJECT");
			expect(typeof parsed.error.message).toBe("string");
		});

		it("all error JSON responses match { error: { code, message } } shape", () => {
			const errorScenarios = [
				runCommand(bin, ["nonexistent-command", "--json"]),
				runCommand(bin, ["init", "--json"]),
				runCommand(bin, ["status", "--json"], {
					env: { GOODPLAN_DIR: "/tmp/goodplan-nonexistent-dir-fitness-test" },
				}),
			];

			for (const result of errorScenarios) {
				expect(result.exitCode).not.toBe(0);
				const parsed = JSON.parse(result.stdout) as {
					error?: { code?: unknown; message?: unknown };
				};
				expect(parsed.error).toBeDefined();
				expect(typeof parsed.error?.code).toBe("string");
				expect(typeof parsed.error?.message).toBe("string");
			}
		});
	});
});
