import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson } from "../../core/tree.js";
import type { Overview, OverviewItem } from "../../schemas/entities/overview.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

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
		const items: OverviewItem[] =
			filter === "open" ? allItems.filter((item) => item.status === "open") : allItems;

		if (args.json || args.query) {
			output({ items, filter }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				if (filter === "open" && allItems.length > 0) {
					output(`No open tasks (use --all to show all ${allItems.length})`, args);
				} else {
					output("No tasks found.", args);
				}
			} else {
				const lines: string[] = [];
				for (const item of items) {
					const titleStr = item.title !== undefined ? `  ${item.title}` : "";
					const statusStr = item.status !== "open" ? `  ${pc.dim(item.status)}` : "";
					const createdStr = `  ${pc.dim(`(${item.created})`)}`;
					lines.push(`  ${pc.bold(item.name)}${titleStr}${statusStr}${createdStr}`);
				}
				if (filter === "open" && allItems.length > items.length) {
					lines.push(
						`\n${pc.dim(`${items.length} open tasks (use --all to show all ${allItems.length})`)}`,
					);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
