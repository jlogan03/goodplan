import { defineCommand } from "citty";
import pc from "picocolors";
import { begin } from "../../core/rpc/begin.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan epic:activate --epic <name>` — activate an epic.
 *
 * Precondition: epic in 'slices-defined' or 'slices-refined' status, has verifications.
 * Transition: -> activated
 */
export const epicActivateCommand = defineCommand({
	meta: {
		name: "epic:activate",
		description: "Activate an epic for implementation. Requires verifications. Precondition: 'slices-defined' or 'slices-refined'. Transition: -> activated.",
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
		const result = await begin(projectDir, "activate", { type: "epic", name: args.epic }, {});

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
