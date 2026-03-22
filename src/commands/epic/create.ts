import { defineCommand } from "citty";
import pc from "picocolors";
import { begin } from "../../core/rpc/begin.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { createEpicInputSchema } from "../../schemas/commands/epic.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan epic:create` — create a new epic.
 *
 * Stdin: { "name": "<name>", "goal": "<goal text>" }
 * Precondition: project initialized.
 * Transition: none -> created
 */
export const epicCreateCommand = defineCommand({
	meta: {
		name: "epic:create",
		description: "Create a new epic. Stdin: {name, goal}. Transitions to 'created' status.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(createEpicInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await begin(projectDir, "create", { type: "epic", name: input.name }, {
			name: input.name,
			goal: input.goal,
		});

		if (args.json) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
