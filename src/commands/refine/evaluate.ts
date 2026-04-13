import { defineCommand } from "citty";
import pc from "picocolors";
import { replayEvents } from "../../engine/events/replay.js";
import type { ReviewerPayload } from "../../schemas/trust/reviewer-payload.js";
import { checkCircuitBreaker } from "../../trust/convergence/circuit-breaker.js";
import { evaluateConvergence } from "../../trust/convergence/evaluator.js";
import type { ScoredEvent } from "../../trust/convergence/evaluator.js";
import { DEFAULT_PLAN_CONFIG } from "../../trust/convergence/types.js";
import type { RelevanceWeight } from "../../trust/convergence/types.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";
import { createRefineCommandContext, detectCurrentRound, refineArgs } from "./_shared.js";

/**
 * `gp refine:evaluate` — evaluate convergence for the current refinement round.
 *
 * Read-only: replays scored events, calls evaluateConvergence() and checkCircuitBreaker().
 * Returns ConvergenceResult + circuit breaker check. Does NOT emit events.
 */
export const refineEvaluateCommand = defineCommand({
	meta: {
		name: "refine:evaluate",
		description: "Evaluate convergence state for the current refinement round (read-only)",
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

		// Replay all reviewer-scored events for this artifact
		const { events } = await replayEvents({
			eventsPath: ctx.eventsPath,
			filter: {
				domain: "refinement",
				type: "reviewer-scored",
			},
		});

		// Build scored events for the evaluator (all rounds for circuit breaker, current round for convergence)
		const scoredEvents: ScoredEvent[] = [];
		for (const event of events) {
			const payload = event.payload as {
				artifactType?: string;
				round?: number;
				reviewerId?: string;
				dimensions?: unknown[];
				findings?: unknown[];
			};
			if (payload.artifactType === ctx.artifactType) {
				scoredEvents.push({
					round: payload.round as number,
					payload: payload as unknown as ReviewerPayload,
				});
			}
		}

		// Default rubric: all dimensions with threshold 7
		const uniqueDimensions = new Set<string>();
		for (const se of scoredEvents) {
			for (const dim of se.payload.dimensions) {
				uniqueDimensions.add(dim.name);
			}
		}
		const rubric = {
			dimensions: [...uniqueDimensions].map((name) => ({ name, threshold: 7 })),
		};

		// Default relevance weights: all medium
		const relevanceWeights = new Map<string, RelevanceWeight>();
		for (const se of scoredEvents) {
			if (!relevanceWeights.has(se.payload.reviewerId)) {
				relevanceWeights.set(se.payload.reviewerId, "medium");
			}
		}

		const convergenceResult = evaluateConvergence(
			scoredEvents.filter((se) => se.round === currentRound),
			rubric,
			relevanceWeights,
			DEFAULT_PLAN_CONFIG,
		);

		const circuitBreakerResult = checkCircuitBreaker(scoredEvents, DEFAULT_PLAN_CONFIG);

		if (args.json || args.query) {
			output(
				{
					ok: true,
					convergence: convergenceResult,
					circuitBreaker: circuitBreakerResult,
					round: currentRound,
					artifactType: ctx.artifactType,
					scopeRef: ctx.scopeRef,
				},
				args,
			);
		} else if (!args.quiet) {
			output(
				`Round ${currentRound}: convergence=${pc.bold(convergenceResult.state)}, circuitBreaker=${circuitBreakerResult.triggered ? pc.red("TRIGGERED") : pc.green("OK")}`,
				args,
			);
		}
	},
});
