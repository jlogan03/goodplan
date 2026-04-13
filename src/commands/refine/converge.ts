import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import type { ReviewerPayload } from "../../schemas/trust/reviewer-payload.js";
import { evaluateConvergence } from "../../trust/convergence/evaluator.js";
import type { ScoredEvent } from "../../trust/convergence/evaluator.js";
import { DEFAULT_PLAN_CONFIG } from "../../trust/convergence/types.js";
import type { RelevanceWeight } from "../../trust/convergence/types.js";
import { output } from "../../util/output.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createRefineCommandContext, detectCurrentRound, refineArgs } from "./_shared.js";

/**
 * `gp refine:converge` — mark the current refinement round as converged.
 *
 * Runs evaluateConvergence() to populate the convergence result, then emits
 * `refinement-converged` with the result in the payload.
 */
export const refineConvergeCommand = defineCommand({
	meta: {
		name: "refine:converge",
		description: "Mark the current refinement round as converged",
	},
	args: {
		...globalArgs,
		...refineArgs,
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

		// Replay reviewer-scored events to build convergence result
		const { events } = await replayEvents({
			eventsPath: ctx.eventsPath,
			filter: {
				domain: "refinement",
				type: "reviewer-scored",
			},
		});

		const scoredEvents: ScoredEvent[] = [];
		for (const event of events) {
			const payload = event.payload as {
				artifactType?: string;
				round?: number;
			};
			if (payload.artifactType === ctx.artifactType && payload.round === currentRound) {
				scoredEvents.push({
					round: payload.round,
					payload: payload as unknown as ReviewerPayload,
				});
			}
		}

		// Build rubric from dimensions
		const uniqueDimensions = new Set<string>();
		for (const se of scoredEvents) {
			for (const dim of se.payload.dimensions) {
				uniqueDimensions.add(dim.name);
			}
		}
		const rubric = {
			dimensions: [...uniqueDimensions].map((name) => ({ name, threshold: 7 })),
		};

		const relevanceWeights = new Map<string, RelevanceWeight>();
		for (const se of scoredEvents) {
			if (!relevanceWeights.has(se.payload.reviewerId)) {
				relevanceWeights.set(se.payload.reviewerId, "medium");
			}
		}

		const convergenceResult = evaluateConvergence(
			scoredEvents,
			rubric,
			relevanceWeights,
			DEFAULT_PLAN_CONFIG,
		);

		const payload = {
			artifactType: ctx.artifactType,
			scopeRef: ctx.scopeRef,
			round: currentRound,
			convergenceResult,
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.eventsPath,
				scope: ctx.scope,
				scopeRef: ctx.scopeRef,
				actor: { kind: "cli", id: "gp:refine:converge" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "refinement",
				type: "refinement-converged",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `${ctx.scopeRef}:${ctx.artifactType}:round-${currentRound}`,
						convergenceResult,
					},
					args,
				);
			} else if (!args.quiet) {
				output(
					`Marked convergence for round ${currentRound}: ${pc.bold(convergenceResult.state)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
