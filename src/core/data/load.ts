/**
 * loadState — reads ProjectState from cache when possible, falls back to assembleState.
 *
 * Cache format (.state-cache.json):
 *   { version: 1, writtenAt: string, dirMtimes: Record<string, number>, state: ProjectState }
 *
 * Cache validation: compares directory mtimes (cheap stat calls) against stored values.
 * If mtimes unchanged, returns cached state directly.
 * If mtimes changed: incremental walk of changed directories to detect new/removed files.
 * On cache miss, version mismatch, or parse error: falls back to assembleState().
 *
 * Known limitation: manually edited JSON files (content changes without file addition/removal)
 * are not detected by the cache. Staleness is bounded: commitState() always writes a fresh cache.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { debug } from "../../util/debug.js";
import { SKIP_NAMES, assembleState } from "./assemble.js";
import { verifyHmacOrThrow } from "./hmac.js";
import { findSchema } from "./schema-registry.js";
import { ZERO_STATE } from "./tree.js";
import type {
	DirectoryEntry,
	JsonEntry,
	JsonlEntry,
	MarkdownEntry,
	ProjectState,
	StateEntry,
} from "./tree.js";

// ── Cache format ──────────────────────────────────────────────

const CACHE_VERSION = 1;
export const CACHE_FILENAME = ".state-cache.json";

export interface StateCache {
	version: number;
	writtenAt: string;
	dirMtimes: Record<string, number>;
	state: ProjectState;
}

// ── Public API ────────────────────────────────────────────────

export function loadState(projectDir?: string): ProjectState {
	if (projectDir === undefined) {
		return ZERO_STATE;
	}

	if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
		debug(`loadState: projectDir does not exist: ${projectDir}`);
		return ZERO_STATE;
	}

	const cachePath = path.join(projectDir, CACHE_FILENAME);

	let cache: StateCache | undefined;
	try {
		cache = readCache(cachePath);
	} catch {
		debug("loadState: cache read/parse failed, falling back to assembleState");
		const state = assembleState(projectDir);
		verifyHmacOrThrow(state);
		return state;
	}

	if (cache === undefined) {
		debug("loadState: no cache found, falling back to assembleState");
		const state = assembleState(projectDir);
		verifyHmacOrThrow(state);
		return state;
	}

	if (cache.version !== CACHE_VERSION) {
		debug(
			`loadState: cache version mismatch (${cache.version} !== ${CACHE_VERSION}), falling back`,
		);
		const state = assembleState(projectDir);
		verifyHmacOrThrow(state);
		return state;
	}

	// Compare directory mtimes to detect filesystem changes
	const currentMtimes = collectDirMtimes(projectDir);
	const changedDirs = findChangedDirs(cache.dirMtimes, currentMtimes);

	if (changedDirs.length === 0) {
		// Security tradeoff: cache-hit returns state without HMAC reverification.
		// This is intentional — the cached state was verified on the prior non-cache-hit
		// load, and commitState (the only writer) embeds a fresh signature. Manual JSON
		// edits that don't change directory mtimes will bypass verification until cache
		// invalidation. `gp verify` (Phase 4) provides an explicit integrity check.
		debug("loadState: cache hit — all directory mtimes match");
		return cache.state;
	}

	debug(`loadState: ${changedDirs.length} directory(ies) changed, doing incremental update`);
	const state = incrementalUpdate(projectDir, cache.state, changedDirs);
	verifyHmacOrThrow(state);
	return state;
}

// ── Cache I/O ─────────────────────────────────────────────────

function readCache(cachePath: string): StateCache | undefined {
	if (!fs.existsSync(cachePath)) {
		return undefined;
	}

	const raw = fs.readFileSync(cachePath, "utf-8");
	const parsed: unknown = JSON.parse(raw);

	// Basic shape validation — not a full Zod schema (cache is internal, written only
	// by commitState, so a manual shape check is acceptable; a Zod schema would add
	// overhead for an internal-only format that never crosses trust boundaries)
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!("version" in parsed) ||
		!("writtenAt" in parsed) ||
		!("dirMtimes" in parsed) ||
		!("state" in parsed)
	) {
		throw new Error("Cache has invalid shape");
	}

	return parsed as StateCache;
}

// ── Directory mtime collection ────────────────────────────────

/**
 * Collect mtimes for all directories within projectDir (recursive).
 * Returns a map from relative path ("" for root, "epics", "epics/my-epic", etc.)
 * to mtime in milliseconds.
 */
