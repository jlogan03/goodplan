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
 * `gp epic:goal-commit --epic <name>` (v2) — commit an epic goal via the event engine.
 *
 * Accepts goal artifact content via stdin JSON `{ content }`.
 * Stores content as a git blob via storeContentRef, emits `epic-goal-committed`.
 */
export const epicGoalCommitCommand = defineCommand({
	meta: {
		name: "epic:goal-commit",
		description: "Commit an epic goal. Accepts --epic flag and stdin JSON { content }.",
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
		const stdin = await readStdin();
		const content = stdin.content as string | undefined;

		if (content === undefined || content === "") {
			const errorOutput = {
				ok: false,
				error: "Goal content is required via stdin JSON { content }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Goal content is required\n`);
			}
			process.exit(1);
		}

		const ctx = createEventCommandContext(args, { requireSlice: false });

		const goalPath = path.join("epics", ctx.epicName, "goal.md");
		const contentRef = await storeContentRef(content, goalPath, "text/markdown");

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:epic:goal-commit" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				payload: { goal: contentRef },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${ctx.epicName}` }, args);
			} else if (!args.quiet) {
				output(`Committed goal for epic ${pc.bold(ctx.epicName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
