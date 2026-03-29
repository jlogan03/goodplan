import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJsonl } from "../../core/tree.js";
import type { LearningEntry } from "../../schemas/records/learning.js";
import { output } from "../../util/output.js";
import { applyPagination, formatPaginationFooter } from "../../util/pagination.js";
import { globalArgs, listArgs } from "../global-args.js";

/**
 * `gp learning:list [--source <scope>]` — list learnings.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Without --source: reads project-level learnings.jsonl.
 * With --source: reads <source>/learnings.jsonl (e.g., slices/01-auth/learnings.jsonl).
 */
export const learningListCommand = defineCommand({
	meta: {
		name: "learning:list",
		description:
			"List learnings. Without --source: project-level. With --source <scope>: scope-level (e.g., --source slices/01-auth).",
	},
	args: {
		...globalArgs,
		...listArgs,
		source: {
			type: "string",
			description: "Source scope (e.g., slices/01-auth). Omit for project-level learnings.",
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const jsonlPath =
			args.source !== undefined ? `${args.source}/learnings.jsonl` : "learnings.jsonl";
		const allItems = getJsonl<LearningEntry>(state, jsonlPath) ?? [];
		const paginated = applyPagination(allItems, args);

		if (args.json || args.query) {
			output(paginated, args);
		} else if (!args.quiet) {
			if (paginated.total === 0) {
				output("No learnings found.", args);
			} else {
				const lines: string[] = [];
				if (paginated.items.length === 0) {
					lines.push("No learnings in this range.");
				}
				for (const item of paginated.items) {
					lines.push(`  ${pc.bold(item.category)} ${item.summary} ${pc.dim(`(${item.source})`)}`);
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
