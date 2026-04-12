import { defineCommand } from "citty";
import { DEFAULT_INLINE_BUDGET, startContext } from "../../core/context/index.js";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import type { Target } from "../../core/rpc/types.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs, parseInlineBudget } from "../global-args.js";
import { requireActiveEpic } from "../slice/utils.js";

/**
 * `gp start-refinement --slice <name>|--quest <name> [--inline[=<bytes>]]`
 *
 * Read-only context assembly for the refinement phase. Returns ContextBundle JSON.
 * Always outputs JSON regardless of --json flag (sub-agent command).
 */
export const startRefinementCommand = defineCommand({
	meta: {
		name: "start-refinement",
		description: "Assemble context bundle for refinement phase. Requires --slice or --quest.",
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
		inline: {
			type: "string",
			description: "Inline content up to budget (bare = default, or =<bytes>)",
		},
	},
	setup() {},
	run({ args }) {
		const sliceVal = args.slice as string | undefined;
		const questVal = args.quest as string | undefined;

		if ((sliceVal !== undefined) === (questVal !== undefined)) {
			throw new GoodplanError(
				"VALIDATION_INVALID_INPUT",
				"Exactly one of --slice or --quest is required",
			);
		}

		const projectDir = resolveProjectDir();

		const target: Target =
			sliceVal !== undefined
				? { type: "slice", name: sliceVal, epic: requireActiveEpic(projectDir) }
				: { type: "quest", name: questVal! };

		const state = loadState(projectDir);

		const inlineBudget = parseInlineBudget(args.inline as string | undefined);
		const options =
			inlineBudget !== undefined
				? { inlineBudget: typeof inlineBudget === "number" ? inlineBudget : DEFAULT_INLINE_BUDGET }
				: undefined;

		const bundle = startContext(state, "refinement", target, options);
		output(bundle, { ...args, json: true });
	},
});