export function collectDirMtimes(projectDir: string): Record<string, number> {
	const mtimes: Record<string, number> = {};
	collectDirMtimesRecursive(projectDir, "", mtimes);
	return mtimes;
}

function collectDirMtimesRecursive(
	rootDir: string,
	relativePath: string,
	mtimes: Record<string, number>,
): void {
	const absDir = relativePath ? path.join(rootDir, relativePath) : rootDir;

	try {
		const stat = fs.statSync(absDir);
		mtimes[relativePath] = stat.mtimeMs;
	} catch {
		return; // Directory disappeared — skip
	}

	let entries: string[];
	try {
		entries = fs.readdirSync(absDir);
	} catch {
		return;
	}

	for (const name of entries) {
		if (SKIP_NAMES.has(name)) continue;

		const childRelative = relativePath ? `${relativePath}/${name}` : name;
		const childAbs = path.join(absDir, name);

		try {
			const stat = fs.statSync(childAbs);
			if (stat.isDirectory()) {
				collectDirMtimesRecursive(rootDir, childRelative, mtimes);
			}
		} catch {
			// File/dir disappeared — skip
		}
	}
}

// ── Changed directory detection ───────────────────────────────

function findChangedDirs(
	cachedMtimes: Record<string, number>,
	currentMtimes: Record<string, number>,
): string[] {
	const changed: string[] = [];

	// Check for changed or new directories
	for (const [dir, mtime] of Object.entries(currentMtimes)) {
		const cachedMtime = cachedMtimes[dir];
		if (cachedMtime === undefined || cachedMtime !== mtime) {
			changed.push(dir);
		}
	}

	// Check for removed directories (in cache but not on disk)
	for (const dir of Object.keys(cachedMtimes)) {
		if (currentMtimes[dir] === undefined) {
			changed.push(dir);
		}
	}

	return changed;
}

// ── Incremental update ────────────────────────────────────────

/**
 * For each changed directory, re-read its direct children (files only — not recursive)
 * and update the cached state tree.
 */
function incrementalUpdate(
	projectDir: string,
	cachedState: ProjectState,
	changedDirs: string[],
): ProjectState {
	try {
		let state = cachedState;

		for (const dirRelative of changedDirs) {
			state = updateDirectory(projectDir, state, dirRelative);
		}

		return state;
	} catch {
		debug("loadState: incremental update failed, falling back to assembleState");
		return assembleState(projectDir);
	}
}

function updateDirectory(
	projectDir: string,
	state: ProjectState,
	dirRelative: string,
): ProjectState {
	const absDir = dirRelative ? path.join(projectDir, dirRelative) : projectDir;

	// If directory no longer exists, remove it from the tree
	if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
		debug(`incremental: directory removed: ${dirRelative || "(root)"}`);
		return removeFromTree(state, dirRelative);
	}

	// Read current directory entries
	const diskEntries = fs.readdirSync(absDir);

	// Resolve the current directory node from the tree
	const dirNode = resolveDir(state, dirRelative);
	const currentContents = dirNode !== undefined ? { ...dirNode.contents } : {};

	// Track which entries exist on disk
	const diskNames = new Set<string>();

	for (const name of diskEntries) {
		if (SKIP_NAMES.has(name)) continue;
		diskNames.add(name);

		const childAbs = path.join(absDir, name);
		const childRelative = dirRelative ? `${dirRelative}/${name}` : name;

		let stat: fs.Stats;
		try {
			stat = fs.statSync(childAbs);
		} catch {
			continue;
		}

		if (stat.isDirectory()) {
			// Directories are handled by their own changedDirs entry; just ensure they exist in tree
			if (currentContents[name] === undefined || currentContents[name]?.type !== "directory") {
				currentContents[name] = { type: "directory", contents: {} };
			}
		} else if (stat.isFile()) {
			// Only add NEW files not already in cached tree
			if (currentContents[name] === undefined) {
				const entry = readFileEntry(childRelative, childAbs, name);
				if (entry !== undefined) {
					debug(`incremental: new file detected: ${childRelative}`);
					currentContents[name] = entry;
				}
			}
		}
	}

	// Remove entries that no longer exist on disk
	for (const name of Object.keys(currentContents)) {
		if (!diskNames.has(name)) {
			debug(`incremental: file removed: ${dirRelative ? `${dirRelative}/${name}` : name}`);
			delete currentContents[name];
		}
	}

	// Reconstruct the tree with the updated directory
	return setDir(state, dirRelative, { type: "directory", contents: currentContents });
}

// ── File reading (shared skip logic with assemble.ts) ─────────

