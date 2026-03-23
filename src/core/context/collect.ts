/**
 * Tree traversal functions for context bundling.
 * Walks the state tree to collect MarkdownEntry nodes for inlining/referencing.
 */

import type { DirectoryEntry, ProjectState, StateEntry } from "../tree.js";
import { resolve } from "../tree.js";
import type { ResolvedTarget } from "./priorities.js";
import { resolveSourcePath } from "./priorities.js";
import type { ContentSource } from "./types.js";

// ── Collected entry ─────────────────────────────────────────

export interface CollectedEntry {
	/** State-tree-relative path (e.g., "epics/my-epic/architecture/_overview.md"). */
	key: string;
	/** The markdown content. */
	content: string;
}

// ── Tree traversal ──────────────────────────────────────────

/**
 * Resolve a path to a DirectoryEntry and walk its contents recursively,
 * collecting all MarkdownEntry nodes with their state-tree-relative paths.
 *
 * Only markdown entries are collected — JSON, JSONL, and directory-only entries
 * are skipped. Returns entries in deterministic order (sorted by key).
 *
 * Returns an empty array if the path doesn't resolve or isn't a directory.
 */
export function collectMarkdownEntries(
	state: ProjectState,
	path: string,
): CollectedEntry[] {
	const entry = resolve(state, path);
	if (entry === undefined || entry.type !== "directory") return [];

	const results: CollectedEntry[] = [];
	walkDirectory(entry, path, results);
	return results.sort((a, b) => a.key.localeCompare(b.key));
}

function walkDirectory(
	dir: DirectoryEntry,
	basePath: string,
	results: CollectedEntry[],
): void {
	for (const [name, child] of Object.entries(dir.contents)) {
		const childPath = basePath ? `${basePath}/${name}` : name;
		collectEntry(child, childPath, results);
	}
}

function collectEntry(
	entry: StateEntry,
	path: string,
	results: CollectedEntry[],
): void {
	if (entry.type === "markdown") {
		results.push({ key: path, content: entry.content });
	} else if (entry.type === "directory") {
		walkDirectory(entry, path, results);
	}
	// Skip json and jsonl entries
}

// ── Content source resolution ───────────────────────────────

/**
 * Given a priority source definition, resolve it to collected entries.
 *
 * - For "markdown" sources: resolves to a single entry (if the path points to
 *   a MarkdownEntry) or to the JSON content stringified (for entity JSON files
 *   used as "goal" sources).
 * - For "directory" sources: expands to all MarkdownEntry children via tree traversal.
 *
 * Returns an empty array if the path doesn't resolve or the content doesn't exist.
 */
export function resolveContentSource(
	state: ProjectState,
	source: ContentSource,
	rt: ResolvedTarget,
): CollectedEntry[] {
	const path = resolveSourcePath(source, rt);
	if (path === undefined) return [];

	if (source.sourceType === "directory") {
		return collectMarkdownEntries(state, path);
	}

	// Single markdown source
	const entry = resolve(state, path);
	if (entry === undefined) return [];

	if (entry.type === "markdown") {
		return [{ key: path, content: entry.content }];
	}

	// JSON files used as "goal" sources — stringify the goal field if present
	if (entry.type === "json") {
		const content = entry.content;
		if (content !== null && typeof content === "object" && "goal" in content) {
			const record = content as Record<string, unknown>;
			if (typeof record["goal"] === "string") {
				return [{ key: path, content: record["goal"] }];
			}
		}
		// Fallback: stringify the whole JSON content
		return [{ key: path, content: JSON.stringify(content, null, 2) }];
	}

	return [];
}
