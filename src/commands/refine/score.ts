import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { refineScoreInputSchema } from "../../schemas/commands/refine.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createRefineCommandContext, detectCurrentRound, refineArgs } from "./_shared.js";

/**
 * `gp refine:score` — record a reviewer's score for the current refinement round.
 *
 * Accepts stdin JSON with `{ dimensions, findings }`.
 * Emits `reviewer-scored` with domain `"refinement"`.
 */
export const refineScoreCommand = defineCommand({
	meta: {
		name: "refine:score",
		description: "Record a reviewer score for the current refinement round",
	},
	args: {
		...globalArgs,
		...refineArgs,
		reviewer: {
			type: "string" as const,
			description: "Reviewer ID",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = refineScoreInputSchema.safeParse(stdin);

		if (!parsed.success) {
			const errorOutput = {
				ok: false,
				error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

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

		const reviewerId = args.reviewer as string;
		const payload = {
			artifactType: ctx.artifactType,
			scopeRef: ctx.scopeRef,
			round: currentRound,
			reviewerId,
			dimensions: parsed.data.dimensions,
			findings: parsed.data.findings,
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.eventsPath,
				scope: ctx.scope,
				scopeRef: ctx.scopeRef,
				actor: { kind: "cli", id: "gp:refine:score" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "refinement",
				type: "reviewer-scored",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `${ctx.scopeRef}:${ctx.artifactType}:round-${currentRound}:${reviewerId}`,
					},
					args,
				);
			} else if (!args.quiet) {
				output(`Recorded score from ${pc.bold(reviewerId)} for round ${currentRound}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
