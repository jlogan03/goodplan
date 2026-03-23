import { defineCommand } from "citty";
import pc from "picocolors";
import { begin } from "../../core/rpc/begin.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan epic:explore --epic <name>` — begin exploration phase.
 *
 * Precondition: epic in 'created' status.
 * Transition: created -> exploring
 */
export const epicExploreCommand = defineCommand({
	meta: {
		name: "epic:explore",
		description: "Begin exploration phase for an epic. Precondition: 'created'. Transition: created -> exploring.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const result = await begin(projectDir, "explore", { type: "epic", name: args.epic }, {});

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
