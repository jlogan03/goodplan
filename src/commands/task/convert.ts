import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan task:convert --task <name> --to quest|epic [--name <override>] [--goal <override>]`
 *
 * Converts a task into a quest or epic. Uses all-flags pattern since all fields are simple scalars.
 * Auto-derives quest/epic name from task slug, goal from task title + description if not overridden.
 * Precondition: task exists and is in 'open' status.
 * Transition: open -> converted
 */
export const taskConvertCommand = defineCommand({
	meta: {
		name: "task:convert",
		description:
			"Convert a task to a quest or epic. Requires --task and --to flags. Optional --name and --goal overrides. Transition: open -> converted.",
	},
	args: {
		...globalArgs,
		task: {
			type: "string",
			description: "Task name",
			required: true,
		},
		to: {
			type: "string",
			description: 'Target entity type: "quest" or "epic"',
			required: true,
		},
		name: {
			type: "string",
			description: "Override name for the created quest/epic (defaults to task name)",
		},
		goal: {
			type: "string",
			description:
				"Override goal for the created quest/epic (defaults to task title + description)",
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const result = await begin(
			projectDir,
			"convert-task",
			{ type: "task", name: args.task },
			{
				to: args.to as "quest" | "epic",
				...(args.name ? { name: args.name } : {}),
				...(args.goal ? { goal: args.goal } : {}),
			},
		);

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(
				`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`,
				args,
			);
			const convertedName = args.name ?? args.task;
			output(`Created ${args.to}: ${convertedName}`, args);
		}
	},
});
