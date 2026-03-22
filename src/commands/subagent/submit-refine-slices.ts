import { defineCommand } from "citty";
import pc from "picocolors";
import { submit } from "../../core/rpc/submit.js";
import { resolveProjectDir } from "../../core/data/project.js";
import type { WorkflowOptions } from "../../core/rpc/types.js";
import { submitRefineSlicesInputSchema } from "../../schemas/commands/submit.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan submit-refine-slices --epic <name> [--override]` — complete slices refinement.
 *
 * Stdin: { "scores": { "<criterion>": <number>, ... } }
 * Triggers COMPLETE_REFINE_SLICES.
 * --override bypasses score threshold circuit breaker.
 */
export const submitRefineSlicesCommand = defineCommand({
	meta: {
		name: "submit-refine-slices",
		description: "Submit slices refinement scores. Stdin: {scores}. Requires --epic. --override bypasses threshold.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
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
		const input = validateInput(submitRefineSlicesInputSchema, args, stdin);

		const options: WorkflowOptions = args.override ? { override: true } : {};
		const projectDir = resolveProjectDir();
		const result = submit(
			projectDir,
			"refine-slices",
			{ type: "epic", name: input.epic },
			{ phase: "refine-slices", scores: input.scores },
			options,
		);

		if (args.json) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)} (advanced: ${result.advanced})`, args);
		}
	},
});
