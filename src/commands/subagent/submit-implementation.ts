import { defineCommand } from "citty";
import pc from "picocolors";
import { submit } from "../../core/rpc/submit.js";
import { resolveProjectDir } from "../../core/data/project.js";
import type { Target } from "../../core/rpc/types.js";
import { submitImplementationInputSchema } from "../../schemas/commands/submit.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";
import { requireActiveEpic } from "../slice/utils.js";

/**
 * `goodplan submit-implementation --slice <name>|--quest <name>` — complete implementation phase.
 *
 * Called by sub-agent after writing implementation to filesystem.
 * No stdin content required (code is already on disk).
 * Triggers COMPLETE_IMPLEMENTATION or COMPLETE_QUEST_IMPLEMENTATION.
 */
export const submitImplementationCommand = defineCommand({
	meta: {
		name: "submit-implementation",
		description: "Submit implementation completion. Requires --slice or --quest. No stdin needed. Triggers COMPLETE_IMPLEMENTATION.",
	},
	args: {
		...globalArgs,
		slice: {
			type: "string",
			description: "Slice name (mutually exclusive with --quest)",
		},
		quest: {
			type: "string",
			description: "Quest name (mutually exclusive with --slice)",
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(submitImplementationInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const target: Target = input.slice !== undefined
			? { type: "slice", name: input.slice, epic: requireActiveEpic(projectDir) }
			: { type: "quest", name: input.quest! };

		const result = submit(projectDir, "implementation", target, { phase: "implementation" });

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
