import * as path from "node:path";

/**
 * Supported event log scopes.
 * Extensible as new scoped event logs are added (e.g., side-quest).
 */
export type EventScope = "project" | "epic";

/**
 * Map a scope + optional reference to the correct `events.jsonl` path.
 *
 * - `"project"` → `<goodplanDir>/events.jsonl`
 * - `"epic"` → `<goodplanDir>/epics/<scopeRef>/events.jsonl` (scopeRef required)
 *
 * Throws if scopeRef is required but missing.
 * Does NOT check file existence — callers handle that (replayEvents returns empty for missing files).
 */
export function resolveScopePath(
	scope: EventScope,
	scopeRef: string | undefined,
	goodplanDir: string,
): string {
	switch (scope) {
		case "project":
			return path.join(goodplanDir, "events.jsonl");
		case "epic": {
			if (scopeRef === undefined || scopeRef === "") {
				throw new Error("--scope-ref is required when --scope is 'epic'");
			}
			return path.join(goodplanDir, "epics", scopeRef, "events.jsonl");
		}
		default: {
			// Exhaustive check
			const _exhaustive: never = scope;
			throw new Error(`Unknown scope: ${_exhaustive}`);
		}
	}
}
