import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { learningCapturedPayloadSchema } from "../../schemas/events/learning.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp learning:capture` — capture a learning via v2 event pattern.
 *
 * Stdin: { summary, scope?, tags? }
 * Emits `learning-captured` event to project-scope events.jsonl.
 */
export const learningCaptureCommand = defineCommand({
	meta: {
		name: "learning:capture",
		description: "Capture a learning (v2 event). Stdin: {summary, scope?, tags?}.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = learningCapturedPayloadSchema.safeParse(stdin);

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

		const payload = {
			summary: parsed.data.summary,
			...(parsed.data.scope !== undefined ? { scope: parsed.data.scope } : {}),
			...(parsed.data.tags !== undefined ? { tags: parsed.data.tags } : {}),
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.projectEventsPath,
				scope: "project",
				scopeRef: null,
				actor: { kind: "cli", id: "gp:learning:capture" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "decision-learning",
				type: "learning-captured",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: "learning",
					},
					args,
				);
			} else if (!args.quiet) {
				output(`Captured learning: ${parsed.data.summary}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
