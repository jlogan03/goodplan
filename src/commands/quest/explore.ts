import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp quest:explore --quest <name>` — begin exploration phase for a quest.
 *
 * Precondition: quest in 'created' status.
 * Transition: created -> exploring
 *
 * Note: BEGIN_QUEST_EXPLORE does NOT set activeQuest, following the epic
 * pattern where BEGIN_EXPLORE does not set activeEpic. This allows other
 * quests to remain accessible during potentially long explore phases.
 */
export const questExploreCommand = defineCommand({
	meta: {
		name: "quest:explore",
		description:
			"Begin exploration phase for a quest. Requires --quest. Precondition: 'created' status. Transition: -> exploring.",
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
		const projectDir = resolveProjectDir();
		const result = await begin(projectDir, "explore", { type: "quest", name: args.quest }, {});

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
