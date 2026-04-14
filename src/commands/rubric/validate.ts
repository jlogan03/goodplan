import { resolve } from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import {
	createReviewerRegistry,
	loadAllRubrics,
	validateRubrics,
} from "../../trust/reviewers/index.js";
import { output } from "../../util/output.js";
import { resolvePluginDir } from "../../util/plugin-dir.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp rubric:validate` — validate rubrics against the reviewer registry.
 *
 * Checks that every rubric_ref resolves, dimension references are valid,
 * and flags orphaned rubrics. Exits with code 1 if validation fails.
 *
 * Does not require a .goodplan/ project directory.
 */
export const rubricValidateCommand = defineCommand({
	meta: {
		name: "rubric:validate",
		description: "Validate rubrics against reviewer registry. Exits 1 if invalid.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const pluginDir = resolvePluginDir();
		const registry = createReviewerRegistry(pluginDir);
		const rubricDir = resolve(pluginDir, "rubrics");
		const rubrics = loadAllRubrics(rubricDir);

		const result = validateRubrics(registry, rubrics);

		if (args.json || args.query) {
			output(
				{
					ok: true,
					valid: result.valid,
					errors: result.errors,
					warnings: result.warnings,
				},
				args,
			);
		} else if (!args.quiet) {
			if (result.valid) {
				process.stdout.write(`${pc.green("Valid")}: All rubric references check out.\n`);
			} else {
				process.stderr.write(`${pc.red("Invalid")}: Rubric validation failed.\n`);
				for (const err of result.errors) {
					process.stderr.write(`  ${pc.red("ERROR")}: ${err}\n`);
				}
			}
			if (result.warnings.length > 0) {
				for (const warn of result.warnings) {
					process.stderr.write(`  ${pc.yellow("WARN")}: ${warn}\n`);
				}
			}
		}

		if (!result.valid) {
			process.exitCode = 1;
		}
	},
});
