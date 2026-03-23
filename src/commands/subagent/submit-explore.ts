import { defineCommand } from "citty";
import pc from "picocolors";
import { submit } from "../../core/rpc/submit.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { submitExploreInputSchema } from "../../schemas/commands/submit.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan submit-explore --epic <name>` — complete exploration phase.
 *
 * Called by sub-agent after writing research/brainstorm to filesystem.
 * No stdin content required (content is already on disk).
 * Triggers COMPLETE_EXPLORE.
 */
export const submitExploreCommand = defineCommand({
	meta: {
		name: "submit-explore",
		description: "Submit exploration completion. Requires --epic. No stdin needed. Triggers COMPLETE_EXPLORE.",
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
		const input = validateInput(submitExploreInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = submit(projectDir, "explore", { type: "epic", name: input.epic }, { phase: "explore" });

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
