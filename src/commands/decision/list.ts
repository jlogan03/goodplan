import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { loadState } from "../../core/data/load.js";
import { getJsonl } from "../../core/tree.js";
import type { DecisionEntry } from "../../schemas/records/decision.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

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
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const items = getJsonl<DecisionEntry>(state, "decisions.jsonl") ?? [];

		if (args.json || args.query) {
			output({ items }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No decisions found.", args);
			} else {
				const lines: string[] = [];
				for (const item of items) {
					lines.push(`  ${pc.bold(item.id)} ${item.status} ${item.domain} ${item.title}`);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
