import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan quest:plan --quest <name>` — begin planning phase for a quest.
 *
 * Precondition: quest in 'created' status.
 * Transition: created -> planning
 */
export const questPlanCommand = defineCommand({
	meta: {
		name: "quest:plan",
		description:
			"Begin planning phase for a quest. Requires --quest. Precondition: 'created' status. Transition: -> planning.",
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
		const result = await begin(projectDir, "plan", { type: "quest", name: args.quest }, {});

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
