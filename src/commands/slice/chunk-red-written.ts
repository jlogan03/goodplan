import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { storeContentRef } from "../../engine/content/store.js";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:chunk-red-written --epic <name> --slice <name> --chunk <id>` (v2)
 *
 * Accepts stdin JSON `{ testRef }` (test content string).
 * Stores as ContentRef, emits `chunk-red-test-written` with domain "entity-lifecycle".
 */
export const sliceChunkRedWrittenCommand = defineCommand({
	meta: {
		name: "slice:chunk-red-written",
		description: "Record that a red test has been written for a chunk.",
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
		const testRef = stdin.testRef as string | undefined;

		if (testRef === undefined || testRef === "") {
			const errorOutput = {
				ok: false,
				error: "Test reference content is required via stdin JSON { testRef }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Test reference content is required\n`);
			}
			process.exit(1);
		}

		const ctx = createEventCommandContext(args, { requireSlice: true });
		const chunkId = args.chunk as string;

		const testPath = path.join(
			"epics",
			ctx.epicName,
			"slices",
			ctx.sliceName,
			"chunks",
			chunkId,
			"red-test.md",
		);
		const contentRef = await storeContentRef(testRef, testPath, "text/markdown");

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:slice:chunk-red-written" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "chunk-red-test-written",
				payload: {
					sliceRef: ctx.sliceName,
					chunkId,
					testRef: contentRef,
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
					`Red test written for chunk ${pc.bold(chunkId)} in slice ${pc.bold(ctx.sliceName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
