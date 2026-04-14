/**
 * Recursive state tree types and navigation helpers.
 * Pure data structures — no I/O.
 *
 * Shared across layers: both the state machine (src/core/state/) and data layer
 * (src/core/data/) import from here. This module has zero I/O dependencies.
 *
 * TODO: Add barrel exports (src/core/index.ts) when the module count warrants it.
 */

// ── Entry types ──────────────────────────────────────────────

export interface DirectoryEntry {
	type: "directory";
	contents: Record<string, StateEntry>;
}

export interface JsonEntry<T> {
	type: "json";
	content: T;
}

export interface JsonlEntry<T> {
	type: "jsonl";
	content: T[];
}

export interface MarkdownEntry {
	type: "markdown";
	content: string;
}

export type StateEntry = DirectoryEntry | JsonEntry<unknown> | JsonlEntry<unknown> | MarkdownEntry;

/**
 * The root of the state tree — a directory representing `.goodplan/`.
 */
export type ProjectState = DirectoryEntry;

// ── Zero state ───────────────────────────────────────────────

/**
 * Empty tree representing an uninitialized project.
 * `as const satisfies` gives type-level immutability.
 */
export const ZERO_STATE = {
	type: "directory",
	contents: {},
} as const satisfies ProjectState;

// ── Navigation helpers ───────────────────────────────────────

/**
 * Split a path into segments, ignoring empty segments from
 * leading/trailing/double slashes.
 */
function splitPath(path: string): string[] {
	return path.split("/").filter((s) => s.length > 0);
}

/**
 * Walk the tree by splitting `path` on "/".
 * Returns `undefined` if any segment is missing or points to a non-directory
 * intermediate.
 */
export function resolve(state: ProjectState, path: string): StateEntry | undefined {
	const segments = splitPath(path);
	let current: StateEntry = state;

	for (const segment of segments) {
		if (current.type !== "directory") return undefined;
		const child: StateEntry | undefined = current.contents[segment];
		if (child === undefined) return undefined;
		current = child;
	}

	return current;
}

/**
 * Get a JSON entry's content with an unchecked cast to `T`.
 *
 * **Unsafe** — callers must pass the correct type parameter and only use this
 * on trees that have been schema-validated (via assembleState or commitState).
 */
export function getJson<T>(state: ProjectState, path: string): T | undefined {
	const entry = resolve(state, path);
	if (entry === undefined || entry.type !== "json") return undefined;
	return entry.content as T;
}

/**
 * Get a JSONL entry's content array with an unchecked cast to `T[]`.
 *
 * **Unsafe** — same `as T[]` cast tradeoff as `getJson`. Only use on trees
 * that have been schema-validated (via assembleState or commitState).
 */
export function getJsonl<T>(state: ProjectState, path: string): T[] | undefined {
	const entry = resolve(state, path);
	if (entry === undefined || entry.type !== "jsonl") return undefined;
	return entry.content as T[];
}

/**
 * Get a directory entry at `path`.
 */
export function getDir(state: ProjectState, path: string): DirectoryEntry | undefined {
	const entry = resolve(state, path);
	if (entry === undefined || entry.type !== "directory") return undefined;
	return entry;
}

/**
 * Get a markdown entry's raw text content.
 */
export function getMarkdown(state: ProjectState, path: string): string | undefined {
	const entry = resolve(state, path);
	if (entry === undefined || entry.type !== "markdown") return undefined;
	return entry.content;
}

/**
 * Check if a child exists in a directory's contents.
 * Returns `false` if `dirPath` doesn't resolve to a directory.
 */
export function hasChild(state: ProjectState, dirPath: string, childName: string): boolean {
	const dir = getDir(state, dirPath);
	return dir !== undefined && dir.contents[childName] !== undefined;
}

/**
 * Immutable setter — returns a new tree with `entry` placed at `path`.
 * Auto-creates intermediate `DirectoryEntry` nodes for missing path segments,
 * matching `mkdirSync({ recursive: true })` semantics.
 *
 * Does not mutate the original tree.
 */
export function setEntry(state: ProjectState, path: string, entry: StateEntry): ProjectState {
	const segments = splitPath(path);
	if (segments.length === 0) {
		// Setting the root itself — only valid if entry is a directory
		if (entry.type !== "directory") {
			throw new Error("Cannot replace root with a non-directory entry");
		}
		return entry;
	}

	return setEntryRecursive(state, segments, 0, entry);
}

function setEntryRecursive(
	dir: DirectoryEntry,
	segments: string[],
	index: number,
	entry: StateEntry,
): DirectoryEntry {
	const segment = segments[index]!; // safe: caller ensures index < segments.length
	const isLast = index === segments.length - 1;

	if (isLast) {
		// Place the entry at this segment
		return {
			type: "directory",
			contents: { ...dir.contents, [segment]: entry },
		};
	}

	// Need to go deeper — get or create intermediate directory
	const existing = dir.contents[segment];
	if (existing !== undefined && existing.type !== "directory") {
		const fullPath = segments.slice(0, index + 1).join("/");
		throw new Error(`setEntry: non-directory entry exists at intermediate path "${fullPath}"`);
	}
	const childDir: DirectoryEntry = existing ?? { type: "directory", contents: {} };

	const updatedChild = setEntryRecursive(childDir, segments, index + 1, entry);

	return {
		type: "directory",
		contents: { ...dir.contents, [segment]: updatedChild },
	};
}
