import { defineCommand } from "citty";
import pc from "picocolors";
import { createReviewerRegistry } from "../../trust/reviewers/index.js";
import { output } from "../../util/output.js";
import { resolvePluginDir } from "../../util/plugin-dir.js";
import { globalArgs, listArgs } from "../global-args.js";

/**
 * `gp reviewer:list` — list all registered reviewer agents.
 *
 * Read-only: reads reviewer agent files from the plugin directory.
 * Does not require a .goodplan/ project directory.
 */
export const reviewerListCommand = defineCommand({
	meta: {
		name: "reviewer:list",
		description: "List all registered reviewer agents with domains and artifact types.",
	},
	args: {
		...globalArgs,
		...listArgs,
	},
	setup() {},
	async run({ args }) {
		const pluginDir = resolvePluginDir();
		const registry = createReviewerRegistry(pluginDir);
		const allEntries = registry.getAll();

		const items = allEntries.map((entry) => ({
			id: entry.id,
			domains: entry.frontmatter.domains,
			applies_to: entry.frontmatter.applies_to,
			rubric_ref: entry.frontmatter.rubric_ref,
		}));

		if (args.json || args.query) {
			output({ ok: true, total: items.length, items }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No reviewers found.", args);
			} else {
				const lines: string[] = [];
				for (const item of items) {
					lines.push(
						`  ${pc.bold(item.id)}  domains=${item.domains.join(",")}  applies_to=${item.applies_to.join(",")}  rubric=${item.rubric_ref}`,
					);
				}
				lines.push(`\n${items.length} reviewer(s)`);
				output(lines.join("\n"), args);
			}
		}
	},
});
