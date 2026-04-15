import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:chunk-verify --epic <name> --slice <name> --chunk <id>` (v2)
 *
 * Accepts stdin JSON `{ evidence }`.
 * Emits `chunk-verified` with domain "entity-lifecycle".
 *
 * Invariant: `chunk.evidence-non-empty` — evidence must be non-empty.
 */
export const sliceChunkVerifyCommand = defineCommand({
	meta: {
		name: "slice:chunk-verify",
		description: "Verify a chunk with evidence.",
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
		const evidence = stdin.evidence as string | undefined;

		if (evidence === undefined || evidence === "") {
			const errorOutput = {
				ok: false,
				error: "Evidence is required via stdin JSON { evidence }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Evidence is required\n`);
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
				actor: { kind: "cli", id: "gp:slice:chunk-verify" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "chunk-verified",
				payload: {
					sliceRef: ctx.sliceName,
					chunkId,
					evidence,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{ ok: true, event: result.event.id, entity: `slice:${ctx.sliceName}:${chunkId}` },
					args,
				);
			} else if (!args.quiet) {
				output(`Chunk ${pc.bold(chunkId)} verified for slice ${pc.bold(ctx.sliceName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
