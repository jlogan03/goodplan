import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createSideQuestCommandContext, sideQuestArgs } from "./_shared.js";

/**
 * `gp side-quest:plan-shape-approve` — approve the plan shape for a side-quest.
 *
 * Emits `side-quest-plan-shape-approved` event.
 */
export const sideQuestPlanShapeApproveCommand = defineCommand({
	meta: {
		name: "side-quest:plan-shape-approve",
		description: "Approve the plan shape for a side-quest.",
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
				actor: { kind: "cli", id: "gp:side-quest:plan-shape-approve" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "side-quest-plan-shape-approved",
				payload: {},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{ ok: true, event: result.event.id, entity: `side-quest:${ctx.sideQuestName}` },
					args,
				);
			} else if (!args.quiet) {
				output(`Approved plan shape for side-quest ${pc.bold(ctx.sideQuestName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
