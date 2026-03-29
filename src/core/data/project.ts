import * as fs from "node:fs";
import * as path from "node:path";
import { GoodplanError } from "../../util/errors.js";

export const PROJECT_DIR_NAME = ".goodplan";

/** Legacy directory name for pre-rename projects (used by migrate command). */
export const LEGACY_DIR_NAME = ".project";

/**
 * Resolve the `.goodplan/` metadata directory.
 *
 * Returns the path to the `.goodplan/` directory (not the project root).
 *
 * 1. If GOODPLAN_DIR env var is set, use it (must point to the `.goodplan/` directory).
 *    Validates that the path exists and is a directory.
 * 2. Otherwise, walk up from cwd looking for a `.goodplan/` directory.
 * 3. Throws DATA_NO_PROJECT if no project directory is found.
 */
export function resolveProjectDir(cwd?: string): string {
	const envDir = process.env.GOODPLAN_DIR;
	if (envDir) {
		if (!fs.existsSync(envDir) || !fs.statSync(envDir).isDirectory()) {
			throw new GoodplanError(
				"DATA_NO_PROJECT",
				`GOODPLAN_DIR points to a path that does not exist or is not a directory: ${envDir}`,
			);
		}
		return envDir;
	}

	let current = cwd ?? process.cwd();

	while (true) {
		const candidate = path.join(current, PROJECT_DIR_NAME);
		if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
			return candidate;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			// Reached filesystem root without finding .goodplan/
			throw new GoodplanError(
				"DATA_NO_PROJECT",
				"No .goodplan/ directory found. Run `gp init` to create one.",
			);
		}
		current = parent;
	}
}
