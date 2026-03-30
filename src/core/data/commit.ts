/**
 * commitState — writes state tree changes back to the filesystem.
 * Performs a recursive tree diff between oldState and newState.
 * JSON files first, JSONL second, state cache last (crash-safe ordering).
 * Markdown entries are read-only and never written.
 * Includes concurrent modification detection for JSON files.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { projectSchema } from "../../schemas/entities/project.js";
import { debug } from "../../util/debug.js";
import { GoodplanError } from "../../util/errors.js";
import { deterministicStringify, deterministicStringifyCompact } from "../../util/json.js";
import { signStateTree } from "./hmac.js";
import { CACHE_FILENAME, collectDirMtimes } from "./load.js";
import type { StateCache } from "./load.js";
import { findSchema } from "./schema-registry.js";
import type { DirectoryEntry, ProjectState, StateEntry } from "./tree.js";

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

	// Compute HMAC signature over the full state tree and embed in project.json.
	// Done after diffTree (so jsonWrites is populated) but before flushing writes
	// (so the signature is written atomically with all other changes).
	const signedProjectContent = embedStateSignature(newState, jsonWrites, projectDir);

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

	// Build the state to cache, injecting the signed project.json content so the
	// cache includes stateSignature (matching what's on disk). Without this, the
	// cache would store the caller's newState which lacks the signature, causing
	// cache/disk divergence.
	const stateToCache =
		signedProjectContent !== undefined
			? {
					...newState,
					contents: {
						...newState.contents,
						"project.json": {
							type: "json" as const,
							content: signedProjectContent,
						},
					},
				}
			: newState;

	// Write state cache as the last step (crash-safe: stale cache triggers full assembleState)
	writeStateCache(projectDir, stateToCache);

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
			processJsonlEntry(childRelative, childAbs, oldEntry, newEntry.content, jsonlWrites);
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
		oldEntry !== undefined && oldEntry.type === "jsonl" ? oldEntry.content.length : 0;

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

/**
 * Embed the HMAC state signature into the project.json write entry.
 * Does NOT mutate newState — creates a shallow clone of the project node
 * with stateSignature injected, validates through projectSchema, and
 * updates or creates the jsonWrites entry for project.json.
 * Returns the validated project content with signature (for cache sync),
 * or undefined if no project.json exists in state.
 */
function embedStateSignature(
	newState: ProjectState,
	jsonWrites: PendingWrite[],
	projectDir: string,
): unknown | undefined {
	const signature = signStateTree(newState);

	// Extract the project node content from newState
	const projectEntry = newState.contents["project.json"];
	if (projectEntry === undefined || projectEntry.type !== "json") {
		// No project.json in state — nothing to sign (shouldn't happen in practice)
		return undefined;
	}

	// Type assertion is safe: projectSchema.parse() below validates the shape.
	const projectNode = projectEntry.content as Record<string, unknown>;
	const cloneWithSignature = {
		...projectNode,
		stateSignature: signature,
	};

	// Validate through projectSchema (preserves INV-005)
	const parsed = projectSchema.parse(cloneWithSignature);
	const content = `${deterministicStringify(parsed)}\n`;

	// Find existing jsonWrites entry for project.json, or create one
	const existingIdx = jsonWrites.findIndex((w) => w.relativePath === "project.json");
	if (existingIdx !== -1) {
		// Update the existing entry's content with signature-embedded version
		const existing = jsonWrites[existingIdx];
		if (existing === undefined) return parsed;
		jsonWrites[existingIdx] = { ...existing, content };
	} else {
		// diffTree skipped project.json (e.g., only child entities changed) —
		// create a new entry so the signature is always written.
		// But skip if on-disk content is already identical (avoids unnecessary writes
		// when signature hasn't changed).
		const absPath = path.join(projectDir, "project.json");
		try {
			const diskContent = fs.readFileSync(absPath, "utf-8");
			if (diskContent === content) {
				debug("skip project.json write: signature unchanged");
				return parsed;
			}
		} catch {
			// File doesn't exist yet — proceed with write
		}
		jsonWrites.push({ absPath, content, relativePath: "project.json" });
	}

	return parsed;
}

/**
 * atomicWrite — internal utility for crash-safe file writes.
 * Callers outside commit.ts should be limited to `verify --fix`;
 * general writes must go through commitState().
 */
export function atomicWrite(absPath: string, content: string, relativePath: string): void {
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
	// For project.json, strip stateSignature from both sides — it's injected by
	// embedStateSignature during writes and is not part of the logical state that
	// callers pass via oldState/newState.
	// NOTE: project.json uses parsed comparison (required for signature stripping)
	// while other JSON files use byte-level comparison. Safe because all writes use
	// deterministicStringify, but worth noting the asymmetry.
	let expectedRaw: string;
	let actualRaw: string;
	if (relativePath === "project.json") {
		const stripSig = (content: unknown): unknown => {
			if (content !== null && typeof content === "object" && !Array.isArray(content)) {
				const { stateSignature: _, ...rest } = content as Record<string, unknown>;
				return rest;
			}
			return content;
		};
		expectedRaw = `${deterministicStringify(stripSig(oldContent))}\n`;
		try {
			const diskParsed = JSON.parse(diskRaw);
			actualRaw = `${deterministicStringify(stripSig(diskParsed))}\n`;
		} catch {
			actualRaw = diskRaw;
		}
	} else {
		expectedRaw = `${deterministicStringify(oldContent)}\n`;
		actualRaw = diskRaw;
	}

	if (actualRaw !== expectedRaw) {
		const globalForce = (globalThis as Record<string, unknown>).__goodplan_force === true;
		if (force || globalForce) {
			process.stderr.write(`[gp] --force: overwriting externally modified file ${relativePath}\n`);
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
