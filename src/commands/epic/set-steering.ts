import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { output } from "../../util/output.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

const VALID_PREFERENCES = ["always-consult", "best-guess-and-flag", "ask-in-the-moment"] as const;

/**
 * `gp epic:set-steering --epic <name> --preference <pref>` (v2) — set steering preference.
 *
 * Emits `epic-steering-preference-set` with domain "pause-steering".
 */
export const epicSetSteeringCommand = defineCommand({
	meta: {
		name: "epic:set-steering",
		description: "Set the steering preference for an epic.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		preference: {
			type: "string",
			description: "Steering preference: always-consult, best-guess-and-flag, or ask-in-the-moment",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const preference = args.preference as string;
		if (!(VALID_PREFERENCES as readonly string[]).includes(preference)) {
			const errorOutput = {
				ok: false,
				error: `Invalid preference: "${preference}". Must be one of: ${VALID_PREFERENCES.join(", ")}`,
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
				actor: { kind: "cli", id: "gp:epic:set-steering" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "pause-steering",
				type: "epic-steering-preference-set",
				payload: { preference },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${ctx.epicName}` }, args);
			} else if (!args.quiet) {
				output(
					`Steering preference set to ${pc.bold(preference)} for epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
