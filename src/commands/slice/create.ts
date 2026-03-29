import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { createSliceInputSchema } from "../../schemas/commands/slice.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:create --epic <name>` — create a new slice.
 *
 * Stdin: { "name": "<name>", "goal": "<goal text>" }
 * Flag: --epic <name> (required per INV-004)
 * Precondition: project initialized, epic exists and is activated.
 * Transition: none -> created
 */
export const sliceCreateCommand = defineCommand({
	meta: {
		name: "slice:create",
		description:
			"Create a new slice. Stdin: {name, goal}. Requires --epic. Transitions to 'created' status.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name (required)",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(createSliceInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await begin(
			projectDir,
			"create",
			{ type: "slice", name: input.name, epic: input.epic },
			{
				name: input.name,
				goal: input.goal,
				epic: input.epic,
			},
		);

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(
				`${pc.bold(result.entity)} (epic: ${input.epic}): ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`,
				args,
			);
		}
	},
});
