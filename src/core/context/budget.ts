/**
 * Budget management for context bundling.
 * Controls how much markdown content is inlined vs referenced by path.
 */

import type { CollectedEntry } from "./collect.js";

// ── Constants ───────────────────────────────────────────────

/** Default inline budget in bytes (20KB). Deliberate choice within the architecture's ~20-30KB range. */
export const DEFAULT_INLINE_BUDGET = 20480;

// ── Budget result ───────────────────────────────────────────

export interface BudgetResult {
	/** Key → markdown content for entries that fit within budget. */
	inline: Record<string, string>;
	/** State-tree-relative paths for entries that exceeded budget. */
	references: string[];
}

// ── Budget application ──────────────────────────────────────

/**
 * Apply a byte budget to ordered content entries.
 *
 * Iterates entries in priority order, adding each to `inline` until the total
 * byte size exceeds the budget. Remaining entries go to `references` as file paths.
 *
 * **Design contracts:**
 * - The first priority entry is always inlined regardless of budget size.
 *   This ensures the highest-priority content (e.g., entity goal) is always available.
 * - `applyBudget([], anyBudget)` returns `{ inline: {}, references: [] }`.
 * - Budget is measured in bytes via `Buffer.byteLength(content, 'utf8')`,
 *   not `string.length` (which returns UTF-16 code units and undercounts multi-byte chars).
 */
export function applyBudget(
	entries: CollectedEntry[],
	budget: number,
): BudgetResult {
	if (entries.length === 0) {
		return { inline: {}, references: [] };
	}

	const inline: Record<string, string> = {};
	const references: string[] = [];
	let usedBytes = 0;

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i]!;
		const entryBytes = Buffer.byteLength(entry.content, "utf8");

		// First entry is always inlined regardless of budget
		if (i === 0) {
			inline[entry.key] = entry.content;
			usedBytes += entryBytes;
			continue;
		}

		if (usedBytes + entryBytes <= budget) {
			inline[entry.key] = entry.content;
			usedBytes += entryBytes;
		} else {
			references.push(entry.key);
		}
	}

	return { inline, references };
}