function readFileEntry(
	relativePath: string,
	absPath: string,
	name: string,
): StateEntry | undefined {
	if (name.endsWith(".json")) {
		return readJsonFile(relativePath, absPath);
	}
	if (name.endsWith(".jsonl")) {
		return readJsonlFile(relativePath, absPath);
	}
	if (name.endsWith(".md")) {
		return readMarkdownFile(absPath);
	}
	// Unknown file type — skip (matches assemble.ts behavior)
	debug(`incremental skip unknown type: ${relativePath}`);
	return undefined;
}

function readJsonFile(relativePath: string, absPath: string): JsonEntry<unknown> | undefined {
	const schema = findSchema(relativePath);
	if (schema === undefined) {
		debug(`incremental skip unregistered json: ${relativePath}`);
		return undefined;
	}

	const raw = fs.readFileSync(absPath, "utf-8");
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		debug(`incremental skip invalid json: ${relativePath}`);
		return undefined;
	}

	const result = schema.safeParse(parsed);
	if (!result.success) {
		// Throw so incrementalUpdate falls back to assembleState (which reports validation errors)
		throw new Error(`Schema validation failed: ${relativePath}`);
	}

	return { type: "json", content: result.data };
}

function readJsonlFile(relativePath: string, absPath: string): JsonlEntry<unknown> | undefined {
	const schema = findSchema(relativePath);
	if (schema === undefined) {
		debug(`incremental skip unregistered jsonl: ${relativePath}`);
		return undefined;
	}

	const raw = fs.readFileSync(absPath, "utf-8");
	const lines = raw.split("\n").filter((line) => line.trim().length > 0);
	const items: unknown[] = [];

	for (const line of lines) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			// Throw so incrementalUpdate falls back to assembleState (which reports malformed JSON)
			throw new Error(`Malformed JSON line in: ${relativePath}`);
		}

		const result = schema.safeParse(parsed);
		if (!result.success) {
			// Throw so incrementalUpdate falls back to assembleState (which reports validation errors)
			throw new Error(`Schema validation failed: ${relativePath}`);
		}
		items.push(result.data);
	}

	return { type: "jsonl", content: items };
}

function readMarkdownFile(absPath: string): MarkdownEntry {
	const content = fs.readFileSync(absPath, "utf-8");
	return { type: "markdown", content };
}

// ── Tree manipulation helpers ─────────────────────────────────

function resolveDir(state: ProjectState, relativePath: string): DirectoryEntry | undefined {
	if (relativePath === "") return state;

	const segments = relativePath.split("/").filter((s) => s.length > 0);
	let current: StateEntry = state;

	for (const segment of segments) {
		if (current.type !== "directory") return undefined;
		const child: StateEntry | undefined = current.contents[segment];
		if (child === undefined) return undefined;
		current = child;
	}

	return current.type === "directory" ? current : undefined;
}

function setDir(state: ProjectState, relativePath: string, dir: DirectoryEntry): ProjectState {
	if (relativePath === "") return dir;

	const segments = relativePath.split("/").filter((s) => s.length > 0);
	return setDirRecursive(state, segments, 0, dir);
}

function setDirRecursive(
	current: DirectoryEntry,
	segments: string[],
	index: number,
	dir: DirectoryEntry,
): DirectoryEntry {
	const segment = segments[index]!;
	const isLast = index === segments.length - 1;

	if (isLast) {
		return {
			type: "directory",
			contents: { ...current.contents, [segment]: dir },
		};
	}

	const child = current.contents[segment];
	const childDir: DirectoryEntry =
		child !== undefined && child.type === "directory" ? child : { type: "directory", contents: {} };

	return {
		type: "directory",
		contents: {
			...current.contents,
			[segment]: setDirRecursive(childDir, segments, index + 1, dir),
		},
	};
}

function removeFromTree(state: ProjectState, relativePath: string): ProjectState {
	if (relativePath === "") return ZERO_STATE;

	const segments = relativePath.split("/").filter((s) => s.length > 0);
	return removeRecursive(state, segments, 0);
}

function removeRecursive(
	current: DirectoryEntry,
	segments: string[],
	index: number,
): DirectoryEntry {
	const segment = segments[index]!;
	const isLast = index === segments.length - 1;

	if (isLast) {
		const { [segment]: _removed, ...rest } = current.contents;
		return { type: "directory", contents: rest };
	}

	const child = current.contents[segment];
	if (child === undefined || child.type !== "directory") return current;

	return {
		type: "directory",
		contents: {
			...current.contents,
			[segment]: removeRecursive(child, segments, index + 1),
		},
	};
}
