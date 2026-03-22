/**
 * Re-export from shared core tree module.
 * The pure tree types and helpers live in src/core/tree.ts (no I/O, shared
 * across layers). This re-export preserves existing data-layer import paths.
 */
export {
	ZERO_STATE,
	getDir,
	getJson,
	getJsonl,
	getMarkdown,
	hasChild,
	resolve,
	setEntry,
} from "../tree.js";

export type {
	DirectoryEntry,
	JsonEntry,
	JsonlEntry,
	MarkdownEntry,
	ProjectState,
	StateEntry,
} from "../tree.js";
