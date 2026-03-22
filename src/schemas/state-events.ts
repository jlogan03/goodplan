// TODO: remaining events added in future slices (architecture defines ~30+ event types)
export type StateEvent = { type: "INIT_PROJECT"; name: string; ts: string };

export type StateError = {
	code: string;
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
