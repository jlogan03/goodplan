import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:complete --epic <name>` (v2) — complete an epic.
 *
 * Emits `epic-completed` with domain "entity-lifecycle".
 */
export const epicCompleteCommand = defineCommand({
	meta: {
		name: "epic:complete",
		description: "Complete an epic.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const ctx = createEventCommandContext(args, { requireSlice: false });

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:epic:complete" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "epic-completed",
				payload: {},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${ctx.epicName}` }, args);
			} else if (!args.quiet) {
				output(`Completed epic ${pc.bold(ctx.epicName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
