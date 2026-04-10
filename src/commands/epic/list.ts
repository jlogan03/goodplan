import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { replayAllScopes } from "../../engine/derived-state/replay-all-scopes.js";
import { output } from "../../util/output.js";
import { applyPagination, formatPaginationFooter } from "../../util/pagination.js";
import { globalArgs, listArgs } from "../global-args.js";

/**
 * Epic summary for list output.
 */
interface EpicSummary {
	name: string;
	phase: string;
	active: boolean;
	paused: boolean;
	completed: boolean;
	abandoned: boolean;
}

/**
 * `gp epic:list` (v2) — list all epics from event-sourced state.
 *
 * Replays all scopes via replayAllScopes(), extracts epic entries
 * from DerivedStateData.epics Map.
 */
export const epicListCommand = defineCommand({
	meta: {
		name: "epic:list",
		description: "List all epics with phase, active status, and completion state.",
	},
	args: {
		...globalArgs,
		...listArgs,
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const state = await replayAllScopes(goodplanDir);

		const items: EpicSummary[] = [];
		for (const [name, epic] of state.epics) {
			items.push({
				name,
				phase: epic.phase,
				active: epic.active,
				paused: epic.paused,
				completed: epic.completed,
				abandoned: epic.abandoned,
			});
		}

		const paginated = applyPagination(items, args);

		if (args.json || args.query) {
			output(paginated, args);
		} else if (!args.quiet) {
			if (paginated.total === 0) {
				output("No epics found.", args);
			} else {
				const lines: string[] = [];
				if (paginated.items.length === 0) {
					lines.push("No epics in this range.");
				}
				for (const item of paginated.items) {
					const status = item.abandoned
						? pc.yellow("abandoned")
						: item.completed
							? pc.green("completed")
							: item.active
								? pc.cyan("active")
								: pc.dim(item.phase);
					lines.push(`  ${pc.bold(item.name)}  ${status}`);
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
