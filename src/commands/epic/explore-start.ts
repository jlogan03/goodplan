import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { buildEpicContextBundle } from "./context-helper.js";

/**
 * `gp epic:explore-start --epic <name>` (v2) — start an exploration cycle.
 *
 * Emits `exploration-cycle-started` with domain "exploration".
 * Accepts optional stdin JSON `{ cycleNumber }` (defaults to 1).
 */
export const epicExploreStartCommand = defineCommand({
	meta: {
		name: "epic:explore-start",
		description: "Start an exploration cycle for an epic.",
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
		const stdin = await readStdin();
		const cycleNumber =
			typeof stdin.cycleNumber === "number" && stdin.cycleNumber > 0 ? stdin.cycleNumber : 1;

		const ctx = createEventCommandContext(args, { requireSlice: false });

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:epic:explore-start" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "exploration",
				type: "exploration-cycle-started",
				payload: { cycleNumber },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				const { events: allEvents } = await replayEvents({ eventsPath: ctx.epicEventsPath });
				const contextBundle = buildEpicContextBundle(allEvents, "P1", ctx.epicName);
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `epic:${ctx.epicName}`,
						cycleNumber,
						...(contextBundle !== undefined ? { contextBundle } : {}),
					},
					args,
				);
			} else if (!args.quiet) {
				output(`Started exploration cycle ${cycleNumber} for epic ${pc.bold(ctx.epicName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
