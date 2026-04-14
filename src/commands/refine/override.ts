import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createRefineCommandContext, detectCurrentRound, refineArgs } from "./_shared.js";

/**
 * `gp refine:override` — override convergence threshold with explicit reason.
 *
 * Emits `convergence-overridden` with the reason string.
 * Used when a user accepts an artifact despite not meeting convergence thresholds.
 */
export const refineOverrideCommand = defineCommand({
	meta: {
		name: "refine:override",
		description: "Override convergence threshold with explicit reason",
	},
	args: {
		...globalArgs,
		...refineArgs,
		reason: {
			type: "string" as const,
			description: "Reason for overriding convergence",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const ctx = createRefineCommandContext(args);
		const currentRound = await detectCurrentRound(ctx.eventsPath, ctx.artifactType);

		if (currentRound === 0) {
			const errorOutput = {
				ok: false,
				error: "No refinement round started. Run `gp refine:start` first.",
				code: "PRECONDITION_FAILED",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const reason = args.reason as string;
		const payload = {
			artifactType: ctx.artifactType,
			scopeRef: ctx.scopeRef,
			round: currentRound,
			reason,
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.eventsPath,
				scope: ctx.scope,
				scopeRef: ctx.scopeRef,
				actor: { kind: "cli", id: "gp:refine:override" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "refinement",
				type: "convergence-overridden",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `${ctx.scopeRef}:${ctx.artifactType}:round-${currentRound}`,
					},
					args,
				);
			} else if (!args.quiet) {
				output(`Convergence overridden for round ${currentRound}: ${pc.italic(reason)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
