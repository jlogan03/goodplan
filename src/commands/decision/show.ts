import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { loadState } from "../../core/data/load.js";
import { getJsonl } from "../../core/tree.js";
import type { DecisionEntry } from "../../schemas/records/decision.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan decision:show --id <id>` — show full decision entry.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Returns the full DecisionEntry for the given id.
 */
export const decisionShowCommand = defineCommand({
	meta: {
		name: "decision:show",
		description: "Show full decision entry details. Requires --id flag.",
	},
	args: {
		...globalArgs,
		id: {
			type: "string",
			description: "Decision ID",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const decisions = getJsonl<DecisionEntry>(state, "decisions.jsonl") ?? [];
		const decision = decisions.find((d) => d.id === args.id);

		if (decision === undefined) {
			throw new GoodplanError(
				"DATA_FILE_NOT_FOUND",
				`Decision '${args.id}' not found`,
			);
		}

		if (args.json || args.query) {
			output(decision, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(`${pc.bold(decision.id)}  ${decision.status}`);
			lines.push(`  Domain: ${decision.domain}`);
			lines.push(`  Title: ${decision.title}`);
			lines.push(`  Summary: ${decision.summary}`);
			lines.push(`  Date: ${decision.date}`);
			if (decision.supersededBy != null) {
				lines.push(`  Superseded by: ${decision.supersededBy}`);
			}
			output(lines.join("\n"), args);
		}
	},
});
