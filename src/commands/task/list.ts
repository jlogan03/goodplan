import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson } from "../../core/tree.js";
import type { Overview, OverviewItem } from "../../schemas/entities/overview.js";
import { output } from "../../util/output.js";
import { applyPagination, formatPaginationFooter } from "../../util/pagination.js";
import { globalArgs, listArgs } from "../global-args.js";

/**
 * `goodplan task:list [--all]` — list tasks.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Defaults to open tasks only. Use --all to include converted/dropped.
 * JSON output includes `filter: "open" | "all"` field.
 */
export const taskListCommand = defineCommand({
	meta: {
		name: "task:list",
		description:
			"List tasks. Defaults to open tasks only; use --all to include converted/dropped. JSON includes filter field.",
	},
	args: {
		...globalArgs,
		...listArgs,
		all: {
			type: "boolean",
			description: "Include converted and dropped tasks (default: open only)",
			default: false,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const overview = getJson<Overview>(state, "tasks/overview.json") ?? { items: [] };

		const allItems = overview.items;
		const filter = args.all ? "all" : "open";
		const filtered: OverviewItem[] =
			filter === "open" ? allItems.filter((item) => item.status === "open") : allItems;
		const paginated = applyPagination(filtered, args);

		if (args.json || args.query) {
			output({ ...paginated, filter }, args);
		} else if (!args.quiet) {
			if (paginated.total === 0) {
				if (filter === "open" && allItems.length > 0) {
					output(`No open tasks (use --all to show all ${allItems.length})`, args);
				} else {
					output("No tasks found.", args);
				}
			} else {
				const lines: string[] = [];
				if (paginated.items.length === 0) {
					lines.push("No tasks in this range.");
				}
				for (const item of paginated.items) {
					const titleStr = item.title !== undefined ? `  ${item.title}` : "";
					const statusStr = item.status !== "open" ? `  ${pc.dim(item.status)}` : "";
					const createdStr = `  ${pc.dim(`(${item.created})`)}`;
					lines.push(`  ${pc.bold(item.name)}${titleStr}${statusStr}${createdStr}`);
				}
				const footer = formatPaginationFooter(paginated);
				if (filter === "open" && allItems.length > filtered.length && footer === undefined) {
					// Only show summary when pagination footer is absent (footer already conveys count)
					lines.push(
						`\n${pc.dim(`${paginated.total} open tasks (use --all to show all ${allItems.length})`)}`,
					);
				}
				if (footer !== undefined) {
					lines.push(footer);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
