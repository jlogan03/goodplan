import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { buildContextBundle } from "../../context/index.js";
import type { ContextBundle } from "../../context/types.js";
import { readContentRef } from "../../engine/content/resolve.js";
import { storeContentRef } from "../../engine/content/store.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:plan-draft --epic <name> --slice <name>` (v2)
 *
 * Accepts plan content via stdin JSON `{ content }`.
 * Stores content as a git blob via storeContentRef, emits `slice-plan-drafted`.
 * Returns contextBundle for phase-starting command integration.
 */
export const slicePlanDraftCommand = defineCommand({
	meta: {
		name: "slice:plan-draft",
		description: "Draft a slice plan. Accepts --epic and --slice flags and stdin JSON { content }.",
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
		const stdin = await readStdin();
		const content = stdin.content as string | undefined;

		if (content === undefined || content === "") {
			const errorOutput = {
				ok: false,
				error: "Plan content is required via stdin JSON { content }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Plan content is required\n`);
			}
			process.exit(1);
		}

		const ctx = createEventCommandContext(args, { requireSlice: true });

		const planPath = path.join("epics", ctx.epicName, "slices", ctx.sliceName, "plan.md");
		const contentRef = await storeContentRef(content, planPath, "text/markdown");

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:slice:plan-draft" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "slice-plan-drafted",
				payload: {
					sliceRef: ctx.sliceName,
					plan: contentRef,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				// Build context bundle for phase-starting command
				const { events: allEvents } = await replayEvents({ eventsPath: ctx.epicEventsPath });
				let contextBundle: ContextBundle | undefined;
				try {
					const state = computeDerivedState(allEvents);
					contextBundle = buildContextBundle(state, "P7", ctx.epicName, readContentRef);
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
					`Drafted plan for slice ${pc.bold(ctx.sliceName)} in epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
