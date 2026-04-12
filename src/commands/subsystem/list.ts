import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { applyPagination, formatPaginationFooter } from "../../util/pagination.js";
import { globalArgs, listArgs } from "../global-args.js";

/**
 * Subsystem summary for list output.
 */
interface SubsystemSummary {
	name: string;
	maturity: string;
	owns: string[];
	retired: boolean;
}

/**
 * `gp subsystem:list` — list all registered subsystems from project events.
 */
export const subsystemListCommand = defineCommand({
	meta: {
		name: "subsystem:list",
		description: "List all registered subsystems with maturity and ownership.",
	},
	args: {
		...globalArgs,
		...listArgs,
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const projectEventsPath = `${goodplanDir}/events.jsonl`;
		const { events } = await replayEvents({ eventsPath: projectEventsPath });
		const state = computeDerivedState(events);

		const items: SubsystemSummary[] = [];
		for (const [, sub] of state.subsystems) {
			items.push({
				name: sub.name,
				maturity: sub.maturity,
				owns: [...sub.owns],
				retired: sub.retired,
			});
		}

		const paginated = applyPagination(items, args);

		if (args.json || args.query) {
			output(paginated, args);
		} else if (!args.quiet) {
			if (paginated.total === 0) {
				output("No subsystems found.", args);
			} else {
				const lines: string[] = [];
				for (const item of paginated.items) {
					const status = item.retired ? pc.yellow("retired") : pc.cyan(item.maturity);
					lines.push(`  ${pc.bold(item.name)}  ${status}  owns=${item.owns.join(",")}`);
				}
				const footer = formatPaginationFooter(paginated);
				if (footer !== undefined) {
					lines.push(footer);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
