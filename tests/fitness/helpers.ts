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

/**
 * Recursively collect all files under a directory, returning sorted relative paths.
 * The sort is load-bearing — callers depend on deterministic ordering.
 */
export function collectFiles(dir: string, base?: string): string[] {
	const root = base ?? dir;
	const results: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectFiles(full, root));
		} else if (entry.isFile()) {
			results.push(path.relative(root, full));
		}
	}
	return results.sort();
}
