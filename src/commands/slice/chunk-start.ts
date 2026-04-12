import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:chunk-start --epic <name> --slice <name> --chunk <id>` (v2)
 *
 * Accepts stdin JSON `{ description }`.
 * Emits `slice-implementation-chunk-started` with domain "entity-lifecycle".
 *
 * Invariant: `slice.implementation-started-before-chunk` — implementation must be started.
 */
export const sliceChunkStartCommand = defineCommand({
	meta: {
		name: "slice:chunk-start",
		description: "Start a TDD chunk within a slice implementation.",
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
		const description = stdin.description as string | undefined;

		if (description === undefined || description === "") {
			const errorOutput = {
				ok: false,
				error: "Chunk description is required via stdin JSON { description }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Chunk description is required\n`);
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
				actor: { kind: "cli", id: "gp:slice:chunk-start" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "slice-implementation-chunk-started",
				payload: {
					sliceRef: ctx.sliceName,
					chunkId,
					description,
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
					`Chunk ${pc.bold(chunkId)} started for slice ${pc.bold(ctx.sliceName)} in epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
