/**
 * Global flags shared across all commands.
 * Spread into each command's args definition.
 *
 * Extracted to its own module to avoid circular imports
 * between main.ts and individual command files.
 */
export const globalArgs = {
	json: {
		type: "boolean" as const,
		description: "Output as structured JSON",
		default: false,
	},
	quiet: {
		type: "boolean" as const,
		description: "Minimal output",
		default: false,
	},
	query: {
		type: "string" as const,
		description: "jq expression to filter JSON output (implies --json)",
		required: false,
	},
	/** Reserved for future use. Not yet wired to any command or utility layer. */
	verbose: {
		type: "boolean" as const,
		description: "Enable diagnostic output on stderr",
		default: false,
	},
} as const;

/**
 * Parse the --inline flag value for start-* commands.
 *
 * citty delivers:
 * - `undefined` when the flag is absent
 * - `"true"` (string) for bare `--inline`
 * - a numeric string (e.g., `"500"`) for `--inline=500`
 *
 * Returns:
 * - `undefined` — flag absent
 * - `true` — bare --inline (context module resolves to DEFAULT_INLINE_BUDGET)
 * - `number` — explicit budget in bytes
 */
export function parseInlineBudget(value: string | undefined): boolean | number | undefined {
	if (value === undefined) return undefined;
	if (value === "true" || value === "") return true;
	const parsed = Number(value);
	if (Number.isFinite(parsed) && parsed > 0) return parsed;
	return true;
}
