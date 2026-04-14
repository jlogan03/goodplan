import { defineCommand } from "citty";
import pc from "picocolors";
import { buildContextBundle } from "../../context/index.js";
import type { ContextBundle } from "../../context/types.js";
import { readContentRef } from "../../engine/content/resolve.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:code-refine-start --epic <name> --slice <name>` (v2)
 *
 * Emits `slice-code-refinement-started` with domain "entity-lifecycle".
 * Returns contextBundle in JSON output for phase-starting command integration.
 *
 * Invariant: `slice.chunks-all-decided-before-code-refine` — all chunks must be decided.
 */
export const sliceCodeRefineStartCommand = defineCommand({
	meta: {
		name: "slice:code-refine-start",
		description: "Start code refinement for a slice.",
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
				actor: { kind: "cli", id: "gp:slice:code-refine-start" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "slice-code-refinement-started",
				payload: {
					sliceRef: ctx.sliceName,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				// Build context bundle for phase-starting command
				const { events: allEvents } = await replayEvents({ eventsPath: ctx.epicEventsPath });
				let contextBundle: ContextBundle | undefined;
				try {
					const state = computeDerivedState(allEvents);
					contextBundle = buildContextBundle(state, "P10", ctx.epicName, readContentRef);
				} catch {
					// Context bundle is advisory — failures should not block the command
				}
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `slice:${ctx.sliceName}`,
						...(contextBundle !== undefined ? { contextBundle } : {}),
					},
					args,
				);
			} else if (!args.quiet) {
				output(
					`Code refinement started for slice ${pc.bold(ctx.sliceName)} in epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
