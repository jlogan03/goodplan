import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson } from "../../core/tree.js";
import type { Overview } from "../../schemas/entities/overview.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan slice:list [--epic <name>]` — list all slices.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Returns { items: Array<{ name, status, epic?, created, completed }> } from slices/overview.json.
 * Optional --epic flag to filter by epic.
 */
export const sliceListCommand = defineCommand({
	meta: {
		name: "slice:list",
		description:
			"List all slices with name, status, epic, created, and completed timestamps. Optional --epic filter.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Filter by epic name",
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		// Treat missing overview.json as empty list (supports projects with no slices yet)
		const overview = getJson<Overview>(state, "slices/overview.json") ?? { items: [] };

		let items = overview.items;

		// Apply --epic filter if provided
		if (args.epic !== undefined) {
			items = items.filter((item) => item.epic === args.epic);
		}

		if (args.json || args.query) {
			output({ items }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No slices found.", args);
			} else {
				const lines: string[] = [];
				for (const item of items) {
					const epicStr = item.epic !== undefined ? `  (epic: ${item.epic})` : "";
					const completedStr = item.completed !== null ? ` (completed ${item.completed})` : "";
					lines.push(`  ${pc.bold(item.name)}  ${item.status}${epicStr}${completedStr}`);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
