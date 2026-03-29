import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp quest:implement --quest <name>` — begin implementation for a quest.
 *
 * Precondition: quest in 'plan-refined' status.
 * Transition: plan-refined -> implementing
 */
export const questImplementCommand = defineCommand({
	meta: {
		name: "quest:implement",
		description:
			"Begin implementation for a quest. Requires --quest. Precondition: 'plan-refined' status. Transition: -> implementing.",
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
		const result = await begin(
			projectDir,
			"implement",
			{ type: "quest", name: args.quest },
			{},
		);

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
