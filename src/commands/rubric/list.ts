import { resolve } from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { loadAllRubrics } from "../../trust/reviewers/index.js";
import { output } from "../../util/output.js";
import { resolvePluginDir } from "../../util/plugin-dir.js";
import { globalArgs, listArgs } from "../global-args.js";

/**
 * `gp rubric:list` — list all rubric YAML files.
 *
 * Read-only: reads rubric files from the plugin directory.
 * Does not require a .goodplan/ project directory.
 */
export const rubricListCommand = defineCommand({
	meta: {
		name: "rubric:list",
		description: "List all rubrics with dimension count and convergence settings.",
	},
	args: {
		...globalArgs,
		...listArgs,
	},
	setup() {},
	async run({ args }) {
		const pluginDir = resolvePluginDir();
		const rubricDir = resolve(pluginDir, "rubrics");
		const rubrics = loadAllRubrics(rubricDir);

		const items = [...rubrics.values()].map((rubric) => ({
			id: rubric.id,
			dimension_count: rubric.dimensions.length,
			max_rounds: rubric.convergence.max_rounds,
		}));

		if (args.json || args.query) {
			output({ ok: true, total: items.length, items }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No rubrics found.", args);
			} else {
				const lines: string[] = [];
				for (const item of items) {
					lines.push(
						`  ${pc.bold(item.id)}  dimensions=${item.dimension_count}  max_rounds=${item.max_rounds}`,
					);
				}
				lines.push(`\n${items.length} rubric(s)`);
				output(lines.join("\n"), args);
			}
		}
	},
});
