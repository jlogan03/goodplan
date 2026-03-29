import { defineCommand } from "citty";
import pc from "picocolors";
import { begin } from "../../core/rpc/begin.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { addVerificationInputSchema } from "../../schemas/commands/epic.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:add-verification --epic <name>` — add a verification criterion.
 *
 * Stdin: { "verification": { "description": "...", "status": "pending", "addedDuring": "...", "modifiedDuring": null } }
 * Precondition: epic exists and is not completed/abandoned.
 * Adds the verification to the epic's verifications array.
 */
export const epicAddVerificationCommand = defineCommand({
	meta: {
		name: "epic:add-verification",
		description: "Add a verification criterion to an epic via stdin. Requires --epic. Stdin: {verification: {description, status, addedDuring, modifiedDuring}}.",
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
		const input = validateInput(addVerificationInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await begin(
			projectDir,
			"add-verification",
			{ type: "epic", name: input.epic },
			{ verification: input.verification },
		);

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: verification added`, args);
		}
	},
});
