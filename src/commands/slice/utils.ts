/**
 * Shared helpers for slice commands.
 *
 * Inventory decisions (Phase 1):
 * - requireActiveEpic: KEEP in slice/utils.ts — still used by quest commands
 *   and any command that defaults to the active epic. v2 commands prefer
 *   explicit --epic flags, so usage is declining. Will be removable when
 *   all commands require explicit --epic.
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
 * Used by quest commands and any command that defaults to the active epic.
 * NOT used by v2 slice commands (which require explicit --epic flag).
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
