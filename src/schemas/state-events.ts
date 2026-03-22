// TODO: remaining events added in future slices (architecture defines ~30+ event types)
// TODO: `ts` field is not in the documented state-machine-api.md StateEvent union for INIT_PROJECT.
// It's injected by the RPC layer to keep the reducer pure (no Date.now() inside).
// Update architecture doc to include `ts` on events that need timestamps.
export type StateEvent = { type: "INIT_PROJECT"; name: string; ts: string };

/** Error codes produced by state machine transitions. Single source of truth — also used by GoodplanErrorCode. */
export type StateErrorCode = "STATE_ALREADY_INITIALIZED" | "STATE_INVALID_TRANSITION";

export type StateError = {
	code: StateErrorCode;
	message: string;
	detail?: Record<string, unknown>;
};

// Note: This structural guard matches any object with string `code` + `message`.
// Safe today because ProjectState tree entries use a `type` discriminant ("json" | "jsonl" | "dir")
// that doesn't overlap. If the state tree ever gains entries with `code`/`message` fields,
// add a negative check (e.g., `!("type" in result)`) or a discriminant tag.
export function isStateError(
	result: unknown,
): result is StateError {
	if (
		typeof result !== "object" ||
		result === null ||
		!("code" in result) ||
		!("message" in result)
	) {
		return false;
	}
	const rec = result as Record<string, unknown>;
	return typeof rec.code === "string" && typeof rec.message === "string";
}
