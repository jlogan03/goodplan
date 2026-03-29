import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { complete } from "../../core/rpc/complete.js";
import { completeQuestInputSchema } from "../../schemas/commands/quest.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp quest:complete --quest <name>` — complete a quest.
 *
 * Stdin: { "verificationPassed": true, "learnings": [...], "architectureDelta": [...] }
 * Precondition: quest in 'implementation-complete' status.
 * Transition: implementation-complete -> completed
 */
export const questCompleteCommand = defineCommand({
	meta: {
		name: "quest:complete",
		description:
			"Complete a quest with verification result, learnings, and architecture deltas via stdin. Requires --quest. Stdin: {verificationPassed, learnings?, architectureDelta?}.",
	},
	args: {
		...globalArgs,
		quest: {
			type: "string",
			description: "Quest name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(completeQuestInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await complete(
			projectDir,
			{ type: "quest", name: input.quest },
			{
				type: "quest",
				verificationPassed: input.verificationPassed,
				...(input.learnings !== undefined ? { learnings: input.learnings } : {}),
				...(input.architectureDelta !== undefined
					? { architectureDelta: input.architectureDelta }
					: {}),
			},
		);

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(
				`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`,
			);

			if (result.learningsRolledUp !== undefined) {
				const { project } = result.learningsRolledUp;
				if (project > 0) {
					lines.push(`  Learnings: ${project} rolled up to project`);
				}
			}

			if (result.architecturePaths !== undefined) {
				lines.push(`  Architecture: update ${result.architecturePaths.currentArchitecture}`);
			}

			output(lines.join("\n"), args);
		}
	},
});
