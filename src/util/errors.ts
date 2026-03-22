/** Error codes for the DATA namespace (filesystem I/O). */
type DataErrorCode =
	| "DATA_CONCURRENT_MODIFICATION"
	| "DATA_FILE_NOT_FOUND"
	| "DATA_INVALID_JSON"
	| "DATA_NO_PROJECT"
	| "DATA_READ_ERROR"
	| "DATA_VALIDATION_ERROR"
	| "DATA_WRITE_ERROR";

/** Error codes for the STATE namespace — imported from state-events.ts (single source of truth). */
import type { StateErrorCode } from "../schemas/state-events.js";

/** Error codes for the VALIDATION namespace (input validation). Expand as needed. */
type ValidationErrorCode =
	| "VALIDATION_INVALID_INPUT"
	| "VALIDATION_INVALID_QUERY"
	| "VALIDATION_INVALID_STDIN"
	| "VALIDATION_STDIN_TOO_LARGE"
	| "VALIDATION_UNKNOWN_COMMAND";

/** Catch-all error code for unexpected internal failures. */
type InternalErrorCode = "INTERNAL_ERROR";

export type GoodplanErrorCode =
	| DataErrorCode
	| InternalErrorCode
	| StateErrorCode
	| ValidationErrorCode;

export class GoodplanError extends Error {
	readonly code: GoodplanErrorCode;
	readonly detail: string | Record<string, unknown> | undefined;

	constructor(
		code: GoodplanErrorCode,
		message: string,
		detail?: string | Record<string, unknown>,
		cause?: unknown,
	) {
		super(message, cause !== undefined ? { cause } : undefined);
		this.name = "GoodplanError";
		this.code = code;
		this.detail = detail;
	}
}

export function isGoodplanError(value: unknown): value is GoodplanError {
	return value instanceof GoodplanError;
}
