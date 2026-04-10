import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { complete } from "../../core/rpc/complete.js";
import { completeEpicInputSchema } from "../../schemas/commands/epic.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:complete --epic <name>` — complete an epic.
 *
 * Stdin: { "verificationResults": [{ "index": 0, "passed": true, "notes": "..." }, ...] }
 * Precondition: epic in 'activated' status, all verifications passed.
 * Transition: activated -> completed
 */
export const epicCompleteCommand = defineCommand({
	meta: {
		name: "epic:complete",
		description:
			"Complete an epic with verification results via stdin. Requires --epic. Stdin: {verificationResults: [{index, passed, notes}]}.",
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
		const input = validateInput(completeEpicInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await complete(
			projectDir,
			{ type: "epic", name: input.epic },
			{ type: "epic", verificationResults: input.verificationResults, learnings: input.learnings },
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
