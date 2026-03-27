import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan slice:implement --slice <name>` — begin implementation for a slice.
 *
 * Precondition: slice in 'plan-refined' status.
 * Transition: plan-refined -> implementing
 */
export const sliceImplementCommand = defineCommand({
	meta: {
		name: "slice:implement",
		description:
			"Begin implementation for a slice. Requires --slice. Precondition: 'plan-refined' status. Transition: -> implementing.",
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
		// @ts-expect-error — slice 02: Target needs epic field
		const result = await begin(projectDir, "implement", { type: "slice", name: args.slice }, {});

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
