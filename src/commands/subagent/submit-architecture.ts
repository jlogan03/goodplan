import { defineCommand } from "citty";
import pc from "picocolors";
import { submit } from "../../core/rpc/submit.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { submitArchitectureInputSchema } from "../../schemas/commands/submit.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan submit-architecture --epic <name>` — complete architecture phase.
 *
 * Called by sub-agent after writing architecture to filesystem.
 * No stdin content required (content is already on disk).
 * Triggers COMPLETE_ARCHITECTURE.
 */
export const submitArchitectureCommand = defineCommand({
	meta: {
		name: "submit-architecture",
		description: "Submit architecture completion. Requires --epic. No stdin needed. Triggers COMPLETE_ARCHITECTURE.",
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
		const input = validateInput(submitArchitectureInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = submit(projectDir, "architecture", { type: "epic", name: input.epic }, { phase: "architecture" });

		if (args.json) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
