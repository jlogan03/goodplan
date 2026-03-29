/**
 * serializeStateTree — transforms a ProjectState tree into a plain
 * JSON-serializable object for the `gp state` command.
 *
 * The return type `Record<string, unknown>` is a public API contract.
 * External consumers (skills, agents) depend on this shape. Changes
 * to the serialization format are breaking changes.
 */

import type {
	DirectoryEntry,
	JsonEntry,
	JsonlEntry,
	MarkdownEntry,
	ProjectState,
	StateEntry,
} from "../tree.js";

export interface SerializeOptions {
	inline: boolean;
}

/**
 * Recursively transforms the typed StateEntry tree into a plain
 * JSON-serializable object with unwrapped entries:
 * - DirectoryEntry → plain object (keys = child names, values = serialized children)
 * - JsonEntry<T> → T directly (unwrapped)
 * - JsonlEntry<T> → T[] directly (unwrapped)
 * - MarkdownEntry → `true` when inline is false, raw string when inline is true
 *
 * Key ordering is NOT sorted here — that is handled by `deterministicStringify`
 * in the output layer.
 */
export function serializeStateTree(
	state: ProjectState,
	options: SerializeOptions,
): Record<string, unknown> {
	// The top-level ProjectState is always a DirectoryEntry.
	// The internal helper returns `unknown` for recursive flexibility;
	// we cast the top-level result since a directory always produces an object.
	return serializeEntry(state, options) as Record<string, unknown>;
}

function serializeEntry(entry: StateEntry, options: SerializeOptions): unknown {
	switch (entry.type) {
		case "directory":
			return serializeDirectory(entry, options);
		case "json":
			return serializeJson(entry);
		case "jsonl":
			return serializeJsonl(entry);
		case "markdown":
			return serializeMarkdown(entry, options);
		default: {
			const _exhaustive: never = entry;
			throw new Error(`Unknown StateEntry type: ${(_exhaustive as StateEntry).type}`);
		}
	}
}

function serializeDirectory(
	entry: DirectoryEntry,
	options: SerializeOptions,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, child] of Object.entries(entry.contents)) {
		result[key] = serializeEntry(child, options);
	}
	return result;
}

function serializeJson(entry: JsonEntry<unknown>): unknown {
	return entry.content;
}

function serializeJsonl(entry: JsonlEntry<unknown>): unknown[] {
	return entry.content;
}

function serializeMarkdown(entry: MarkdownEntry, options: SerializeOptions): unknown {
	return options.inline ? entry.content : true;
}
