import { defineCommand } from "citty";
import pc from "picocolors";
import { submit } from "../../core/rpc/submit.js";
import { resolveProjectDir } from "../../core/data/project.js";
import type { Target } from "../../core/rpc/types.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp submit-explore --epic <name>|--quest <name>` — complete exploration phase.
 *
 * Called by sub-agent after writing research/brainstorm to filesystem.
 * No stdin content required (content is already on disk).
 * Triggers COMPLETE_EXPLORE or COMPLETE_QUEST_EXPLORE.
 */
export const submitExploreCommand = defineCommand({
	meta: {
		name: "submit-explore",
		description: "Submit exploration completion. Requires --epic or --quest (mutually exclusive). No stdin needed.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name (mutually exclusive with --quest)",
		},
		quest: {
			type: "string",
			description: "Quest name (mutually exclusive with --epic)",
		},
	},
	setup() {},
	async run({ args }) {
		const epicVal = args.epic as string | undefined;
		const questVal = args.quest as string | undefined;

		if ((epicVal !== undefined) === (questVal !== undefined)) {
			throw new GoodplanError(
				"VALIDATION_INVALID_INPUT",
				"Exactly one of --epic or --quest is required",
			);
		}

		const target: Target = epicVal !== undefined
			? { type: "epic", name: epicVal }
			: { type: "quest", name: questVal! };

		const projectDir = resolveProjectDir();
		const result = submit(projectDir, "explore", target, { phase: "explore" });

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
