import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:define-slices --epic <name>` — begin slice definition.
 *
 * Precondition: epic in 'architecture-defined' or 'architecture-refined' status.
 * Transition: -> defining-slices
 */
export const epicDefineSlicesCommand = defineCommand({
	meta: {
		name: "epic:define-slices",
		description:
			"Begin slice definition phase. Precondition: 'architecture-defined' or 'architecture-refined'. Transition: -> defining-slices.",
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
		const result = await begin(projectDir, "define-slices", { type: "epic", name: args.epic }, {});

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
