import { defineCommand } from "citty";
import pc from "picocolors";
import { createReviewerRegistry } from "../../trust/reviewers/index.js";
import { output } from "../../util/output.js";
import { resolvePluginDir } from "../../util/plugin-dir.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp reviewer:show <id>` — show full details for a reviewer agent.
 *
 * Read-only: reads reviewer agent files from the plugin directory.
 * Does not require a .goodplan/ project directory.
 */
export const reviewerShowCommand = defineCommand({
	meta: {
		name: "reviewer:show",
		description: "Show full details for a reviewer agent by ID.",
	},
	args: {
		...globalArgs,
		id: {
			type: "positional",
			description: "Reviewer agent ID (e.g., reviewer-holistic)",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const pluginDir = resolvePluginDir();
		const registry = createReviewerRegistry(pluginDir);
		const entry = registry.getById(args.id);

		if (entry === undefined) {
			if (args.json || args.query) {
				output(
					{ ok: false, error: `Reviewer '${args.id}' not found`, code: "ENTITY_NOT_FOUND" },
					args,
				);
			} else {
				process.stderr.write(`${pc.red("Error")}: Reviewer '${args.id}' not found\n`);
			}
			process.exitCode = 1;
			return;
		}

		const detail = {
			ok: true,
			id: entry.id,
			version: entry.frontmatter.version,
			domains: entry.frontmatter.domains,
			applies_to: entry.frontmatter.applies_to,
			rubric_ref: entry.frontmatter.rubric_ref,
			score_range: entry.frontmatter.score_range,
			passing_threshold_per_dimension: entry.frontmatter.passing_threshold_per_dimension,
			prompt_length: entry.promptContent.length,
		};

		if (args.json || args.query) {
			output(detail, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(pc.bold(entry.id));
			lines.push(`  Version: ${entry.frontmatter.version}`);
			lines.push(`  Domains: ${entry.frontmatter.domains.join(", ")}`);
			lines.push(`  Applies to: ${entry.frontmatter.applies_to.join(", ")}`);
			lines.push(`  Rubric ref: ${entry.frontmatter.rubric_ref}`);
			lines.push(`  Score range: [${entry.frontmatter.score_range.join(", ")}]`);
			lines.push(`  Prompt length: ${entry.promptContent.length} chars`);
			const thresholds = entry.frontmatter.passing_threshold_per_dimension;
			if (Object.keys(thresholds).length > 0) {
				lines.push("  Thresholds:");
				for (const [dim, val] of Object.entries(thresholds)) {
					lines.push(`    ${dim}: ${val}`);
				}
			}
			output(lines.join("\n"), args);
		}
	},
});
