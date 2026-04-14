import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:abandon --slice <name> --epic <name> --reason <text>` (v2)
 *
 * Appends a `slice-abandoned` event (domain: entity-lifecycle)
 * to the epic-scope events.jsonl.
 */
export const sliceAbandonCommand = defineCommand({
	meta: {
		name: "slice:abandon",
		description: "Abandon a slice with a reason. Requires --slice, --epic, and --reason flags.",
	},
	args: {
		...globalArgs,
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		reason: {
			type: "string",
			description: "Reason for abandoning the slice",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const ctx = createEventCommandContext(args, { requireSlice: true });

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:slice:abandon" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "slice-abandoned",
				payload: {
					sliceRef: ctx.sliceName,
					reason: args.reason as string,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `slice:${ctx.sliceName}` }, args);
			} else if (!args.quiet) {
				output(
					`Abandoned slice ${pc.bold(ctx.sliceName)} in epic ${pc.bold(ctx.epicName)}: ${args.reason}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
