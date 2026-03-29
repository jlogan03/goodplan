import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";
import { requireActiveEpic } from "./utils.js";

/**
 * `gp slice:refine-plan --slice <name>` — begin plan refinement for a slice.
 *
 * Precondition: slice in 'plan-created' status.
 * Transition: plan-created -> refining
 */
export const sliceRefinePlanCommand = defineCommand({
	meta: {
		name: "slice:refine-plan",
		description:
			"Begin plan refinement for a slice. Requires --slice. Precondition: 'plan-created' status. Transition: -> refining.",
	},
	args: {
		...globalArgs,
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const epic = requireActiveEpic(projectDir);
		const result = await begin(projectDir, "refine-plan", { type: "slice", name: args.slice, epic }, {});

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
