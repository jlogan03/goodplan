/**
 * Deterministic JSON.stringify with alphabetically sorted keys.
 * Uses a replacer that recursively sorts object keys via Object.entries().
 */
export function deterministicStringify(data: unknown): string {
	return JSON.stringify(sortKeys(data), null, "\t");
}

/**
 * Deterministic compact JSON.stringify with alphabetically sorted keys.
 * No indentation — suitable for JSONL (one object per line).
 */
export function deterministicStringifyCompact(data: unknown): string {
	return JSON.stringify(sortKeys(data));
}

function sortKeys(value: unknown): unknown {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(sortKeys);
	}
	const sorted: Record<string, unknown> = {};
	const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
		a < b ? -1 : a > b ? 1 : 0,
	);
	for (const [key, val] of entries) {
		sorted[key] = sortKeys(val);
	}
	return sorted;
}
