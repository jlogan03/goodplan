import { defineCommand } from "citty";
import pc from "picocolors";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { updateMaturityInputSchema } from "../../schemas/commands/subsystem.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp subsystem:update-maturity --name <name>` — update a subsystem's maturity level.
 *
 * Stdin: { "maturity": "stable" }
 */
export const subsystemUpdateMaturityCommand = defineCommand({
	meta: {
		name: "subsystem:update-maturity",
		description:
			"Update a subsystem's maturity level. Requires --name flag and stdin JSON { maturity }.",
	},
	args: {
		...globalArgs,
		name: {
			type: "string",
			description: "Subsystem name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = updateMaturityInputSchema.safeParse(stdin);

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
		const name = args.name as string;

		// Verify subsystem exists
		const { events } = await replayEvents({ eventsPath: ctx.projectEventsPath });
		const state = computeDerivedState(events);
		const existing = state.subsystems.get(name);

		if (existing === undefined) {
			const errorOutput = {
				ok: false,
				error: `Subsystem '${name}' not found`,
				code: "ENTITY_NOT_FOUND",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		try {
			const result = await appendEvent({
				eventsPath: ctx.projectEventsPath,
				scope: "project",
				scopeRef: null,
				actor: { kind: "cli", id: "gp:subsystem:update-maturity" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "spine",
				type: "subsystem-maturity-updated",
				payload: {
					name,
					maturity: parsed.data.maturity,
					previousMaturity: existing.maturity,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `subsystem:${name}` }, args);
			} else if (!args.quiet) {
				output(
					`Updated ${pc.bold(name)} maturity: ${existing.maturity} -> ${parsed.data.maturity}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
