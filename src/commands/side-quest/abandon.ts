import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createSideQuestCommandContext, sideQuestArgs } from "./_shared.js";

/**
 * `gp side-quest:abandon` — abandon a side-quest.
 *
 * Emits `side-quest-abandoned` event with a reason.
 */
export const sideQuestAbandonCommand = defineCommand({
	meta: {
		name: "side-quest:abandon",
		description: "Abandon a side-quest. Requires --reason.",
	},
	args: {
		...globalArgs,
		...sideQuestArgs,
		reason: {
			type: "string",
			description: "Reason for abandoning",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const reason = args.reason as string;
		const ctx = createSideQuestCommandContext(args);

		try {
			const result = await appendEvent({
				eventsPath: ctx.eventsPath,
				scope: "side-quest",
				scopeRef: ctx.sideQuestName,
				actor: { kind: "cli", id: "gp:side-quest:abandon" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "side-quest-abandoned",
				payload: { reason },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{ ok: true, event: result.event.id, entity: `side-quest:${ctx.sideQuestName}` },
					args,
				);
			} else if (!args.quiet) {
				output(`Abandoned side-quest ${pc.bold(ctx.sideQuestName)}: ${reason}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
