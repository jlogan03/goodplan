import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { taskCreateInputSchema } from "../../schemas/commands/task.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp task:create` — create a new task.
 *
 * Stdin: { "name": "<slug>", "title": "<title>", "description?": "<text>", "context?": {...} }
 * Precondition: project initialized.
 * Transition: (none) -> open
 */
export const taskCreateCommand = defineCommand({
	meta: {
		name: "task:create",
		description:
			"Create a new task. Stdin: {name, title, description?, context?}. Transitions to 'open' status.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(taskCreateInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await begin(
			projectDir,
			"create-task",
			{ type: "task", name: input.name },
			{
				name: input.name,
				title: input.title,
				...(input.description ? { description: input.description } : {}),
				...(input.context ? { context: input.context } : {}),
			},
		);

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
