import pc from "picocolors";
import type { ErrorOutput } from "../schemas/error-output.js";
import { type GoodplanError, isGoodplanError } from "./errors.js";
import { deterministicStringify } from "./json.js";
import { applyQuery } from "./query.js";

export interface OutputArgs {
	json?: boolean | undefined;
	quiet?: boolean | undefined;
	query?: string | undefined;
}

/**
 * Write command output to stdout.
 *
 * Precedence:
 * - `--query` overrides `--quiet` (if both passed, `--query` wins)
 * - `--query` implies `--json` for the intermediate representation
 * - `--quiet` suppresses all output (for scripting)
 * - `--json` outputs deterministic JSON
 * - default: human-readable (data expected to be a pre-formatted string)
 */
export function output(data: unknown, args: OutputArgs): void {
	// --query takes highest precedence: implies json, overrides quiet
	if (args.query) {
		const result = applyQuery(data, args.query);
		process.stdout.write(`${deterministicStringify(result)}\n`);
		return;
	}
	if (args.quiet) {
		return;
	}
	if (args.json) {
		process.stdout.write(`${deterministicStringify(data)}\n`);
	} else {
		const text = typeof data === "string" ? data : deterministicStringify(data);
		process.stdout.write(`${text}\n`);
	}
}

/**
 * Write an error to the appropriate stream.
 * - JSON mode: structured error to stdout (per architecture: JSON errors go to stdout)
 * - Human mode: colored message to stderr
 */
export function outputError(error: GoodplanError, args: OutputArgs): void {
	const errorObj: { error: ErrorOutput } = {
		error: {
			code: error.code,
			message: error.message,
			...(error.detail !== undefined ? { detail: error.detail } : {}),
		},
	};

	if (args.query) {
		const result = applyQuery(errorObj, args.query);
		process.stdout.write(`${deterministicStringify(result)}\n`);
	} else if (args.json) {
		process.stdout.write(`${deterministicStringify(errorObj)}\n`);
	} else {
		process.stderr.write(`${pc.red("Error")}: ${error.message}\n`);
	}
}

/**
 * Write an unexpected (non-GoodplanError) error to the appropriate stream.
 */
export function outputUnexpectedError(error: unknown, args: OutputArgs): void {
	const message = error instanceof Error ? error.message : String(error);
	const errorObj: { error: ErrorOutput } = {
		error: {
			code: "INTERNAL_ERROR",
			message,
		},
	};

	if (args.query) {
		const result = applyQuery(errorObj, args.query);
		process.stdout.write(`${deterministicStringify(result)}\n`);
	} else if (args.json) {
		process.stdout.write(`${deterministicStringify(errorObj)}\n`);
	} else {
		process.stderr.write(`${pc.red("Error")}: ${message}\n`);
	}
}

/**
 * Map a GoodplanError code to the appropriate exit code.
 * - VALIDATION_* -> 2
 * - STATE_* -> 3
 * - DATA_* and others -> 1
 */
export function exitCodeForError(error: unknown): number {
	if (isGoodplanError(error)) {
		if (error.code.startsWith("VALIDATION_")) return 2;
		if (error.code.startsWith("STATE_")) return 3;
		return 1;
	}
	return 1;
}
