/**
 * commitState — writes state tree changes back to the filesystem.
 * Performs a recursive tree diff between oldState and newState.
 * JSON files first, JSONL second, state cache last (crash-safe ordering).
 * Markdown entries are read-only and never written.
 * Includes concurrent modification detection for JSON files.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { GoodplanError } from "../../util/errors.js";
import { debug } from "../../util/debug.js";
import { deterministicStringify, deterministicStringifyCompact } from "../../util/json.js";
import { CACHE_FILENAME, collectDirMtimes } from "./load.js";
import type { StateCache } from "./load.js";
import { findSchema } from "./schema-registry.js";
import type {
	DirectoryEntry,
	ProjectState,
	StateEntry,
} from "./tree.js";

export interface CommitOptions {
	force?: boolean;
}

interface PendingWrite {
	absPath: string;
	content: string;
	relativePath: string;
	append?: boolean;
}

export function commitState(
	projectDir: string,
	oldState: ProjectState,
	newState: ProjectState,
	options?: CommitOptions,
): void {
	const jsonWrites: PendingWrite[] = [];
	const jsonlWrites: PendingWrite[] = [];
	const force = options?.force === true;

	diffTree(projectDir, "", oldState, newState, jsonWrites, jsonlWrites, force);

	// Write ordering: JSON first, JSONL second
	for (const write of jsonWrites) {
		atomicWrite(write.absPath, write.content, write.relativePath);
	}
	for (const write of jsonlWrites) {
		if (write.append === true) {
			atomicAppend(write.absPath, write.content, write.relativePath);
		} else {
			atomicWrite(write.absPath, write.content, write.relativePath);
		}
	}

	// Write state cache as the last step (crash-safe: stale cache triggers full assembleState)
	writeStateCache(projectDir, newState);

	debug(`commitState complete: ${jsonWrites.length} json, ${jsonlWrites.length} jsonl writes`);
}

function diffTree(
	projectDir: string,
	relativePath: string,
	oldDir: DirectoryEntry,
	newDir: DirectoryEntry,
	jsonWrites: PendingWrite[],
	jsonlWrites: PendingWrite[],
	force: boolean,
): void {
	for (const [name, newEntry] of Object.entries(newDir.contents)) {
		const childRelative = relativePath ? `${relativePath}/${name}` : name;
		const childAbs = path.join(projectDir, childRelative);
		const oldEntry: StateEntry | undefined = oldDir.contents[name];

		if (newEntry.type === "directory") {
			// Ensure directory exists
			if (oldEntry === undefined || oldEntry.type !== "directory") {
				debug(`mkdir: ${childRelative}/`);
				fs.mkdirSync(childAbs, { recursive: true });
			}

			const oldChild: DirectoryEntry =
				oldEntry !== undefined && oldEntry.type === "directory"
					? oldEntry
					: { type: "directory", contents: {} };

			diffTree(projectDir, childRelative, oldChild, newEntry, jsonWrites, jsonlWrites, force);
		} else if (newEntry.type === "json") {
			processJsonEntry(childRelative, childAbs, oldEntry, newEntry.content, jsonWrites, force);
		} else if (newEntry.type === "jsonl") {
			processJsonlEntry(
				childRelative,
				childAbs,
				oldEntry,
				newEntry.content,
				jsonlWrites,
			);
		} else if (newEntry.type === "markdown") {
			// Markdown is read-only — skip
			debug(`skip markdown (read-only): ${childRelative}`);
		}
	}
}

function processJsonEntry(
	relativePath: string,
	absPath: string,
	oldEntry: StateEntry | undefined,
	newContent: unknown,
	jsonWrites: PendingWrite[],
	force: boolean,
): void {
	// Validate against schema before writing.
	// Use result.data (Zod-parsed output) to ensure on-disk matches what Zod produced
	// (strips unknown keys, applies coercions). This prevents in-memory/on-disk divergence
	// after a subsequent assembleState() re-parses.
	let contentToWrite: unknown = newContent;
	const schema = findSchema(relativePath);
	if (schema !== undefined) {
		const result = schema.safeParse(newContent);
		if (!result.success) {
			throw new GoodplanError(
				"DATA_VALIDATION_ERROR",
				`Validation failed before writing ${relativePath}: ${result.error.message}`,
				{ file: relativePath },
			);
		}
		contentToWrite = result.data;
	}

	// Check if content actually changed
	if (oldEntry !== undefined && oldEntry.type === "json") {
		const oldJson = deterministicStringify(oldEntry.content);
		const newJson = deterministicStringify(contentToWrite);
		if (oldJson === newJson) {
			debug(`unchanged json: ${relativePath}`);
			return;
		}

		// Concurrent modification detection: verify on-disk matches oldState
		checkConcurrentModification(absPath, relativePath, oldEntry.content, force);
	}

	debug(`write json: ${relativePath}`);
	const content = `${deterministicStringify(contentToWrite)}\n`;
	jsonWrites.push({ absPath, content, relativePath });
}

function processJsonlEntry(
	relativePath: string,
	absPath: string,
	oldEntry: StateEntry | undefined,
	newContent: unknown[],
	jsonlWrites: PendingWrite[],
): void {
	const schema = findSchema(relativePath);
	const oldLength =
		oldEntry !== undefined && oldEntry.type === "jsonl"
			? oldEntry.content.length
			: 0;

	// Only validate NEW entries — existing ones were validated during assembleState
	// and are trusted unchanged per INV-003 (reducer purity).
	// Use result.data (Zod-parsed output) to ensure on-disk matches what Zod produced.
	const validatedContent = [...newContent];
	if (schema !== undefined) {
		for (let i = oldLength; i < newContent.length; i++) {
			const item = newContent[i];
			const result = schema.safeParse(item);
			if (!result.success) {
				throw new GoodplanError(
					"DATA_VALIDATION_ERROR",
					`Validation failed before writing ${relativePath} line ${i + 1}: ${result.error.message}`,
					{ file: relativePath, line: i + 1 },
				);
			}
			validatedContent[i] = result.data;
		}
	}

	if (oldEntry !== undefined && oldEntry.type === "jsonl") {
		if (validatedContent.length <= oldLength) {
			debug(`unchanged jsonl: ${relativePath}`);
			return;
		}

		// Append only new lines — deferred to flush phase
		const newLines = validatedContent
			.slice(oldLength)
			.map((item) => deterministicStringifyCompact(item));
		const appendContent = newLines.map((line) => `${line}\n`).join("");

		debug(`append jsonl: ${relativePath} (${newLines.length} new entries)`);
		jsonlWrites.push({ absPath, content: appendContent, relativePath, append: true });
		return;
	}

	// New JSONL file — write in full
	debug(`write jsonl: ${relativePath} (${validatedContent.length} entries)`);
	const content = validatedContent
		.map((item) => `${deterministicStringifyCompact(item)}\n`)
		.join("");
	jsonlWrites.push({ absPath, content, relativePath });
}

function atomicWrite(absPath: string, content: string, relativePath: string): void {
	const tmpPath = `${absPath}.tmp.${process.pid}`;

	// Ensure parent directory exists
	const dir = path.dirname(absPath);
	fs.mkdirSync(dir, { recursive: true });

	try {
		fs.writeFileSync(tmpPath, content, "utf-8");
		fs.renameSync(tmpPath, absPath);
	} catch (err) {
		try {
			fs.unlinkSync(tmpPath);
		} catch (cleanupErr) {
			debug(`cleanup failed for ${tmpPath}: ${String(cleanupErr)}`);
		}
		throw new GoodplanError(
			"DATA_WRITE_ERROR",
			`Failed to write ${relativePath}`,
			{ file: relativePath },
			err,
		);
	}
}

/**
 * Concurrent modification detection for JSON files.
 * Reads current on-disk content and compares against oldState entry.
 * If they differ, another process or user modified the file.
 */
