import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { storeContentRef } from "../../engine/content/store.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";
import { buildEpicContextBundle } from "./context-helper.js";

/**
 * `gp epic:architecture-draft --epic <name>` (v2) — draft an architecture target.
 *
 * Accepts stdin JSON `{ content }`.
 * Stores content as a git blob, emits `architecture-target-drafted` with domain "entity-lifecycle".
 */
export const epicArchitectureDraftCommand = defineCommand({
	meta: {
		name: "epic:architecture-draft",
		description: "Draft an architecture target for an epic.",
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
				error: "Architecture content is required via stdin JSON { content }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Architecture content is required\n`);
			}
			process.exit(1);
		}

		const ctx = createEventCommandContext(args, { requireSlice: false });

		const archPath = path.join("epics", ctx.epicName, "architecture-target.md");
		const contentRef = await storeContentRef(content, archPath, "text/markdown");

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:epic:architecture-draft" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "architecture-target-drafted",
				payload: { architectureTarget: contentRef },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				const { events: allEvents } = await replayEvents({ eventsPath: ctx.epicEventsPath });
				const contextBundle = buildEpicContextBundle(allEvents, "P2", ctx.epicName);
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `epic:${ctx.epicName}`,
						...(contextBundle !== undefined ? { contextBundle } : {}),
					},
					args,
				);
			} else if (!args.quiet) {
				output(`Drafted architecture target for epic ${pc.bold(ctx.epicName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
