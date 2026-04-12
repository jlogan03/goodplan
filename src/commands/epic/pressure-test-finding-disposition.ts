import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:pressure-test-finding-disposition --epic <name> --finding <id> --disposition <accepted|dismissed>` (v2)
 *
 * Emits `pressure-test-finding-accepted` with domain "entity-lifecycle".
 */
export const epicPressureTestFindingDispositionCommand = defineCommand({
	meta: {
		name: "epic:pressure-test-finding-disposition",
		description: "Set the disposition of a pressure test finding.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		finding: {
			type: "string",
			description: "Finding ID",
			required: true,
		},
		disposition: {
			type: "string",
			description: "Disposition: accepted or dismissed",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const disposition = args.disposition as string;
		const validDispositions = ["accepted", "dismissed"];
		if (!validDispositions.includes(disposition)) {
			const errorOutput = {
				ok: false,
				error: `Invalid disposition: "${disposition}". Must be one of: ${validDispositions.join(", ")}`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const ctx = createEventCommandContext(args, { requireSlice: false });

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:epic:pressure-test-finding-disposition" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "pressure-test-finding-accepted",
				payload: { findingId: args.finding as string, disposition },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${ctx.epicName}` }, args);
			} else if (!args.quiet) {
				output(
					`Finding ${pc.bold(args.finding as string)} ${disposition} for epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
