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
 * `gp side-quest:plan-commit` — commit the plan for a side-quest.
 *
 * Stdin: { plan: ContentRef }
 * Emits `side-quest-plan-committed` event.
 */
export const sideQuestPlanCommitCommand = defineCommand({
	meta: {
		name: "side-quest:plan-commit",
		description: "Commit a side-quest plan. Stdin: {plan: ContentRef}.",
	},
	args: {
		...globalArgs,
		...sideQuestArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const planParsed = ContentRefSchema.safeParse(stdin.plan);

		if (!planParsed.success) {
			const errorOutput = {
				ok: false,
				error: "Invalid input: plan must be a valid ContentRef",
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
				actor: { kind: "cli", id: "gp:side-quest:plan-commit" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "side-quest-plan-committed",
				payload: { plan: planParsed.data },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{ ok: true, event: result.event.id, entity: `side-quest:${ctx.sideQuestName}` },
					args,
				);
			} else if (!args.quiet) {
				output(`Committed plan for side-quest ${pc.bold(ctx.sideQuestName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
