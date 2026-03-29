import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJsonl } from "../../core/tree.js";
import type { DecisionEntry } from "../../schemas/records/decision.js";
import { output } from "../../util/output.js";
import { applyPagination, formatPaginationFooter } from "../../util/pagination.js";
import { globalArgs, listArgs } from "../global-args.js";

/**
 * `goodplan decision:list` — list all decisions.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Returns { items: DecisionEntry[] } from decisions.jsonl.
 */
export const decisionListCommand = defineCommand({
	meta: {
		name: "decision:list",
		description: "List all decisions with id, status, domain, and title.",
	},
	args: {
		...globalArgs,
		...listArgs,
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const allItems = getJsonl<DecisionEntry>(state, "decisions.jsonl") ?? [];
		const paginated = applyPagination(allItems, args);

		if (args.json || args.query) {
			output(paginated, args);
		} else if (!args.quiet) {
			if (paginated.total === 0) {
				output("No decisions found.", args);
			} else {
				const lines: string[] = [];
				if (paginated.items.length === 0) {
					lines.push("No decisions in this range.");
				}
				for (const item of paginated.items) {
					lines.push(`  ${pc.bold(item.id)} ${item.status} ${item.domain} ${item.title}`);
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
