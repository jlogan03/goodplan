import { defineCommand } from "citty";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp briefing:latest` — return the most recent briefing for a given scope.
 *
 * Read-only command. Defaults to project scope.
 * Accepts --scope (project|epic) and --scope-ref (epic name) to filter.
 */
export const briefingLatestCommand = defineCommand({
	meta: {
		name: "briefing:latest",
		description: "Return the most recent briefing for a given scope.",
	},
	args: {
		...globalArgs,
		scope: {
			type: "string",
			description: 'Filter scope: "project" or "epic" (default: all)',
		},
		"scope-ref": {
			type: "string",
			description: "Scope reference (e.g., epic name) to filter by",
		},
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();

		// Collect events from project and all epics
		const allEvents: import("../../schemas/envelope.js").AnyEventEnvelope[] = [];

		// Project events
		const projectEventsPath = `${goodplanDir}/events.jsonl`;
		const { events: projectEvents } = await replayEvents({ eventsPath: projectEventsPath });
		allEvents.push(...projectEvents);

		// Epic events — scan for epic directories
		const epicsDirPath = `${goodplanDir}/epics`;
		const fs = await import("node:fs");
		if (fs.existsSync(epicsDirPath)) {
			const entries = fs.readdirSync(epicsDirPath, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const epicEventsPath = `${epicsDirPath}/${entry.name}/events.jsonl`;
					if (fs.existsSync(epicEventsPath)) {
						const { events: epicEvents } = await replayEvents({
							eventsPath: epicEventsPath,
						});
						allEvents.push(...epicEvents);
					}
				}
			}
		}

		const state = computeDerivedState(allEvents);

		// Filter briefings by scope if requested
		let filtered = [...state.briefings];
		const scopeFilter = args.scope as string | undefined;
		const scopeRefFilter = args["scope-ref"] as string | undefined;

		if (scopeFilter !== undefined) {
			filtered = filtered.filter((b) => b.scope === scopeFilter);
		}
		if (scopeRefFilter !== undefined) {
			filtered = filtered.filter((b) => b.scopeRef === scopeRefFilter);
		}

		// Get the latest (last in array, since they're appended chronologically)
		const latest = filtered.length > 0 ? (filtered[filtered.length - 1] ?? null) : null;

		if (args.json || args.query) {
			output({ ok: true, briefing: latest }, args);
		} else if (!args.quiet) {
			if (latest === null) {
				output("No briefings found.", args);
			} else {
				const lines: string[] = [];
				lines.push(
					`Scope: ${latest.scope}${latest.scopeRef !== null ? ` (${latest.scopeRef})` : ""}`,
				);
				lines.push(`Time: ${latest.timeContext}`);
				lines.push(`Position: ${latest.currentPosition}`);
				lines.push(`Last action: ${latest.lastAction}`);
				lines.push(`Stopped at: ${latest.whereStopped}`);
				lines.push(`Next action: ${latest.nextAction}`);
				if (latest.attentionItems.length > 0) {
					lines.push("Attention items:");
					for (const item of latest.attentionItems) {
						lines.push(`  - ${item}`);
					}
				}
				if (latest.deepLinks !== undefined && latest.deepLinks.length > 0) {
					lines.push("Deep links:");
					for (const link of latest.deepLinks) {
						lines.push(`  ${link.label}: ${link.path}`);
					}
				}
				lines.push(`Written at: ${latest.writtenAt}`);
				output(lines.join("\n"), args);
			}
		}
	},
});
