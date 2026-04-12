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
 * `gp epic:brainstorm-capture --epic <name>` (v2) — capture a brainstorm artifact.
 *
 * Accepts stdin JSON `{ content, title }`.
 * Stores content as a git blob, emits `brainstorm-captured` with domain "exploration".
 */
export const epicBrainstormCaptureCommand = defineCommand({
	meta: {
		name: "epic:brainstorm-capture",
		description: "Capture a brainstorm artifact for an epic.",
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
		const title = stdin.title as string | undefined;

		if (content === undefined || content === "") {
			const errorOutput = {
				ok: false,
				error: "Brainstorm content is required via stdin JSON { content, title }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Brainstorm content is required\n`);
			}
			process.exit(1);
		}

		if (title === undefined || title === "") {
			const errorOutput = {
				ok: false,
				error: "Brainstorm title is required via stdin JSON { content, title }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Brainstorm title is required\n`);
			}
			process.exit(1);
		}

		const ctx = createEventCommandContext(args, { requireSlice: false });

		const slug = title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		const brainstormPath = path.join("epics", ctx.epicName, "brainstorm", `${slug}.md`);
		const contentRef = await storeContentRef(content, brainstormPath, "text/markdown");

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:epic:brainstorm-capture" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "exploration",
				type: "brainstorm-captured",
				payload: { contentRef, title },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${ctx.epicName}`, title }, args);
			} else if (!args.quiet) {
				output(`Captured brainstorm "${title}" for epic ${pc.bold(ctx.epicName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
