import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp side-quest:list` — list all side-quests (read-only).
 *
 * Scans `.goodplan/side-quests/` for directories with events.jsonl,
 * replays each to build state.
 */
export const sideQuestListCommand = defineCommand({
	meta: {
		name: "side-quest:list",
		description: "List all side-quests with status.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const sqBaseDir = path.join(goodplanDir, "side-quests");

		const items: Array<{
			name: string;
			phase: string;
			active: boolean;
			landed: boolean;
			abandoned: boolean;
		}> = [];

		if (fs.existsSync(sqBaseDir)) {
			const dirs = fs.readdirSync(sqBaseDir, { withFileTypes: true });
			for (const d of dirs) {
				if (!d.isDirectory()) continue;
				const eventsPath = path.join(sqBaseDir, d.name, "events.jsonl");
				if (!fs.existsSync(eventsPath)) continue;

				const { events } = await replayEvents({ eventsPath });
				const state = computeDerivedState(events);
				const sq = state.sideQuests.get(d.name);

				items.push({
					name: d.name,
					phase: sq?.phase ?? "S0",
					active: sq?.active ?? false,
					landed: sq?.landed ?? false,
					abandoned: sq?.abandoned ?? false,
				});
			}
		}

		if (args.json || args.query) {
			output({ items, total: items.length }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No side-quests found.", args);
			} else {
				const lines: string[] = [];
				for (const item of items) {
					const status = item.abandoned
						? pc.red("abandoned")
						: item.landed
							? pc.green("landed")
							: item.active
								? pc.cyan("active")
								: pc.dim("created");
					lines.push(`  ${pc.bold(item.name)} ${item.phase} ${status}`);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
