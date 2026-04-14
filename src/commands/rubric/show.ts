import { resolve } from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { loadAllRubrics } from "../../trust/reviewers/index.js";
import { output } from "../../util/output.js";
import { resolvePluginDir } from "../../util/plugin-dir.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp rubric:show <name>` — show full details for a rubric.
 *
 * Read-only: reads rubric files from the plugin directory.
 * Does not require a .goodplan/ project directory.
 */
export const rubricShowCommand = defineCommand({
	meta: {
		name: "rubric:show",
		description: "Show full rubric details including dimensions and convergence criteria.",
	},
	args: {
		...globalArgs,
		name: {
			type: "positional",
			description: "Rubric ID (e.g., holistic)",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const pluginDir = resolvePluginDir();
		const rubricDir = resolve(pluginDir, "rubrics");
		const rubrics = loadAllRubrics(rubricDir);
		const rubric = rubrics.get(args.name);

		if (rubric === undefined) {
			if (args.json || args.query) {
				output(
					{ ok: false, error: `Rubric '${args.name}' not found`, code: "ENTITY_NOT_FOUND" },
					args,
				);
			} else {
				process.stderr.write(`${pc.red("Error")}: Rubric '${args.name}' not found\n`);
			}
			process.exitCode = 1;
			return;
		}

		const detail = {
			ok: true,
			id: rubric.id,
			version: rubric.version,
			dimensions: rubric.dimensions,
			convergence: rubric.convergence,
		};

		if (args.json || args.query) {
			output(detail, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(pc.bold(rubric.id));
			lines.push(`  Version: ${rubric.version}`);
			lines.push(`  Dimensions (${rubric.dimensions.length}):`);
			for (const dim of rubric.dimensions) {
				lines.push(`    ${pc.bold(dim.name)} (threshold: ${dim.threshold})`);
				lines.push(`      ${dim.description}`);
			}
			lines.push("  Convergence:");
			lines.push(`    Max rounds: ${rubric.convergence.max_rounds}`);
			lines.push(`    Zero blocking required: ${rubric.convergence.zero_blocking_required}`);
			lines.push(`    Zero critical required: ${rubric.convergence.zero_critical_required}`);
			output(lines.join("\n"), args);
		}
	},
});
