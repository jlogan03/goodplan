import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { setSteeringInputSchema } from "../../schemas/commands/project.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp project:set-steering` — set the project-level steering preference.
 *
 * Stdin: { "preference": "best-guess-and-flag" }
 *
 * Appends a `steering-preference-set` event with `domain: "pause-steering"`
 * and `scopeRef: null` (project scope). The existing `reducePauseSteering`
 * already handles this event type.
 */
export const projectSetSteeringCommand = defineCommand({
	meta: {
		name: "project:set-steering",
		description: "Set the project steering preference. Accepts stdin JSON { preference }.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = setSteeringInputSchema.safeParse(stdin);

		if (!parsed.success) {
			const errorOutput = {
				ok: false,
				error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const ctx = createProjectCommandContext();

		try {
			const result = await appendEvent({
				eventsPath: ctx.projectEventsPath,
				scope: "project",
				scopeRef: null,
				actor: { kind: "cli", id: "gp:project:set-steering" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "pause-steering",
				type: "steering-preference-set",
				payload: {
					preference: parsed.data.preference,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: "project" }, args);
			} else if (!args.quiet) {
				output(`Steering preference set to ${pc.bold(parsed.data.preference)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
