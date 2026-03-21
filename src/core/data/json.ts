import * as fs from "node:fs";
import type { z } from "zod";
import { GoodplanError } from "../../util/errors.js";
import { deterministicStringify } from "../../util/json.js";

/**
 * Read a JSON file, parse, and validate against a Zod schema.
 * Throws GoodplanError on file-not-found or validation failure.
 */
export function readEntity<T>(path: string, schema: z.ZodType<T>): T {
	let raw: string;
	try {
		raw = fs.readFileSync(path, "utf-8");
	} catch (err) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code === "ENOENT") {
			throw new GoodplanError("DATA_FILE_NOT_FOUND", `File not found: ${path}`, path);
		}
		throw new GoodplanError("DATA_READ_ERROR", `Failed to read file: ${path}`, String(err), err);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new GoodplanError("DATA_INVALID_JSON", `Invalid JSON in file: ${path}`, path);
	}

	const result = schema.safeParse(parsed);
	if (!result.success) {
		throw new GoodplanError(
			"DATA_VALIDATION_ERROR",
			`Validation failed for ${path}: ${result.error.message}`,
			path,
		);
	}
	return result.data;
}

/**
 * Validate data against a Zod schema and write as deterministic JSON.
 * Validates before writing — invalid data never reaches the filesystem.
 * Uses write-to-temp + rename for atomicity.
 *
 * Note: writes Zod-normalized output (result.data from safeParse). Schemas used
 * with writeEntity should avoid .default() and .transform() unless normalization
 * is intentional.
 *
 * @param expected - Reserved for concurrent modification detection (not yet implemented).
 *   When implemented, will read current on-disk content and verify it matches `expected`
 *   before writing, throwing DATA_CONCURRENT_MODIFICATION if not.
 *
 * TODO: `_expected` is currently a stub — it is accepted but NOT checked. Callers that
 *   pass this argument will NOT receive concurrent modification protection until the check
 *   is implemented. Do not rely on it for safety.
 */
export function writeEntity<T>(path: string, data: T, schema: z.ZodType<T>, _expected?: T): void {
	const result = schema.safeParse(data);
	if (!result.success) {
		throw new GoodplanError(
			"DATA_VALIDATION_ERROR",
			`Validation failed before writing ${path}: ${result.error.message}`,
			path,
		);
	}

	const json = `${deterministicStringify(result.data)}\n`;
	const tmpPath = `${path}.tmp.${process.pid}`;

	try {
		fs.writeFileSync(tmpPath, json, "utf-8");
		fs.renameSync(tmpPath, path);
	} catch (err) {
		// Clean up temp file on failure
		try {
			fs.unlinkSync(tmpPath);
		} catch {
			// Ignore cleanup errors
		}
		throw new GoodplanError("DATA_WRITE_ERROR", `Failed to write file: ${path}`, String(err), err);
	}
}
