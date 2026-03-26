import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Validates that a sourcePath (relative to the old .project/ directory) exists on disk.
 * Returns the resolved absolute path if valid, or null if the path does not exist.
 */
export function validateSourcePath(sourcePath: string, baseDir: string): string | null {
	const resolved = resolve(baseDir, sourcePath);
	return existsSync(resolved) ? resolved : null;
}
