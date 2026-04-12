import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { storeContentRef } from "../../engine/content/store.js";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:plan-shape-revise --epic <name> --slice <name>` (v2)
 *
 * Accepts stdin JSON `{ content, revision }`.
 * `content` is the full post-revision plan content (stored as ContentRef).
 * `revision` is prose describing what changed.
 * Emits `plan-shape-revision-proposed`.
 */
export const slicePlanShapeReviseCommand = defineCommand({
	meta: {
		name: "slice:plan-shape-revise",
		description:
			"Propose a plan shape revision. Accepts --epic, --slice, and stdin JSON { content, revision }.",
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
		const revision = stdin.revision as string | undefined;

		if (content === undefined || content === "") {
			const errorOutput = {
				ok: false,
				error: "Plan content is required via stdin JSON { content, revision }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Plan content is required\n`);
			}
			process.exit(1);
		}

		if (revision === undefined || revision === "") {
			const errorOutput = {
				ok: false,
				error: "Revision description is required via stdin JSON { content, revision }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Revision description is required\n`);
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
				actor: { kind: "cli", id: "gp:slice:plan-shape-revise" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "plan-shape-revision-proposed",
				payload: {
					sliceRef: ctx.sliceName,
					plan: contentRef,
					revision,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `slice:${ctx.sliceName}` }, args);
			} else if (!args.quiet) {
				output(
					`Plan shape revision proposed for slice ${pc.bold(ctx.sliceName)} in epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
