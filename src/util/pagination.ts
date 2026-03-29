import pc from "picocolors";
import { GoodplanError } from "./errors.js";

/**
 * Parse a string flag value as a non-negative integer.
 * Uses parseInt (not Number()) because Number("") returns 0 instead of NaN.
 * Returns undefined if the value is undefined/empty.
 * Throws VALIDATION_INVALID_INPUT if the value is not a valid non-negative integer.
 */
export function parseNonNegativeInt(value: string | undefined, name: string): number | undefined {
	if (value === undefined || value === "") return undefined;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 0 || String(parsed) !== value) {
		throw new GoodplanError(
			"VALIDATION_INVALID_INPUT",
			`--${name} must be a non-negative integer, got: ${value}`,
		);
	}
	return parsed;
}

export interface PaginationArgs {
	limit?: string | undefined;
	offset?: string | undefined;
}

/**
 * Result of applying pagination to an items array.
 *
 * `offset` and `limit` are optional properties (not `T | undefined`) because
 * `exactOptionalPropertyTypes: true` is enabled. They must be omitted entirely
 * when not applicable — never set to `undefined`. Use conditional spread to
 * construct instances safely.
 */
export interface PaginatedResult<T> {
	items: T[];
	total: number;
	offset?: number;
	limit?: number;
}

/**
 * Apply pagination to an items array based on --limit and --offset flags.
 *
 * Always includes `total` (original array length before slicing).
 * `offset` and `limit` are a pair: both included when either flag is provided,
 * both omitted when neither flag is used. Uses conditional spread due to
 * `exactOptionalPropertyTypes: true`.
 *
 * Note: list commands paginate-then-query (pagination applied before --query
 * in the output() pipeline). This differs from the `state` command which
 * queries-then-paginates. Both semantics are correct for their context:
 * list commands paginate the known items array, while `state` paginates
 * arbitrary jq query results.
 */
export function applyPagination<T>(items: T[], args: PaginationArgs): PaginatedResult<T> {
	const parsedLimit = parseNonNegativeInt(args.limit, "limit");
	const parsedOffset = parseNonNegativeInt(args.offset, "offset");

	const total = items.length;

	// Neither flag provided — return all items with total only
	if (parsedLimit === undefined && parsedOffset === undefined) {
		return { items, total };
	}

	// At least one flag provided — both offset and limit appear in result
	const effectiveOffset = parsedOffset ?? 0;
	const effectiveLimit = parsedLimit ?? total;
	const sliced = items.slice(effectiveOffset, effectiveOffset + effectiveLimit);

	return {
		items: sliced,
		total,
		offset: effectiveOffset,
		limit: effectiveLimit,
	};
}

/**
 * Format a human-readable pagination footer.
 *
 * Returns undefined if not paginated (no limit/offset) or if all items are shown.
 * Returns a dim-styled "Showing X-Y of Z" string when results are truncated.
 * When total > 0 but paginated items are empty (offset beyond total),
 * still shows the footer — reserve "No items found" for total === 0 only.
 */
export function formatPaginationFooter(result: PaginatedResult<unknown>): string | undefined {
	// Not paginated — no footer needed
	if (result.offset === undefined || result.limit === undefined) {
		return undefined;
	}

	// All items shown — no footer needed
	if (result.offset === 0 && result.items.length === result.total) {
		return undefined;
	}

	const start = result.offset + 1;
	const end = result.offset + result.items.length;

	if (result.items.length === 0) {
		// Offset beyond total — show footer indicating no items in range
		return `\n${pc.dim(`Showing 0 of ${result.total}`)}`;
	}

	return `\n${pc.dim(`Showing ${start}-${end} of ${result.total}`)}`;
}
