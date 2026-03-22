/**
 * Debug logging utility for data layer operations.
 * Writes to stderr to avoid polluting stdout command output.
 *
 * Enabled by:
 * - `--verbose` CLI flag (sets globalThis.__goodplan_verbose)
 * - `GOODPLAN_DEBUG=1` environment variable (dev/test only)
 */

function isEnabled(): boolean {
	return (
		(globalThis as Record<string, unknown>).__goodplan_verbose === true ||
		process.env.GOODPLAN_DEBUG === "1"
	);
}

export function debug(message: string): void {
	if (isEnabled()) {
		process.stderr.write(`[goodplan] ${message}\n`);
	}
}
