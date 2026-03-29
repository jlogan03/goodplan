import { defineCommand } from "citty";
import pc from "picocolors";
import { begin } from "../../core/rpc/begin.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { updateVerificationInputSchema } from "../../schemas/commands/epic.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:update-verification --epic <name> --index <n>` — update a verification criterion.
 *
 * Stdin: { "verification": { "description": "...", "status": "passed", "addedDuring": "...", "modifiedDuring": "..." } }
 * Flag: --index specifies which verification to update (0-based).
 * Precondition: epic exists, index is within bounds.
 */
export const epicUpdateVerificationCommand = defineCommand({
	meta: {
		name: "epic:update-verification",
		description: "Update a verification criterion by index via stdin. Requires --epic and --index. Stdin: {verification: {description, status, addedDuring, modifiedDuring}}.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		index: {
			type: "string",
			description: "Verification index (0-based)",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(updateVerificationInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await begin(
			projectDir,
			"update-verification",
			{ type: "epic", name: input.epic },
			{ index: input.index, verification: input.verification },
		);

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: verification[${input.index}] updated`, args);
		}
	},
});
