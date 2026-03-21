/** Error codes for the DATA namespace (filesystem I/O). */
type DataErrorCode =
	| "DATA_CONCURRENT_MODIFICATION"
	| "DATA_FILE_NOT_FOUND"
	| "DATA_INVALID_JSON"
	| "DATA_NO_PROJECT"
	| "DATA_READ_ERROR"
	| "DATA_VALIDATION_ERROR"
	| "DATA_WRITE_ERROR";

/** Error codes for the STATE namespace (state machine). Expand as needed. */
type StateErrorCode = "STATE_INVALID_TRANSITION";

/** Error codes for the VALIDATION namespace (input validation). Expand as needed. */
type ValidationErrorCode =
	| "VALIDATION_INVALID_INPUT"
	| "VALIDATION_INVALID_STDIN"
	| "VALIDATION_UNKNOWN_COMMAND";

export type GoodplanErrorCode = DataErrorCode | StateErrorCode | ValidationErrorCode;

export class GoodplanError extends Error {
	readonly code: GoodplanErrorCode;
	readonly detail: string | undefined;

	constructor(code: GoodplanErrorCode, message: string, detail?: string, cause?: unknown) {
		super(message, cause !== undefined ? { cause } : undefined);
		this.name = "GoodplanError";
		this.code = code;
		this.detail = detail;
	}
}

export function isGoodplanError(value: unknown): value is GoodplanError {
	return value instanceof GoodplanError;
}
