import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:abandon --epic <name> --reason <text>` (v2) — abandon an epic via event engine.
 *
 * Appends an `epic-abandoned` event to the epic's scope event log.
 */
export const epicAbandonCommand = defineCommand({
	meta: {
		name: "epic:abandon",
		description: "Abandon an epic with a reason. Requires --epic and --reason flags.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		reason: {
			type: "string",
			description: "Reason for abandoning the epic",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const ctx = createEventCommandContext(args, { requireSlice: false });
		const reason = args.reason as string;

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:epic:abandon" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "epic-abandoned",
				payload: { reason },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${ctx.epicName}` }, args);
			} else if (!args.quiet) {
				output(`Abandoned epic ${pc.bold(ctx.epicName)}: ${reason}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
