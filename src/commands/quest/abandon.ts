import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan quest:abandon --quest <name> --reason <text>` — abandon a quest.
 *
 * Uses flags (not stdin) because reason is a simple scalar.
 * Precondition: quest exists and is not already completed/abandoned.
 * Transition: -> abandoned
 */
export const questAbandonCommand = defineCommand({
	meta: {
		name: "quest:abandon",
		description:
			"Abandon a quest with a reason. Requires --quest and --reason flags. Transition: -> abandoned.",
	},
	args: {
		...globalArgs,
		quest: {
			type: "string",
			description: "Quest name",
			required: true,
		},
		reason: {
			type: "string",
			description: "Reason for abandoning the quest",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const result = await begin(
			projectDir,
			"abandon",
			{ type: "quest", name: args.quest },
			{
				reason: args.reason,
			},
		);

		if (args.json) {
			output(result, args);
		} else if (!args.quiet) {
			output(
				`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.yellow(result.newStatus)}`,
				args,
			);
		}
	},
});
