import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson } from "../../core/tree.js";
import type { Quest } from "../../schemas/entities/quest.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan quest:show --quest <name>` — show full quest entity.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Returns the full quest.json content for the named quest.
 */
export const questShowCommand = defineCommand({
	meta: {
		name: "quest:show",
		description: "Show full quest entity details. Requires --quest flag.",
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
		const state = loadState(projectDir);

		const quest = getJson<Quest>(state, `quests/${args.quest}/quest.json`);
		if (quest === undefined) {
			throw new GoodplanError("DATA_FILE_NOT_FOUND", `Quest '${args.quest}' not found`);
		}

		if (args.json) {
			output(quest, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(`${pc.bold(quest.name)}  ${quest.status}`);
			lines.push(`  Goal: ${quest.goal}`);
			lines.push(`  Created: ${quest.created}`);
			lines.push(`  Updated: ${quest.updated}`);
			if (quest.refinement !== null) {
				lines.push(
					`  Refinement: round ${quest.refinement.round}/${quest.refinement.maxRounds}`,
				);
			}
			output(lines.join("\n"), args);
		}
	},
});
