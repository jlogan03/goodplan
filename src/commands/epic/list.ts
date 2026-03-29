import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson } from "../../core/tree.js";
import type { Overview } from "../../schemas/entities/overview.js";
import { output } from "../../util/output.js";
import { applyPagination, formatPaginationFooter } from "../../util/pagination.js";
import { globalArgs, listArgs } from "../global-args.js";

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
		...listArgs,
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		// Treat missing overview.json as empty list (supports fresh projects with no epics yet)
		const overview = getJson<Overview>(state, "epics/overview.json") ?? { items: [] };
		const paginated = applyPagination(overview.items, args);

		if (args.json || args.query) {
			output(paginated, args);
		} else if (!args.quiet) {
			if (paginated.total === 0) {
				output("No epics found.", args);
			} else {
				const lines: string[] = [];
				if (paginated.items.length === 0) {
					lines.push("No epics in this range.");
				}
				for (const item of paginated.items) {
					const completedStr = item.completed !== null ? ` (completed ${item.completed})` : "";
					lines.push(`  ${pc.bold(item.name)}  ${item.status}${completedStr}`);
				}
				const footer = formatPaginationFooter(paginated);
				if (footer !== undefined) {
					lines.push(footer);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
