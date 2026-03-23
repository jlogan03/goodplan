import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson } from "../../core/tree.js";
import type { Overview } from "../../schemas/entities/overview.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan quest:list` — list all quests.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Returns { items: Array<{ name, status, created, completed }> } from quests/overview.json.
 */
export const questListCommand = defineCommand({
	meta: {
		name: "quest:list",
		description: "List all quests with name, status, created, and completed timestamps.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		// Treat missing overview.json as empty list (supports projects with no quests yet)
		const overview = getJson<Overview>(state, "quests/overview.json") ?? { items: [] };

		const items = overview.items;

		if (args.json || args.query) {
			output({ items }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No quests found.", args);
			} else {
				const lines: string[] = [];
				for (const item of items) {
					const completedStr =
						item.completed !== null ? ` (completed ${item.completed})` : "";
					lines.push(`  ${pc.bold(item.name)}  ${item.status}${completedStr}`);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
