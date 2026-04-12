import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { submit } from "../../core/rpc/submit.js";
import { submitSlicesInputSchema } from "../../schemas/commands/submit.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp submit-slices --epic <name>` — complete slicing phase.
 *
 * Called by sub-agent after writing slice definitions to filesystem.
 * No stdin content required (content is already on disk).
 * Triggers COMPLETE_SLICING.
 */
export const submitSlicesCommand = defineCommand({
	meta: {
		name: "submit-slices",
		description:
			"Submit slicing completion. Requires --epic. No stdin needed. Triggers COMPLETE_SLICING.",
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
		const stdin = await readStdin();
		const input = validateInput(submitSlicesInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = submit(
			projectDir,
			"slices",
			{ type: "epic", name: input.epic },
			{ phase: "slices" },
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
