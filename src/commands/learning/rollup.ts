import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { begin } from "../../core/rpc/begin.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp learning:rollup --from <source> --to <target>` — roll up learnings.
 *
 * Moves learnings tagged with rollupTo matching `to` from `from` scope to `to` scope.
 * Transition: ROLLUP_LEARNINGS event.
 */
export const learningRollupCommand = defineCommand({
	meta: {
		name: "learning:rollup",
		description:
			"Roll up learnings from one scope to another. --from source scope, --to target scope. Learnings are moved (removed from source, appended to target).",
	},
	args: {
		...globalArgs,
		from: {
			type: "string",
			description: "Source scope (e.g., slices/01-auth)",
			required: true,
		},
		to: {
			type: "string",
			description: "Target scope (e.g., project)",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();

		const result = begin(
			projectDir,
			"rollup",
			{ type: "rollup", from: args.from, to: args.to },
			{
				from: args.from,
				to: args.to,
			},
		);

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(
				`Rolled up ${result.rolledUp} learnings from ${pc.bold(args.from)} to ${pc.bold(args.to)} (removed from source)`,
				args,
			);
		}
	},
});
