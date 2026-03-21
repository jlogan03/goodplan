import { describe, expect, it, vi } from "vitest";
import { GoodplanError } from "../../../src/util/errors.js";
import {
	exitCodeForError,
	output,
	outputError,
	outputUnexpectedError,
} from "../../../src/util/output.js";

describe("output", () => {
	it("writes deterministic JSON to stdout in json mode", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		output({ b: 2, a: 1 }, { json: true });

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(written).toContain('"a": 1');
		// "a" should come before "b" in deterministic output
		const aIndex = written.indexOf('"a"');
		const bIndex = written.indexOf('"b"');
		expect(aIndex).toBeLessThan(bIndex);

		writeSpy.mockRestore();
	});

	it("writes string data to stdout in human mode", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		output("Hello, world!", {});

		expect(writeSpy.mock.calls[0]?.[0]).toBe("Hello, world!\n");

		writeSpy.mockRestore();
	});

	it("suppresses output when quiet flag is set", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		output("Hello, world!", { quiet: true });

		expect(writeSpy).not.toHaveBeenCalled();

		writeSpy.mockRestore();
	});

	it("suppresses JSON output when quiet flag is set", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		output({ a: 1 }, { json: true, quiet: true });

		expect(writeSpy).not.toHaveBeenCalled();

		writeSpy.mockRestore();
	});
});

describe("outputError", () => {
	it("writes JSON error to stdout in json mode", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		const error = new GoodplanError("VALIDATION_UNKNOWN_COMMAND", "Unknown command: foo");
		outputError(error, { json: true });

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(written).toContain("VALIDATION_UNKNOWN_COMMAND");
		expect(written).toContain("Unknown command: foo");

		writeSpy.mockRestore();
	});

	it("writes colored error to stderr in human mode", () => {
		const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

		const error = new GoodplanError("VALIDATION_UNKNOWN_COMMAND", "Unknown command: foo");
		outputError(error, {});

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(written).toContain("Unknown command: foo");

		writeSpy.mockRestore();
	});

	it("includes Record detail in JSON output", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		const error = new GoodplanError("VALIDATION_INVALID_INPUT", "Bad input", {
			field: "name",
			issue: "required",
		});
		outputError(error, { json: true });

		const written = writeSpy.mock.calls[0]?.[0] as string;
		const parsed = JSON.parse(written);
		expect(parsed.error.detail).toEqual({ field: "name", issue: "required" });

		writeSpy.mockRestore();
	});
});

describe("outputUnexpectedError", () => {
	it("writes JSON error to stdout in json mode", () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		outputUnexpectedError(new Error("boom"), { json: true });

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(written).toContain("INTERNAL_ERROR");
		expect(written).toContain("boom");

		writeSpy.mockRestore();
	});

	it("writes colored error to stderr in human mode", () => {
		const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

		outputUnexpectedError(new Error("unexpected failure"), {});

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(written).toContain("unexpected failure");

		writeSpy.mockRestore();
	});

	it("handles non-Error values in human mode", () => {
		const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

		outputUnexpectedError("string error", {});

		const written = writeSpy.mock.calls[0]?.[0] as string;
		expect(written).toContain("string error");

		writeSpy.mockRestore();
	});
});

describe("exitCodeForError", () => {
	it("returns 2 for VALIDATION_* errors", () => {
		const error = new GoodplanError("VALIDATION_INVALID_INPUT", "bad input");
		expect(exitCodeForError(error)).toBe(2);
	});

	it("returns 3 for STATE_* errors", () => {
		const error = new GoodplanError("STATE_INVALID_TRANSITION", "bad transition");
		expect(exitCodeForError(error)).toBe(3);
	});

	it("returns 1 for DATA_* errors", () => {
		const error = new GoodplanError("DATA_FILE_NOT_FOUND", "not found");
		expect(exitCodeForError(error)).toBe(1);
	});

	it("returns 1 for non-GoodplanError", () => {
		expect(exitCodeForError(new Error("random"))).toBe(1);
	});
});
