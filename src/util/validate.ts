import type { z } from "zod";
import { GoodplanError } from "./errors.js";

/** Global flag keys that should be stripped before command-level schema validation. */
const GLOBAL_FLAG_KEYS = new Set(["json", "quiet", "query", "verbose", "help", "version"]);

/**
 * Merge stdin base object with CLI flag overrides, then validate against a Zod schema.
 * Merge semantics: stdin values are the base, CLI flags override stdin values.
 * Undefined flag values are omitted (they don't override stdin).
 * Global flags (json, quiet, verbose, help, version) are stripped before validation.
 */
export function validateInput<T>(
	schema: z.ZodType<T>,
	args: Record<string, unknown>,
	stdin: Record<string, unknown>,
): T {
	// Filter out undefined values and global flags from args
	const definedArgs: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(args)) {
		if (value !== undefined && !GLOBAL_FLAG_KEYS.has(key)) {
			definedArgs[key] = value;
		}
	}

	// Merge: stdin base, flags override
	const merged = { ...stdin, ...definedArgs };

	const result = schema.safeParse(merged);
	if (!result.success) {
		throw new GoodplanError(
			"VALIDATION_INVALID_INPUT",
			`Input validation failed: ${result.error.message}`,
			result.error.message,
		);
	}
	return result.data;
}
