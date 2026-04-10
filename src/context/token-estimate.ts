/**
 * Estimate token count for a string using a simple char/4 heuristic.
 *
 * Uses `string.length` (UTF-16 code units) / 4.
 * Overestimates for ASCII, underestimates for CJK/emoji.
 * Acceptable for budget allocation purposes.
 */
export function estimateTokens(content: string): number {
	return Math.ceil(content.length / 4);
}
