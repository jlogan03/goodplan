/**
 * Shared utilities for fitness function tests.
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Recursively collect all .ts files under a directory.
 */
export function collectTsFiles(dir: string): string[] {
	const results: string[] = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectTsFiles(full));
		} else if (entry.isFile() && entry.name.endsWith(".ts")) {
			results.push(full);
		}
	}
	return results;
}
