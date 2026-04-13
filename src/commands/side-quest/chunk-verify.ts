import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createSideQuestCommandContext, sideQuestArgs } from "./_shared.js";

/**
 * `gp side-quest:chunk-verify` — verify a chunk in a side-quest.
 *
 * Stdin: { chunkId, evidence }
 * Emits `side-quest-chunk-verified` event.
 */
export const sideQuestChunkVerifyCommand = defineCommand({
	meta: {
		name: "side-quest:chunk-verify",
		description: "Verify a chunk in a side-quest. Stdin: {chunkId, evidence}.",
	},
	args: {
		...globalArgs,
		...sideQuestArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const chunkId = stdin.chunkId as string | undefined;
		const evidence = stdin.evidence as string | undefined;

		if (chunkId === undefined || chunkId === "") {
			const errorOutput = {
				ok: false,
				error: "chunkId is required in stdin JSON",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		if (evidence === undefined || evidence === "") {
			const errorOutput = {
				ok: false,
				error: "evidence is required in stdin JSON",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const ctx = createSideQuestCommandContext(args);

		try {
			const result = await appendEvent({
				eventsPath: ctx.eventsPath,
				scope: "side-quest",
				scopeRef: ctx.sideQuestName,
				actor: { kind: "cli", id: "gp:side-quest:chunk-verify" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "side-quest-chunk-verified",
				payload: { chunkId, evidence },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `side-quest:${ctx.sideQuestName}:chunk:${chunkId}`,
					},
					args,
				);
			} else if (!args.quiet) {
				output(
					`Verified chunk ${pc.bold(chunkId)} in side-quest ${pc.bold(ctx.sideQuestName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
