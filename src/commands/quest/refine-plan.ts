import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp quest:refine-plan --quest <name>` — begin plan refinement for a quest.
 *
 * Precondition: quest in 'plan-created' status.
 * Transition: plan-created -> refining
 */
export const questRefinePlanCommand = defineCommand({
	meta: {
		name: "quest:refine-plan",
		description:
			"Begin plan refinement for a quest. Requires --quest. Precondition: 'plan-created' status. Transition: -> refining.",
	},
	args: {
		...globalArgs,
		quest: {
			type: "string",
			description: "Quest name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const result = await begin(projectDir, "refine-plan", { type: "quest", name: args.quest }, {});

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
