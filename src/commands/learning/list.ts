import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { loadState } from "../../core/data/load.js";
import { getJsonl } from "../../core/tree.js";
import type { LearningEntry } from "../../schemas/records/learning.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan learning:list [--source <scope>]` — list learnings.
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
		const items = getJsonl<LearningEntry>(state, jsonlPath) ?? [];

		if (args.json || args.query) {
			output({ items }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No learnings found.", args);
			} else {
				const lines: string[] = [];
				for (const item of items) {
					lines.push(
						`  ${pc.bold(item.category)} ${item.summary} ${pc.dim(`(${item.source})`)}`,
					);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
