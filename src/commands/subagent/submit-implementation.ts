import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { submit } from "../../core/rpc/submit.js";
import type { Target } from "../../core/rpc/types.js";
import { updateImplementationPhase } from "../../core/rpc/update-implementation-phase.js";
import { submitImplementationInputSchema } from "../../schemas/commands/submit.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";
import { requireActiveEpic } from "../slice/utils.js";

/**
 * `gp submit-implementation --slice <name>|--quest <name> [--phase <N>]` — complete or update implementation phase.
 *
 * Called by sub-agent after writing implementation to filesystem.
 * No stdin content required (code is already on disk).
 *
 * Without --phase: triggers COMPLETE_IMPLEMENTATION or COMPLETE_QUEST_IMPLEMENTATION.
 * With --phase: triggers UPDATE_IMPLEMENTATION_PHASE (slice only, monotonic).
 */
export const submitImplementationCommand = defineCommand({
	meta: {
		name: "submit-implementation",
		description:
			"Submit implementation completion or phase update. Requires --slice or --quest. Optional --phase for phase tracking.",
	},
	args: {
		...globalArgs,
		slice: {
			type: "string",
			description: "Slice name (mutually exclusive with --quest)",
		},
		quest: {
			type: "string",
			description: "Quest name (mutually exclusive with --slice)",
		},
		phase: {
			type: "string",
			description:
				"Implementation phase number (emits UPDATE_IMPLEMENTATION_PHASE instead of COMPLETE_IMPLEMENTATION)",
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(submitImplementationInputSchema, args, stdin);

		const projectDir = resolveProjectDir();

		// --phase flag: emit UPDATE_IMPLEMENTATION_PHASE (slice only)
		if (input.phase !== undefined) {
			const epic = requireActiveEpic(projectDir);
			const sliceName = input.slice;
			if (sliceName === undefined) {
				throw new Error("--phase is only supported with --slice (not --quest)");
			}
			const result = updateImplementationPhase(projectDir, epic, sliceName, input.phase);

			if (args.json || args.query) {
				output(result, args);
			} else if (!args.quiet) {
				output(
					`${pc.bold(result.entity)}: implementation phase ${pc.dim("->")} ${pc.green(String(result.phase))}`,
					args,
				);
			}
			return;
		}

		const target: Target =
			input.slice !== undefined
				? { type: "slice", name: input.slice, epic: requireActiveEpic(projectDir) }
				: { type: "quest", name: input.quest! };

		const result = submit(projectDir, "implementation", target, { phase: "implementation" });

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			output(
				`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`,
				args,
			);
		}
	},
});
