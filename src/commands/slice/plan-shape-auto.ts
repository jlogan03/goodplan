import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp slice:plan-shape-auto --epic <name> --slice <name>` (v2)
 *
 * Emits `plan-shape-checkpoint-auto-shaped` with domain "entity-lifecycle".
 * Accepts optional stdin JSON `{ preference }` (defaults to "best-guess-and-flag").
 */
export const slicePlanShapeAutoCommand = defineCommand({
	meta: {
		name: "slice:plan-shape-auto",
		description: "Auto-shape the plan checkpoint for a slice.",
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
		const preference = (stdin.preference as string | undefined) ?? "best-guess-and-flag";

		const validPreferences = ["always-consult", "best-guess-and-flag", "ask-in-the-moment"];
		if (!validPreferences.includes(preference)) {
			const errorOutput = {
				ok: false,
				error: `Invalid preference: "${preference}". Must be one of: ${validPreferences.join(", ")}`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const ctx = createEventCommandContext(args, { requireSlice: true });

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:slice:plan-shape-auto" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "plan-shape-checkpoint-auto-shaped",
				payload: {
					sliceRef: ctx.sliceName,
					preference,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `slice:${ctx.sliceName}` }, args);
			} else if (!args.quiet) {
				output(
					`Plan shape auto-shaped for slice ${pc.bold(ctx.sliceName)} in epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
