import { defineCommand } from "citty";
import pc from "picocolors";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp subsystem:retire --name <name>` — retire a subsystem.
 */
export const subsystemRetireCommand = defineCommand({
	meta: {
		name: "subsystem:retire",
		description: "Retire a subsystem. Requires --name flag.",
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
		const ctx = createProjectCommandContext();
		const name = args.name as string;

		// Verify subsystem exists and is not already retired
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

		if (existing.retired) {
			const errorOutput = {
				ok: false,
				error: `Subsystem '${name}' is already retired`,
				code: "ENTITY_ALREADY_RETIRED",
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
				actor: { kind: "cli", id: "gp:subsystem:retire" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "spine",
				type: "subsystem-retired",
				payload: { name },
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `subsystem:${name}` }, args);
			} else if (!args.quiet) {
				output(`Retired subsystem ${pc.bold(name)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
