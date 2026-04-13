import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { ContentRefSchema } from "../../schemas/envelope.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createSideQuestCommandContext, sideQuestArgs } from "./_shared.js";

/**
 * `gp side-quest:goal-commit` — commit the goal for a side-quest.
 *
 * Stdin: { goal: ContentRef }
 * Emits `side-quest-goal-committed` event.
 */
export const sideQuestGoalCommitCommand = defineCommand({
	meta: {
		name: "side-quest:goal-commit",
		description: "Commit a side-quest goal. Stdin: {goal: ContentRef}.",
	},
	args: {
		...globalArgs,
		...sideQuestArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const goalParsed = ContentRefSchema.safeParse(stdin.goal);

		if (!goalParsed.success) {
			const errorOutput = {
				ok: false,
				error: "Invalid input: goal must be a valid ContentRef",
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
				actor: { kind: "cli", id: "gp:side-quest:goal-commit" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "side-quest-goal-committed",
				payload: { goal: goalParsed.data },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{ ok: true, event: result.event.id, entity: `side-quest:${ctx.sideQuestName}` },
					args,
				);
			} else if (!args.quiet) {
				output(`Committed goal for side-quest ${pc.bold(ctx.sideQuestName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
