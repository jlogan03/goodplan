// TODO: concurrent modification detection deferred to slice 03

/**
 * commitState — writes state tree changes back to the filesystem.
 * Performs a recursive tree diff between oldState and newState.
 * JSON files first, JSONL second (crash-safe ordering).
 * Markdown entries are read-only and never written.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { GoodplanError } from "../../util/errors.js";
import { debug } from "../../util/debug.js";
import { deterministicStringify, deterministicStringifyCompact } from "../../util/json.js";
import { findSchema } from "./schema-registry.js";
import type {
	DirectoryEntry,
	ProjectState,
	StateEntry,
} from "./tree.js";

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
): void {
	const jsonWrites: PendingWrite[] = [];
	const jsonlWrites: PendingWrite[] = [];

	diffTree(projectDir, "", oldState, newState, jsonWrites, jsonlWrites);

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

	debug(`commitState complete: ${jsonWrites.length} json, ${jsonlWrites.length} jsonl writes`);
}

function diffTree(
	projectDir: string,
	relativePath: string,
	oldDir: DirectoryEntry,
	newDir: DirectoryEntry,
	jsonWrites: PendingWrite[],
	jsonlWrites: PendingWrite[],
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

			diffTree(projectDir, childRelative, oldChild, newEntry, jsonWrites, jsonlWrites);
		} else if (newEntry.type === "json") {
			processJsonEntry(childRelative, childAbs, oldEntry, newEntry.content, jsonWrites);
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
): void {
	// Validate against schema before writing
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
	}

	// Check if content actually changed
	if (oldEntry !== undefined && oldEntry.type === "json") {
		const oldJson = deterministicStringify(oldEntry.content);
		const newJson = deterministicStringify(newContent);
		if (oldJson === newJson) {
			debug(`unchanged json: ${relativePath}`);
			return;
		}
	}

	debug(`write json: ${relativePath}`);
	const content = `${deterministicStringify(newContent)}\n`;
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
	// and are trusted unchanged per INV-003 (reducer purity)
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
		}
	}

	if (oldEntry !== undefined && oldEntry.type === "jsonl") {
		if (newContent.length <= oldLength) {
			debug(`unchanged jsonl: ${relativePath}`);
			return;
		}

		// Append only new lines — deferred to flush phase
		const newLines = newContent
			.slice(oldLength)
			.map((item) => deterministicStringifyCompact(item));
		const appendContent = newLines.map((line) => `${line}\n`).join("");

		debug(`append jsonl: ${relativePath} (${newLines.length} new entries)`);
		jsonlWrites.push({ absPath, content: appendContent, relativePath, append: true });
		return;
	}

	// New JSONL file — write in full
	debug(`write jsonl: ${relativePath} (${newContent.length} entries)`);
	const content = newContent
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
