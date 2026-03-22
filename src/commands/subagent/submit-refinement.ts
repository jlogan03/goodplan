import { defineCommand } from "citty";
import pc from "picocolors";
import { submit } from "../../core/rpc/submit.js";
import { resolveProjectDir } from "../../core/data/project.js";
import type { Target, WorkflowOptions } from "../../core/rpc/types.js";
import { submitRefinementInputSchema } from "../../schemas/commands/submit.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan submit-refinement --slice <name>|--quest <name> [--override]` — complete refinement round.
 *
 * Stdin: { "scores": { "<criterion>": <number>, ... } }
 * Triggers COMPLETE_REFINEMENT_ROUND or COMPLETE_QUEST_REFINEMENT_ROUND.
 * --override bypasses score threshold circuit breaker.
 */
export const submitRefinementCommand = defineCommand({
	meta: {
		name: "submit-refinement",
		description: "Submit refinement scores. Stdin: {scores}. Requires --slice or --quest. --override bypasses threshold.",
	},
	args: {
		...globalArgs,
		slice: {
			type: "string",
			description: "Slice name (mutually exclusive with --quest)",
		},
		quest: {
			type: "string",
			description: "Quest name (mutually exclusive with --slice)",
		},
		override: {
			type: "boolean",
			description: "Bypass score threshold circuit breaker",
			default: false,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(submitRefinementInputSchema, args, stdin);

		const target: Target = input.slice !== undefined
			? { type: "slice", name: input.slice }
			: { type: "quest", name: input.quest! };

		const options: WorkflowOptions = args.override ? { override: true } : {};
		const projectDir = resolveProjectDir();
		const result = submit(projectDir, "refinement", target, { phase: "refinement", scores: input.scores }, options);

		if (args.json) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)} (advanced: ${result.advanced})`, args);
		}
	},
});
