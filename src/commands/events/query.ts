import { defineCommand } from "citty";
import { resolveProjectDir } from "../../core/data/project.js";
import type { ReplayFilter } from "../../engine/events/replay.js";
import { replayEvents } from "../../engine/events/replay.js";
import type { EventDomain } from "../../schemas/envelope.js";
import { GoodplanError } from "../../util/errors.js";
import { output, outputError } from "../../util/output.js";
import { type EventScope, resolveScopePath } from "../_shared/resolve-scope-path.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp events:query` — filter events from a scope's event log.
 *
 * Read-only command. No mutations, no event emission.
 * Accepts domain, type, after/before timestamp filters.
 * Defaults to project scope with limit of 50.
 */
export const eventsQueryCommand = defineCommand({
	meta: {
		name: "events:query",
		description: "Query and filter events from a scope's event log.",
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
		domain: {
			type: "string",
			description: "Filter by event domain (e.g., spine, entity-lifecycle, briefing)",
		},
		type: {
			type: "string",
			description: "Filter by event type (e.g., epic-created, slice-created)",
		},
		after: {
			type: "string",
			description: "Only events at or after this ISO-8601 timestamp",
		},
		before: {
			type: "string",
			description: "Only events at or before this ISO-8601 timestamp",
		},
		limit: {
			type: "string",
			description: "Maximum number of events to return (default: 50)",
		},
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const scope: EventScope = (args.scope as EventScope | undefined) ?? "project";
		const scopeRef = args["scope-ref"] as string | undefined;
		const limit = args.limit !== undefined ? Number.parseInt(args.limit as string, 10) : 50;

		if (Number.isNaN(limit) || limit < 1) {
			const error = new GoodplanError(
				"VALIDATION_INVALID_INPUT",
				"--limit must be a positive integer",
			);
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

		// Build the ReplayFilter using conditional spread for exactOptionalPropertyTypes
		const domain = args.domain as string | undefined;
		const type = args.type as string | undefined;
		const after = args.after as string | undefined;
		const before = args.before as string | undefined;

		const filter: ReplayFilter = {
			...(domain !== undefined ? { domain: domain as EventDomain } : {}),
			...(type !== undefined ? { type } : {}),
			...(after !== undefined ? { since: after } : {}),
			...(after !== undefined && before !== undefined
				? { timeRange: { start: after, end: before } }
				: {}),
		};

		// If only --before is specified without --after, use a timeRange from epoch start
		if (after === undefined && before !== undefined) {
			filter.timeRange = { start: "1970-01-01T00:00:00.000Z", end: before };
		}

		const { events } = await replayEvents({ eventsPath, filter });
		const items = events.slice(0, limit);

		if (args.json || args.query) {
			output({ ok: true, total: items.length, items }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No matching events found.", args);
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
