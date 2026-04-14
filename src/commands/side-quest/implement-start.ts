import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createSideQuestCommandContext, sideQuestArgs } from "./_shared.js";

/**
 * `gp side-quest:implement-start` — start implementation of a side-quest.
 *
 * Emits `side-quest-implementation-started` event.
 */
export const sideQuestImplementStartCommand = defineCommand({
	meta: {
		name: "side-quest:implement-start",
		description: "Start implementation of a side-quest.",
	},
	args: {
		...globalArgs,
		...sideQuestArgs,
	},
	setup() {},
	async run({ args }) {
		const ctx = createSideQuestCommandContext(args);

		try {
			const result = await appendEvent({
				eventsPath: ctx.eventsPath,
				scope: "side-quest",
				scopeRef: ctx.sideQuestName,
				actor: { kind: "cli", id: "gp:side-quest:implement-start" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "side-quest-implementation-started",
				payload: {},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{ ok: true, event: result.event.id, entity: `side-quest:${ctx.sideQuestName}` },
					args,
				);
			} else if (!args.quiet) {
				output(`Started implementation for side-quest ${pc.bold(ctx.sideQuestName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
