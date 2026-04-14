/**
 * Helpers for architecture fidelity fitness tests.
 *
 * Extracts the ALWAYS_ON_REVIEWERS constant from src/trust/reviewers/routing.ts
 * by reading the source file, since the constant is not exported.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const ROUTING_PATH = path.join(ROOT, "src/trust/reviewers/routing.ts");

/**
 * Parse ALWAYS_ON_REVIEWERS from routing.ts source.
 * Falls back to empty array if the file or pattern isn't found.
 */
function parseAlwaysOnReviewers(): string[] {
	const content = fs.readFileSync(ROUTING_PATH, "utf-8");
	// Match the array literal: const ALWAYS_ON_REVIEWERS = [ "id1", "id2", ... ];
	const match = content.match(/ALWAYS_ON_REVIEWERS\s*=\s*\[([\s\S]*?)\]/);
	if (match?.[1] === undefined) return [];

	const ids: string[] = [];
	for (const m of match[1].matchAll(/"([^"]+)"/g)) {
		if (m[1] !== undefined) ids.push(m[1]);
	}
	return ids;
}

export const ALWAYS_ON_REVIEWERS = parseAlwaysOnReviewers();
