import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { refineSynthesizeInputSchema } from "../../schemas/commands/refine.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { createRefineCommandContext, detectCurrentRound, refineArgs } from "./_shared.js";

/**
 * `gp refine:synthesize` — record synthesis of reviewer feedback.
 *
 * Accepts stdin JSON with `{ synthesis: ContentRef }`.
 * Emits `refinement-synthesized` with domain `"refinement"`.
 */
export const refineSynthesizeCommand = defineCommand({
	meta: {
		name: "refine:synthesize",
		description: "Record synthesis of reviewer feedback for the current round",
	},
	args: {
		...globalArgs,
		...refineArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = refineSynthesizeInputSchema.safeParse(stdin);

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

		const payload = {
			artifactType: ctx.artifactType,
			scopeRef: ctx.scopeRef,
			round: currentRound,
			synthesis: parsed.data.synthesis,
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.eventsPath,
				scope: ctx.scope,
				scopeRef: ctx.scopeRef,
				actor: { kind: "cli", id: "gp:refine:synthesize" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "refinement",
				type: "refinement-synthesized",
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
				output(`Recorded synthesis for round ${currentRound} in ${pc.bold(ctx.scopeRef)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
