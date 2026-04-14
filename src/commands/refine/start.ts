import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createRefineCommandContext, detectCurrentRound, refineArgs } from "./_shared.js";

/**
 * `gp refine:start` — start a new refinement round for an artifact.
 *
 * Auto-increments the round number from the latest `refinement-round-started` event.
 * Emits `refinement-round-started` with domain `"refinement"`.
 */
export const refineStartCommand = defineCommand({
	meta: {
		name: "refine:start",
		description: "Start a new refinement round for an artifact",
	},
	args: {
		...globalArgs,
		...refineArgs,
	},
	setup() {},
	async run({ args }) {
		const ctx = createRefineCommandContext(args);
		const currentRound = await detectCurrentRound(ctx.eventsPath, ctx.artifactType);
		const nextRound = currentRound + 1;

		const payload = {
			artifactType: ctx.artifactType,
			scopeRef: ctx.scopeRef,
			round: nextRound,
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.eventsPath,
				scope: ctx.scope,
				scopeRef: ctx.scopeRef,
				actor: { kind: "cli", id: "gp:refine:start" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "refinement",
				type: "refinement-round-started",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `${ctx.scopeRef}:${ctx.artifactType}:round-${nextRound}`,
					},
					args,
				);
			} else if (!args.quiet) {
				output(
					`Started refinement round ${nextRound} for ${ctx.artifactType} in ${pc.bold(ctx.scopeRef)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
