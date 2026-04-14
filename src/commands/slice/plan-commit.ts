import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { storeContentRef } from "../../engine/content/store.js";
import { appendEvent } from "../../engine/events/append.js";
import { planExtractor } from "../../trust/extractors/plan.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:plan-commit --epic <name> --slice <name>` (v2)
 *
 * Accepts plan content via stdin JSON `{ content }`.
 * Runs the plan extractor on content, stores ContentRef, emits `slice-plan-committed`.
 */
export const slicePlanCommitCommand = defineCommand({
	meta: {
		name: "slice:plan-commit",
		description:
			"Commit a slice plan. Accepts --epic and --slice flags and stdin JSON { content }.",
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

		// Run plan extractor
		const extractResult = planExtractor.extract(content);
		if (!extractResult.success) {
			const errorOutput = {
				ok: false,
				error: `Plan extraction failed: ${extractResult.error.message}`,
				code: "EXTRACTION_FAILED",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
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
				actor: { kind: "cli", id: "gp:slice:plan-commit" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "slice-plan-committed",
				payload: {
					sliceRef: ctx.sliceName,
					plan: contentRef,
					extract: extractResult.data,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `slice:${ctx.sliceName}` }, args);
			} else if (!args.quiet) {
				output(
					`Committed plan for slice ${pc.bold(ctx.sliceName)} in epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
