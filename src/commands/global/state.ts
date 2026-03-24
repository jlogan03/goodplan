/**
 * `goodplan state` — expose the full .project/ state tree as JSON.
 *
 * This command is LLM-facing and always outputs JSON. There is no
 * human-readable format. It bypasses the shared `output()` function
 * because `output()` treats bare invocations (no --json) as
 * human-readable text, whereas `state` must always emit JSON.
 * This is an explicit exception to the "no --json = human-readable" convention.
 *
 * Architecture: read-only command — routes directly to Data Layer,
 * bypassing RPC and State Machine.
 */

import { defineCommand } from "citty";
import { assembleState } from "../../core/data/assemble.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { serializeStateTree } from "../../core/data/serialize.js";
import { GoodplanError } from "../../util/errors.js";
import { deterministicStringify } from "../../util/json.js";
import { exitCodeForError, outputError, outputUnexpectedError } from "../../util/output.js";
import { applyQuery } from "../../util/query.js";
import { globalArgs, parseInlineBudget } from "../global-args.js";

export const stateCommand = defineCommand({
	meta: {
		name: "state",
		description:
			"Expose the full .project/ state tree as JSON. Always outputs JSON regardless of --json flag.",
	},
	args: {
		...globalArgs,
		inline: {
			type: "string",
			description: "Include markdown content in state tree",
			required: false,
		},
		offset: {
			type: "string",
			description: "Skip N entries when result is an array (requires --query)",
			required: false,
		},
		limit: {
			type: "string",
			description: "Return at most N entries when result is an array (requires --query)",
			required: false,
		},
	},
	setup() {},
	async run({ args }) {
		try {
			// Budget form deferred — parseInlineBudget returns true|number|undefined, collapsed to boolean here.
			// citty delivers "" for absent string flags; treat as undefined.
			const inlineArg = args.inline === "" ? undefined : args.inline;
			const inline = parseInlineBudget(inlineArg) !== undefined;

			const dir = resolveProjectDir();
			const state = assembleState(dir);
			const serialized = serializeStateTree(state, { inline });

			// --quiet: suppress all output. Since state bypasses output(), we
			// must handle --quiet explicitly here.
			if (args.quiet) {
				return;
			}

			if (args.query) {
				// When --query is present: apply query, then paginate if result is array
				let result = applyQuery(serialized, args.query);

				// applyQuery returns the raw value for single results, array for multiple.
				// Pagination applies to any array result regardless of origin.
				if (Array.isArray(result)) {
					const offset = parseNonNegativeInt(args.offset, "offset");
					const limit = parseNonNegativeInt(args.limit, "limit");

					if (offset !== undefined || limit !== undefined) {
						const start = offset ?? 0;
						const end = limit !== undefined ? start + limit : undefined;
						result = result.slice(start, end);
					}
				}

				process.stdout.write(`${deterministicStringify(result)}\n`);
			} else {
				// No --query: serialize full state tree. offset/limit have no effect.
				if (args.offset || args.limit) {
					process.stderr.write("Warning: --offset/--limit have no effect without --query\n");
				}
				process.stdout.write(`${deterministicStringify(serialized)}\n`);
			}
		} catch (error: unknown) {
			// Format errors as JSON since state always outputs JSON.
			// Do not let errors fall through to the top-level handler,
			// which would produce human-readable stderr for bare invocations.
			// Reuse outputError/outputUnexpectedError with json:true to maintain
			// a single definition of the error output shape (INV-007).
			const jsonArgs = { json: true } as const;
			if (error instanceof GoodplanError) {
				outputError(error, jsonArgs);
			} else {
				outputUnexpectedError(error, jsonArgs);
			}
			process.exitCode = exitCodeForError(error);
		}
	},
});

/**
 * Parse a string flag value as a non-negative integer.
 * Uses parseInt (not Number()) because Number("") returns 0 instead of NaN.
 * Returns undefined if the value is undefined/empty.
 * Throws VALIDATION_INVALID_INPUT if the value is not a valid non-negative integer.
 */
function parseNonNegativeInt(value: string | undefined, name: string): number | undefined {
	if (value === undefined || value === "") return undefined;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 0 || String(parsed) !== value) {
		throw new GoodplanError(
			"VALIDATION_INVALID_INPUT",
			`--${name} must be a non-negative integer, got: ${value}`,
		);
	}
	return parsed;
}