function checkConcurrentModification(
	absPath: string,
	relativePath: string,
	oldContent: unknown,
	force: boolean,
): void {
	if (!fs.existsSync(absPath)) {
		// File doesn't exist on disk but was in oldState — skip check
		// (could have been deleted externally)
		return;
	}

	const diskRaw = fs.readFileSync(absPath, "utf-8");

	// Compare on-disk bytes against a single serialization of oldContent.
	// This avoids parsing diskRaw then re-serializing both sides.
	const expectedRaw = `${deterministicStringify(oldContent)}\n`;

	if (diskRaw !== expectedRaw) {
		const globalForce = (globalThis as Record<string, unknown>).__goodplan_force === true;
		if (force || globalForce) {
			process.stderr.write(
				`[gp] --force: overwriting externally modified file ${relativePath}\n`,
			);
			return;
		}
		throw new GoodplanError(
			"DATA_CONCURRENT_MODIFICATION",
			`File ${relativePath} was externally modified since last read`,
			{ file: relativePath },
		);
	}
}

/**
 * Write state cache as the final step of commitState.
 */
function writeStateCache(projectDir: string, newState: ProjectState): void {
	const cachePath = path.join(projectDir, CACHE_FILENAME);
	const dirMtimes = collectDirMtimes(projectDir);

	const cache: StateCache = {
		version: 1,
		writtenAt: new Date().toISOString(),
		dirMtimes,
		state: newState,
	};

	const content = JSON.stringify(cache);
	const tmpPath = `${cachePath}.tmp.${process.pid}`;

	try {
		fs.writeFileSync(tmpPath, content, "utf-8");
		fs.renameSync(tmpPath, cachePath);
		debug("state cache written");
	} catch (err) {
		// Cache write failure is non-fatal — next loadState will fall back to assembleState
		debug(`state cache write failed: ${String(err)}`);
		try {
			fs.unlinkSync(tmpPath);
		} catch {
			// Ignore cleanup failure
		}
	}
}

/**
 * Atomic append: reads existing content, appends new content, writes atomically.
 * Ensures a crash mid-write cannot produce a partial line.
 */
function atomicAppend(absPath: string, appendContent: string, relativePath: string): void {
	const tmpPath = `${absPath}.tmp.${process.pid}`;

	try {
		const existing = fs.readFileSync(absPath, "utf-8");
		fs.writeFileSync(tmpPath, existing + appendContent, "utf-8");
		fs.renameSync(tmpPath, absPath);
	} catch (err) {
		try {
			fs.unlinkSync(tmpPath);
		} catch (cleanupErr) {
			debug(`cleanup failed for ${tmpPath}: ${String(cleanupErr)}`);
		}
		throw new GoodplanError(
			"DATA_WRITE_ERROR",
			`Failed to append to ${relativePath}`,
			{ file: relativePath },
			err,
		);
	}
}
