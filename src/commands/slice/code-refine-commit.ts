import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:code-refine-commit --epic <name> --slice <name>` (v2)
 *
 * Emits `code-refinement-converged` with domain "entity-lifecycle".
 * Note: no `slice-` prefix per architecture naming convention.
 *
 * Invariant: `slice.code-refinement-started-before-converged` — code refinement must be started.
 */
export const sliceCodeRefineCommitCommand = defineCommand({
	meta: {
		name: "slice:code-refine-commit",
		description: "Record code refinement convergence for a slice.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const ctx = createEventCommandContext(args, { requireSlice: true });

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:slice:code-refine-commit" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "code-refinement-converged",
				payload: {
					sliceRef: ctx.sliceName,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `slice:${ctx.sliceName}` }, args);
			} else if (!args.quiet) {
				output(
					`Code refinement converged for slice ${pc.bold(ctx.sliceName)} in epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
