import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";
import { requireActiveEpic } from "./utils.js";

/**
 * `gp slice:abandon --slice <name> --reason <text>` — abandon a slice.
 *
 * Uses flags (not stdin) because reason is a simple scalar.
 * Precondition: slice exists and is not already completed/abandoned.
 * Transition: -> abandoned
 */
export const sliceAbandonCommand = defineCommand({
	meta: {
		name: "slice:abandon",
		description:
			"Abandon a slice with a reason. Requires --slice and --reason flags. Transition: -> abandoned.",
	},
	args: {
		...globalArgs,
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
		reason: {
			type: "string",
			description: "Reason for abandoning the slice",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const epic = requireActiveEpic(projectDir);
		const result = await begin(
			projectDir,
			"abandon",
			{ type: "slice", name: args.slice, epic },
			{
				reason: args.reason,
			},
		);

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(
				`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.yellow(result.newStatus)}`,
				args,
			);
		}
	},
});
