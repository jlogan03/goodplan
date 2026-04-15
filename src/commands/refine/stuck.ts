import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import type { ReviewerPayload } from "../../schemas/trust/reviewer-payload.js";
import { checkCircuitBreaker } from "../../trust/convergence/circuit-breaker.js";
import type { ScoredEvent } from "../../trust/convergence/evaluator.js";
import { DEFAULT_PLAN_CONFIG } from "../../trust/convergence/types.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createRefineCommandContext, detectCurrentRound, refineArgs } from "./_shared.js";

/**
 * `gp refine:stuck` — trigger the circuit breaker for the current refinement.
 *
 * Calls checkCircuitBreaker() to detect conditions. If none found, accepts
 * an explicit reason via --reason flag or stdin `{ reason: "..." }`.
 * Emits `refinement-circuit-breaker-tripped`.
 */
export const refineStuckCommand = defineCommand({
	meta: {
		name: "refine:stuck",
		description: "Trigger circuit breaker for the current refinement round",
	},
	args: {
		...globalArgs,
		...refineArgs,
		reason: {
			type: "string" as const,
			description: "Explicit reason for circuit breaker (used if no automatic condition found)",
			required: false,
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

		// Replay scored events to check circuit breaker
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
			if (payload.artifactType === ctx.artifactType) {
				scoredEvents.push({
					round: payload.round as number,
					payload: payload as unknown as ReviewerPayload,
				});
			}
		}

		const cbResult = checkCircuitBreaker(scoredEvents, DEFAULT_PLAN_CONFIG);

		// Determine reason: automatic detection or explicit
		let reason: unknown;
		if (cbResult.triggered) {
			reason = cbResult.reason;
		} else {
			// No automatic condition — check for explicit reason
			const explicitReason = args.reason as string | undefined;
			if (explicitReason !== undefined && explicitReason !== "") {
				reason = { type: "round-budget-exceeded", round: currentRound, maxRounds: currentRound };
			} else {
				// Try stdin
				const stdin = await readStdin();
				const stdinReason = stdin.reason as string | undefined;
				if (stdinReason !== undefined && stdinReason !== "") {
					reason = {
						type: "round-budget-exceeded",
						round: currentRound,
						maxRounds: currentRound,
					};
				} else {
					const errorOutput = {
						ok: false,
						error:
							"No circuit breaker condition detected and no explicit reason provided. Use --reason or stdin.",
						code: "PRECONDITION_FAILED",
					};
					if (args.json || args.query) {
						output(errorOutput, args);
					} else {
						process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
					}
					process.exit(1);
				}
			}
		}

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
				actor: { kind: "cli", id: "gp:refine:stuck" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "refinement",
				type: "refinement-circuit-breaker-tripped",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `${ctx.scopeRef}:${ctx.artifactType}:round-${currentRound}`,
						reason,
					},
					args,
				);
			} else if (!args.quiet) {
				output(
					`Circuit breaker tripped for round ${currentRound} in ${pc.bold(ctx.scopeRef)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
