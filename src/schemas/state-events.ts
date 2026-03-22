// TODO: remaining events added in future slices (architecture defines ~30+ event types)
export type StateEvent = { type: "INIT_PROJECT"; name: string };

export type StateError = {
	code: string;
	message: string;
	detail?: Record<string, unknown>;
};

export function isStateError(
	result: unknown,
): result is StateError {
	return (
		typeof result === "object" &&
		result !== null &&
		"code" in result &&
		typeof (result as StateError).code === "string" &&
		"message" in result &&
		typeof (result as StateError).message === "string"
	);
}
