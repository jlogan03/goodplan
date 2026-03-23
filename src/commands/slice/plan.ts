import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan slice:plan --slice <name>` — begin planning phase for a slice.
 *
 * Precondition: slice in 'created' status, previous sibling slices completed/abandoned (sequential enforcement).
 * Transition: created -> planning
 */
export const slicePlanCommand = defineCommand({
	meta: {
		name: "slice:plan",
		description:
			"Begin planning phase for a slice. Requires --slice. Precondition: 'created' status + sequential order. Transition: -> planning.",
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
		const result = await begin(projectDir, "plan", { type: "slice", name: args.slice }, {});

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
