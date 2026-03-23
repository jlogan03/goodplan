import { defineCommand } from "citty";
import { startContext, DEFAULT_INLINE_BUDGET } from "../../core/context/index.js";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { output } from "../../util/output.js";
import { globalArgs, parseInlineBudget } from "../global-args.js";

/**
 * `goodplan start-explore --epic <name> [--inline[=<bytes>]]`
 *
 * Read-only context assembly for the explore phase. Returns ContextBundle JSON.
 * Always outputs JSON regardless of --json flag (sub-agent command).
 */
export const startExploreCommand = defineCommand({
	meta: {
		name: "start-explore",
		description: "Assemble context bundle for explore phase. Requires --epic.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		inline: {
			type: "string",
			description: "Inline content up to budget (bare = default, or =<bytes>)",
		},
	},
	setup() {},
	run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const inlineBudget = parseInlineBudget(args.inline as string | undefined);
		const options = inlineBudget !== undefined
			? { inlineBudget: typeof inlineBudget === "number" ? inlineBudget : DEFAULT_INLINE_BUDGET }
			: undefined;

		const bundle = startContext(state, "explore", { type: "epic", name: args.epic as string }, options);
		output(bundle, { ...args, json: true });
	},
});
