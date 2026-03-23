import { defineCommand } from "citty";
import pc from "picocolors";
import { begin } from "../../core/rpc/begin.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan epic:define-architecture --epic <name>` — begin architecture definition.
 *
 * Precondition: epic in 'explored' status.
 * Transition: explored -> defining-architecture
 *
 * Note: the skip path (explored -> architecture-defined) is exercised through
 * submit-architecture in Phase 6, not this command. This only handles BEGIN_ARCHITECTURE.
 */
export const epicDefineArchitectureCommand = defineCommand({
	meta: {
		name: "epic:define-architecture",
		description: "Begin architecture definition phase. Precondition: 'explored'. Transition: explored -> defining-architecture.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const result = await begin(projectDir, "define-architecture", { type: "epic", name: args.epic }, {});

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
		}
	},
});
