/**
 * Shared helpers for slice commands.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { projectSchema } from "../../schemas/entities/project.js";
import { GoodplanError } from "../../util/errors.js";

/**
 * Read the active epic from project.json. Throws if not set.
 *
 * Reads only project.json (not the full state tree) to avoid redundant I/O
 * when callers subsequently pass projectDir to RPC functions that load state
 * internally.
 *
 * Used by slice commands that default to the active epic (plan, refine-plan,
 * implement, complete, abandon, show, and all subagent commands).
 * NOT used by create.ts (which has a required --epic flag).
 */
export function requireActiveEpic(projectDir: string): string {
	const filePath = path.join(projectDir, "project.json");
	let raw: unknown;
	try {
		raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
	} catch {
		throw new GoodplanError("DATA_FILE_NOT_FOUND", "Cannot read project.json");
	}
	const parsed = projectSchema.safeParse(raw);
	if (!parsed.success) {
		throw new GoodplanError("DATA_VALIDATION_ERROR", "Invalid project.json");
	}
	if (parsed.data.activeEpic === null) {
		throw new GoodplanError(
			"VALIDATION_INVALID_INPUT",
			"No active epic — use --epic or set an active epic via epic:activate",
		);
	}
	return parsed.data.activeEpic;
}
