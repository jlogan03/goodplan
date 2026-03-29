import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan task:drop --task <name> --reason <text>` — drop a task.
 *
 * Uses flags (not stdin) because all fields are simple scalars.
 * Precondition: task exists and is in 'open' status.
 * Transition: open -> dropped
 */
export const taskDropCommand = defineCommand({
	meta: {
		name: "task:drop",
		description:
			"Drop a task with a reason. Requires --task and --reason flags. Transition: open -> dropped.",
	},
	args: {
		...globalArgs,
		task: {
			type: "string",
			description: "Task name",
			required: true,
		},
		reason: {
			type: "string",
			description: "Reason for dropping the task",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const result = await begin(
			projectDir,
			"drop-task",
			{ type: "task", name: args.task },
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
