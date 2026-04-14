import { defineCommand } from "citty";
import { resolveProjectDir } from "../../core/data/project.js";
import { replayEvents } from "../../engine/events/replay.js";
import { GoodplanError } from "../../util/errors.js";
import { output, outputError } from "../../util/output.js";
import { type EventScope, resolveScopePath } from "../_shared/resolve-scope-path.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp events:tail` — return the last N events from a scope's event log.
 *
 * Read-only command. No mutations, no event emission.
 * Defaults to project scope with limit of 10.
 */
export const eventsTailCommand = defineCommand({
	meta: {
		name: "events:tail",
		description: "Return the last N events from a scope's event log.",
	},
	args: {
		...globalArgs,
		scope: {
			type: "string",
			description: 'Event log scope: "project" or "epic" (default: "project")',
		},
		"scope-ref": {
			type: "string",
			description: "Scope reference (e.g., epic name). Required when --scope is epic.",
		},
		n: {
			type: "string",
			description: "Number of events to return (default: 10)",
		},
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const scope: EventScope = (args.scope as EventScope | undefined) ?? "project";
		const scopeRef = args["scope-ref"] as string | undefined;
		const limit = args.n !== undefined ? Number.parseInt(args.n as string, 10) : 10;

		if (Number.isNaN(limit) || limit < 1) {
			const error = new GoodplanError("VALIDATION_INVALID_INPUT", "-n must be a positive integer");
			outputError(error, args);
			process.exit(2);
		}

		let eventsPath: string;
		try {
			eventsPath = resolveScopePath(scope, scopeRef, goodplanDir);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const error = new GoodplanError("VALIDATION_INVALID_INPUT", message);
			outputError(error, args);
			process.exit(2);
		}

		const { events } = await replayEvents({ eventsPath });
		const items = events.slice(-limit);

		if (args.json || args.query) {
			output({ ok: true, total: items.length, items }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No events found.", args);
			} else {
				const lines: string[] = [];
				for (const event of items) {
					lines.push(`[${event.ts}] ${event.domain}/${event.type} (${event.id})`);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
