import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { createDecisionInputSchema } from "../../schemas/commands/decision.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan decision:create` — create a new decision.
 *
 * Stdin: { "id": "<id>", "domain": "<domain>", "title": "<title>", "summary": "<summary>" }
 * Precondition: project initialized.
 * Transition: none -> active
 */
export const decisionCreateCommand = defineCommand({
	meta: {
		name: "decision:create",
		description:
			"Create a new decision. Stdin: {id, domain, title, summary}. Transitions to 'active' status.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(createDecisionInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await begin(
			projectDir,
			"create-decision",
			{ type: "decision", id: input.id },
			{
				id: input.id,
				domain: input.domain,
				title: input.title,
				summary: input.summary,
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
