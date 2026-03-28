/**
 * Filesystem helpers for the Data Layer.
 * Keeps raw filesystem I/O in the Data Layer — command handlers call these
 * instead of readdir directly.
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Count files matching a glob-style extension in a subdirectory of the project dir.
 * Non-recursive — counts only direct children.
 * Returns 0 if the directory does not exist.
 *
 * @param projectDir - Absolute path to .project/
 * @param subpath - Relative path within .project/ (e.g., "epics/my-epic/architecture")
 * @param ext - File extension to match, including dot (e.g., ".md")
 */
export function countFiles(projectDir: string, subpath: string, ext: string): number {
	const dir = path.join(projectDir, subpath);
	if (!fs.existsSync(dir)) {
		return 0;
	}

	const stat = fs.statSync(dir);
	if (!stat.isDirectory()) {
		return 0;
	}

	const entries = fs.readdirSync(dir);
	let count = 0;
	for (const entry of entries) {
		if (entry.endsWith(ext)) {
			count++;
		}
	}
	return count;
}
