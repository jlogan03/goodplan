import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { buildEpicContextBundle } from "./context-helper.js";

/**
 * `gp epic:architecture-shape-start --epic <name>` (v2) — start architecture shape checkpoint.
 *
 * Emits `architecture-shape-checkpoint-reached` with domain "entity-lifecycle".
 */
export const epicArchitectureShapeStartCommand = defineCommand({
	meta: {
		name: "epic:architecture-shape-start",
		description: "Start the architecture shape checkpoint for an epic.",
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
				actor: { kind: "cli", id: "gp:epic:architecture-shape-start" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "architecture-shape-checkpoint-reached",
				payload: {},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				const { events: allEvents } = await replayEvents({ eventsPath: ctx.epicEventsPath });
				const contextBundle = buildEpicContextBundle(allEvents, "P3", ctx.epicName);
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `epic:${ctx.epicName}`,
						...(contextBundle !== undefined ? { contextBundle } : {}),
					},
					args,
				);
			} else if (!args.quiet) {
				output(`Architecture shape checkpoint reached for epic ${pc.bold(ctx.epicName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
