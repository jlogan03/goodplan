import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:create --epic <name>` (v2) — create a new slice via event engine.
 *
 * Accepts --name via flag or stdin JSON `{ name, goal }`.
 * Appends `slice-created` event (domain: entity-lifecycle) to the
 * epic-scope events.jsonl.
 */
export const sliceCreateCommand = defineCommand({
	meta: {
		name: "slice:create",
		description:
			"Create a new slice. Accepts --name flag or stdin JSON { name, goal }. Requires --epic.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name (required)",
			required: true,
		},
		name: {
			type: "string",
			description: "Slice name (used as directory slug)",
			required: false,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const name = (args.name as string | undefined) ?? (stdin.name as string | undefined);

		if (name === undefined || name === "") {
			const errorOutput = {
				ok: false,
				error: "Slice name is required via --name flag or stdin JSON { name }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Slice name is required\n`);
			}
			process.exit(1);
		}

		const goal = stdin.goal as string | undefined;

		const ctx = createEventCommandContext(args, { requireSlice: false });

		// Create slice directory within the epic
		const sliceDir = path.join(ctx.goodplanDir, "epics", ctx.epicName, "slices", name);
		fs.mkdirSync(sliceDir, { recursive: true });

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:slice:create" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "slice-created",
				payload: {
					sliceRef: name,
					directory: name,
					...(goal !== undefined ? { goal } : {}),
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `slice:${name}` }, args);
			} else if (!args.quiet) {
				output(`Created slice ${pc.bold(name)} in epic ${pc.bold(ctx.epicName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
