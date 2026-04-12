import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { submit } from "../../core/rpc/submit.js";
import type { Target } from "../../core/rpc/types.js";
import { submitPlanInputSchema } from "../../schemas/commands/submit.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";
import { requireActiveEpic } from "../slice/utils.js";

/**
 * `gp submit-plan --slice <name>|--quest <name>` — complete plan phase.
 *
 * Called by sub-agent after writing plan to filesystem.
 * No stdin content required (plan is already on disk).
 * Triggers COMPLETE_PLAN or COMPLETE_QUEST_PLAN.
 */
export const submitPlanCommand = defineCommand({
	meta: {
		name: "submit-plan",
		description:
			"Submit plan completion. Requires --slice or --quest. No stdin needed. Triggers COMPLETE_PLAN.",
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
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(submitPlanInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const target: Target =
			input.slice !== undefined
				? { type: "slice", name: input.slice, epic: requireActiveEpic(projectDir) }
				: { type: "quest", name: input.quest! };

		const result = submit(projectDir, "plan", target, { phase: "plan" });

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(
				`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`,
				args,
			);
		}
	},
});
