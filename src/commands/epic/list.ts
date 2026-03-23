import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { loadState } from "../../core/data/load.js";
import { getJson } from "../../core/tree.js";
import type { Overview } from "../../schemas/entities/overview.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan epic:list` — list all epics.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Returns { items: Array<{ name, status, created, completed }> } from epics/overview.json.
 */
export const epicListCommand = defineCommand({
	meta: {
		name: "epic:list",
		description: "List all epics with name, status, created, and completed timestamps.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		// Treat missing overview.json as empty list (supports fresh projects with no epics yet)
		const overview = getJson<Overview>(state, "epics/overview.json") ?? { items: [] };

		if (args.json || args.query) {
			output({ items: overview.items }, args);
		} else if (!args.quiet) {
			if (overview.items.length === 0) {
				output("No epics found.", args);
			} else {
				const lines: string[] = [];
				for (const item of overview.items) {
					const completedStr = item.completed !== null ? ` (completed ${item.completed})` : "";
					lines.push(`  ${pc.bold(item.name)}  ${item.status}${completedStr}`);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
