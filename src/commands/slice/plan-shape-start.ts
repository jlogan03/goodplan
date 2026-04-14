import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { findLatestPlanRef } from "./_plan-helpers.js";

/**
 * `gp slice:plan-shape-start --epic <name> --slice <name>` (v2)
 *
 * Emits `plan-shape-checkpoint-reached` with the current plan ContentRef.
 */
export const slicePlanShapeStartCommand = defineCommand({
	meta: {
		name: "slice:plan-shape-start",
		description: "Start the plan shape checkpoint for a slice.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const ctx = createEventCommandContext(args, { requireSlice: true });

		// Find the latest plan ContentRef for this slice
		const { events } = await replayEvents({ eventsPath: ctx.epicEventsPath });
		const planRef = findLatestPlanRef(events, ctx.sliceName);

		if (planRef === undefined) {
			const errorOutput = {
				ok: false,
				error: `No plan found for slice "${ctx.sliceName}"`,
				code: "PRECONDITION_FAILED",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:slice:plan-shape-start" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "plan-shape-checkpoint-reached",
				payload: {
					sliceRef: ctx.sliceName,
					plan: planRef,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `slice:${ctx.sliceName}` }, args);
			} else if (!args.quiet) {
				output(
					`Plan shape checkpoint reached for slice ${pc.bold(ctx.sliceName)} in epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
