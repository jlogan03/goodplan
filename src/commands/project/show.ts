import { defineCommand } from "citty";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp project:show` — show project metadata and subsystem summary.
 *
 * Replays the project event log via `computeDerivedState()` and returns
 * project state (name, version, steeringPreference, initialized) plus
 * a summary of registered subsystems.
 */
export const projectShowCommand = defineCommand({
	meta: {
		name: "project:show",
		description: "Show project metadata and subsystem summary.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const projectEventsPath = `${goodplanDir}/events.jsonl`;
		const { events } = await replayEvents({ eventsPath: projectEventsPath });
		const state = computeDerivedState(events);

		const subsystemItems: Array<{
			name: string;
			maturity: string;
			owns: string[];
			retired: boolean;
		}> = [];
		for (const [, sub] of state.subsystems) {
			subsystemItems.push({
				name: sub.name,
				maturity: sub.maturity,
				owns: sub.owns,
				retired: sub.retired,
			});
		}

		if (args.json || args.query) {
			output(
				{
					ok: true,
					name: state.project.name,
					version: state.project.version,
					steeringPreference: state.project.steeringPreference,
					initialized: state.project.initialized,
					subsystems: subsystemItems,
				},
				args,
			);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(`Project: ${state.project.name}`);
			lines.push(`Version: ${state.project.version}`);
			lines.push(`Steering: ${state.project.steeringPreference}`);
			lines.push(`Initialized: ${state.project.initialized}`);
			if (subsystemItems.length > 0) {
				lines.push(`\nSubsystems (${subsystemItems.length}):`);
				for (const sub of subsystemItems) {
					const status = sub.retired ? "retired" : sub.maturity;
					lines.push(`  ${sub.name} (${status})`);
				}
			}
			output(lines.join("\n"), args);
		}
	},
});
