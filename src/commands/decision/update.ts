import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import type { UpdateDecisionChanges } from "../../core/rpc/types.js";
import { updateDecisionInputSchema } from "../../schemas/commands/decision.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp decision:update --id <id>` — update an existing decision.
 *
 * Stdin: { "changes": { "status": "revisiting", ... } }
 * The --id flag identifies the decision (authoritative).
 * Precondition: decision exists in decisions.jsonl.
 */
export const decisionUpdateCommand = defineCommand({
	meta: {
		name: "decision:update",
		description:
			"Update an existing decision. Stdin: {id, changes: {status?, domain?, title?, summary?, supersededBy?}}. --id flag identifies the decision.",
	},
	args: {
		...globalArgs,
		id: {
			type: "string",
			description: "Decision ID to update",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(updateDecisionInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		// Build changes object with only defined keys to satisfy exactOptionalPropertyTypes.
		// Zod output has optional props as `T | undefined`, but BeginPayloadMap needs
		// exact optional (key absent, not undefined). Spread only defined entries.
		const changes: UpdateDecisionChanges = {};
		if (input.changes.status !== undefined) changes.status = input.changes.status;
		if (input.changes.domain !== undefined) changes.domain = input.changes.domain;
		if (input.changes.title !== undefined) changes.title = input.changes.title;
		if (input.changes.summary !== undefined) changes.summary = input.changes.summary;
		if (input.changes.supersededBy !== undefined) changes.supersededBy = input.changes.supersededBy;

		const result = begin(
			projectDir,
			"update-decision",
			{ type: "decision", id: args.id },
			{
				changes,
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
