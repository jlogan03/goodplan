import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { createQuestInputSchema } from "../../schemas/commands/quest.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan quest:create` — create a new quest.
 *
 * Stdin: { "name": "<name>", "goal": "<goal text>" }
 * No --epic flag (quests are project-scoped).
 * Precondition: project initialized.
 * Transition: none -> created
 */
export const questCreateCommand = defineCommand({
	meta: {
		name: "quest:create",
		description:
			"Create a new quest. Stdin: {name, goal}. No target flag needed. Transitions to 'created' status.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(createQuestInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await begin(
			projectDir,
			"create",
			{ type: "quest", name: input.name },
			{
				name: input.name,
				goal: input.goal,
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
