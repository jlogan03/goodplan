import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { learningPromotedPayloadSchema } from "../../schemas/events/learning.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp learning:promote` — promote a learning from one scope to another.
 *
 * Stdin: { learningId, from, to }
 * Emits `learning-promoted` event to project-scope events.jsonl.
 *
 * This is the v2 event-based replacement for `learning:rollup` (v1 RPC).
 * Both commands coexist.
 */
export const learningPromoteCommand = defineCommand({
	meta: {
		name: "learning:promote",
		description: "Promote a learning to a wider scope (v2 event). Stdin: {learningId, from, to}.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = learningPromotedPayloadSchema.safeParse(stdin);

		if (!parsed.success) {
			const errorOutput = {
				ok: false,
				error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const ctx = createProjectCommandContext();

		try {
			const result = await appendEvent({
				eventsPath: ctx.projectEventsPath,
				scope: "project",
				scopeRef: null,
				actor: { kind: "cli", id: "gp:learning:promote" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "decision-learning",
				type: "learning-promoted",
				payload: {
					learningId: parsed.data.learningId,
					from: parsed.data.from,
					to: parsed.data.to,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `learning:${parsed.data.learningId}`,
					},
					args,
				);
			} else if (!args.quiet) {
				output(
					`Promoted learning ${pc.bold(parsed.data.learningId)}: ${parsed.data.from} -> ${parsed.data.to}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
