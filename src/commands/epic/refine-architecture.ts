import { defineCommand } from "citty";
import pc from "picocolors";
import { begin } from "../../core/rpc/begin.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan epic:refine-architecture --epic <name>` — begin architecture refinement.
 *
 * Precondition: epic in 'architecture-defined' status.
 * Transition: architecture-defined -> refining-architecture
 */
export const epicRefineArchitectureCommand = defineCommand({
	meta: {
		name: "epic:refine-architecture",
		description: "Begin architecture refinement phase. Precondition: 'architecture-defined'. Transition: architecture-defined -> refining-architecture.",
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
		const result = await begin(projectDir, "refine-architecture", { type: "epic", name: args.epic }, {});

		if (args.json) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
