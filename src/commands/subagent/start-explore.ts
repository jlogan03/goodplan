import { defineCommand } from "citty";
import { DEFAULT_INLINE_BUDGET, startContext } from "../../core/context/index.js";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import type { Target } from "../../core/rpc/types.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs, parseInlineBudget } from "../global-args.js";

/**
 * `gp start-explore --epic <name>|--quest <name> [--inline[=<bytes>]]`
 *
 * Read-only context assembly for the explore phase. Returns ContextBundle JSON.
 * Always outputs JSON regardless of --json flag (sub-agent command).
 */
export const startExploreCommand = defineCommand({
	meta: {
		name: "start-explore",
		description:
			"Assemble context bundle for explore phase. Requires --epic or --quest (mutually exclusive).",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name (mutually exclusive with --quest)",
		},
		quest: {
			type: "string",
			description: "Quest name (mutually exclusive with --epic)",
		},
		inline: {
			type: "string",
			description: "Inline content up to budget (bare = default, or =<bytes>)",
		},
	},
	setup() {},
	run({ args }) {
		const epicVal = args.epic as string | undefined;
		const questVal = args.quest as string | undefined;

		if ((epicVal !== undefined) === (questVal !== undefined)) {
			throw new GoodplanError(
				"VALIDATION_INVALID_INPUT",
				"Exactly one of --epic or --quest is required",
			);
		}

		const target: Target =
			epicVal !== undefined ? { type: "epic", name: epicVal } : { type: "quest", name: questVal! };

		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const inlineBudget = parseInlineBudget(args.inline as string | undefined);
		const options =
			inlineBudget !== undefined
				? { inlineBudget: typeof inlineBudget === "number" ? inlineBudget : DEFAULT_INLINE_BUDGET }
				: undefined;

		const bundle = startContext(state, "explore", target, options);
		output(bundle, { ...args, json: true });
	},
});
