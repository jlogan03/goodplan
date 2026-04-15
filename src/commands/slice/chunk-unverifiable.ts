import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:chunk-unverifiable --epic <name> --slice <name> --chunk <id>` (v2)
 *
 * Accepts stdin JSON `{ reason }`.
 * Emits `chunk-unverifiable` with domain "entity-lifecycle".
 * Alternative path after green when verification is not feasible.
 */
export const sliceChunkUnverifiableCommand = defineCommand({
	meta: {
		name: "slice:chunk-unverifiable",
		description: "Mark a chunk as unverifiable (alternative to verify).",
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
		const reason = stdin.reason as string | undefined;

		if (reason === undefined || reason === "") {
			const errorOutput = {
				ok: false,
				error: "Reason is required via stdin JSON { reason }",
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
				actor: { kind: "cli", id: "gp:slice:chunk-unverifiable" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "chunk-unverifiable",
				payload: {
					sliceRef: ctx.sliceName,
					chunkId,
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
					`Chunk ${pc.bold(chunkId)} marked unverifiable for slice ${pc.bold(ctx.sliceName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
