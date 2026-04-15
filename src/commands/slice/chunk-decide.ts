import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

const VALID_DECISIONS = ["accept", "revert", "defer"] as const;

/**
 * `gp slice:chunk-decide --epic <name> --slice <name> --chunk <id>` (v2)
 *
 * Accepts stdin JSON `{ decision, reason }`.
 * Emits `chunk-unverifiable-decided` with domain "entity-lifecycle".
 * `decision` must be one of: "accept", "revert", "defer".
 */
export const sliceChunkDecideCommand = defineCommand({
	meta: {
		name: "slice:chunk-decide",
		description: "Decide on an unverifiable chunk (accept, revert, or defer).",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
		chunk: {
			type: "string",
			description: "Chunk ID",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const decision = stdin.decision as string | undefined;
		const reason = stdin.reason as string | undefined;

		if (
			decision === undefined ||
			!VALID_DECISIONS.includes(decision as (typeof VALID_DECISIONS)[number])
		) {
			const errorOutput = {
				ok: false,
				error: `Decision must be one of: ${VALID_DECISIONS.join(", ")}. Got: ${String(decision)}`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		if (reason === undefined || reason === "") {
			const errorOutput = {
				ok: false,
				error: "Reason is required via stdin JSON { decision, reason }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Reason is required\n`);
			}
			process.exit(1);
		}

		const ctx = createEventCommandContext(args, { requireSlice: true });
		const chunkId = args.chunk as string;

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:slice:chunk-decide" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "chunk-unverifiable-decided",
				payload: {
					sliceRef: ctx.sliceName,
					chunkId,
					decision,
					reason,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{ ok: true, event: result.event.id, entity: `slice:${ctx.sliceName}:${chunkId}` },
					args,
				);
			} else if (!args.quiet) {
				output(
					`Chunk ${pc.bold(chunkId)} decided (${decision}) for slice ${pc.bold(ctx.sliceName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
