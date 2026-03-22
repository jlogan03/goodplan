import { defineCommand } from "citty";
import pc from "picocolors";
import { begin } from "../../core/rpc/begin.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan epic:refine-slices --epic <name>` — begin slice refinement.
 *
 * Precondition: epic in 'slices-defined' status.
 * Transition: slices-defined -> refining-slices
 */
export const epicRefineSlicesCommand = defineCommand({
	meta: {
		name: "epic:refine-slices",
		description: "Begin slice refinement phase. Precondition: 'slices-defined'. Transition: slices-defined -> refining-slices.",
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
		const result = await begin(projectDir, "refine-slices", { type: "epic", name: args.epic }, {});

		if (args.json) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
