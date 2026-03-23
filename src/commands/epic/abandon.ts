import { defineCommand } from "citty";
import pc from "picocolors";
import { begin } from "../../core/rpc/begin.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan epic:abandon --epic <name> --reason <text>` — abandon an epic.
 *
 * Uses flags (not stdin) because reason is a simple scalar.
 * Precondition: epic exists and is not already completed/abandoned.
 * Transition: -> abandoned
 */
export const epicAbandonCommand = defineCommand({
	meta: {
		name: "epic:abandon",
		description: "Abandon an epic with a reason. Requires --epic and --reason flags. Transition: -> abandoned.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		reason: {
			type: "string",
			description: "Reason for abandoning the epic",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const result = await begin(projectDir, "abandon", { type: "epic", name: args.epic }, {
			reason: args.reason,
		});

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.yellow(result.newStatus)}`, args);
		}
	},
});
