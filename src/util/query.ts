import compile from "@michaelhomer/jqjs";
import { GoodplanError } from "./errors.js";

/**
 * Apply a jq expression to data and return the results.
 * Throws VALIDATION_INVALID_QUERY for invalid expressions.
 *
 * Result semantics:
 * - 0 results → null
 * - 1 result → the value
 * - multiple results → array
 */
export function applyQuery(data: unknown, expr: string): unknown {
	let filter: (input: unknown) => Generator<unknown>;
	try {
		filter = compile(expr);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		throw new GoodplanError("VALIDATION_INVALID_QUERY", `Invalid jq expression: ${message}`, {
			expression: expr,
		});
	}

	const results: unknown[] = [];
	try {
		for (const value of filter(data)) {
			results.push(value);
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		throw new GoodplanError("VALIDATION_INVALID_QUERY", `jq query execution failed: ${message}`, {
			expression: expr,
		});
	}

	if (results.length === 0) {
		return null;
	}
	if (results.length === 1) {
		return results[0];
	}
	return results;
}
