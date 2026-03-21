import * as fs from "node:fs";
import * as path from "node:path";
import type { Project } from "../../schemas/entities/project.js";
import { projectSchema } from "../../schemas/entities/project.js";
import { GoodplanError } from "../../util/errors.js";
import { readEntity, writeEntity } from "./json.js";

const PROJECT_DIR_NAME = ".project";
const PROJECT_FILE_NAME = "project.json";

/**
 * Resolve the `.project/` metadata directory.
 *
 * Returns the path to the `.project/` directory (not the project root).
 *
 * 1. If GOODPLAN_DIR env var is set, use it (must point to the `.project/` directory).
 *    Validates that the path exists and is a directory.
 * 2. Otherwise, walk up from cwd looking for a `.project/` directory.
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
			// Reached filesystem root without finding .project/
			throw new GoodplanError(
				"DATA_NO_PROJECT",
				"No .project/ directory found. Run `goodplan init` to create one.",
			);
		}
		current = parent;
	}
}

/**
 * Read project.json from the resolved project directory.
 */
export function readProject(projectDir?: string): Project {
	const dir = projectDir ?? resolveProjectDir();
	const filePath = path.join(dir, PROJECT_FILE_NAME);
	return readEntity(filePath, projectSchema);
}

/**
 * Write project.json to the resolved project directory.
 */
export function writeProject(data: Project, projectDir?: string): void {
	const dir = projectDir ?? resolveProjectDir();
	const filePath = path.join(dir, PROJECT_FILE_NAME);
	writeEntity(filePath, data, projectSchema);
}
