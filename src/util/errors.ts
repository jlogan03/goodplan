/** Error codes for the DATA namespace (filesystem I/O). */
type DataErrorCode =
	| "DATA_CONCURRENT_MODIFICATION"
	| "DATA_FILE_NOT_FOUND"
	| "DATA_INVALID_JSON"
	| "DATA_MIGRATION_BACKUP_EXISTS"
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
	| "VALIDATION_MIGRATION_CORRECTION_LIMIT"
	| "VALIDATION_MIGRATION_INVALID"
	| "VALIDATION_STDIN_TOO_LARGE"
	| "VALIDATION_UNKNOWN_COMMAND"
	| "VALIDATION_VERSION_MAJOR_MISMATCH";

/** Catch-all error code for unexpected internal failures. */
type InternalErrorCode = "INTERNAL_ERROR";

export type GoodplanErrorCode =
	| DataErrorCode
	| InternalErrorCode
	| StateErrorCode
	| ValidationErrorCode;

/**
 * Canonical list of all error codes. Exported for fitness testing.
 * Every element is type-checked via `satisfies`. When adding a new code to any
 * error-code union, also add it here — the fitness test derives expected codes
 * from source type definitions and asserts bidirectional set equality.
 */
export const ALL_ERROR_CODES = [
	// DATA_*
	"DATA_CONCURRENT_MODIFICATION",
	"DATA_FILE_NOT_FOUND",
	"DATA_INVALID_JSON",
	"DATA_MIGRATION_BACKUP_EXISTS",
	"DATA_NO_PROJECT",
	"DATA_READ_ERROR",
	"DATA_VALIDATION_ERROR",
	"DATA_WRITE_ERROR",
	// STATE_*
	"STATE_ALREADY_INITIALIZED",
	"STATE_INVALID_TRANSITION",
	"STATE_EPIC_ALREADY_ACTIVE",
	"STATE_MISSING_VERIFICATIONS",
	"STATE_VERIFICATION_FAILED",
	"STATE_SLICE_NOT_READY",
	"STATE_CONTENT_MISSING",
	"STATE_MAX_ROUNDS_REACHED",
	"STATE_QUEST_ALREADY_ACTIVE",
	"STATE_DUPLICATE_DECISION",
	// VALIDATION_*
	"VALIDATION_INVALID_INPUT",
	"VALIDATION_INVALID_QUERY",
	"VALIDATION_INVALID_STDIN",
	"VALIDATION_MIGRATION_CORRECTION_LIMIT",
	"VALIDATION_MIGRATION_INVALID",
	"VALIDATION_STDIN_TOO_LARGE",
	"VALIDATION_UNKNOWN_COMMAND",
	"VALIDATION_VERSION_MAJOR_MISMATCH",
	// INTERNAL_*
	"INTERNAL_ERROR",
] as const satisfies readonly GoodplanErrorCode[];

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
