import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";
import { sideQuestArgs } from "./_shared.js";

/**
 * `gp side-quest:show` — show side-quest details (read-only).
 */
export const sideQuestShowCommand = defineCommand({
	meta: {
		name: "side-quest:show",
		description: "Show side-quest details.",
	},
	args: {
		...globalArgs,
		...sideQuestArgs,
	},
	setup() {},
	async run({ args }) {
		const sideQuestName = args["side-quest"] as string;
		const goodplanDir = resolveProjectDir();
		const eventsPath = path.join(goodplanDir, "side-quests", sideQuestName, "events.jsonl");

		if (!fs.existsSync(eventsPath)) {
			const errorOutput = {
				ok: false,
				error: `Side-quest '${sideQuestName}' not found`,
				code: "ENTITY_NOT_FOUND",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const { events } = await replayEvents({ eventsPath });
		const state = computeDerivedState(events);
		const sq = state.sideQuests.get(sideQuestName);

		const detail = {
			name: sideQuestName,
			phase: sq?.phase ?? "S0",
			goal: sq?.goal ?? null,
			plan: sq?.plan ?? null,
			active: sq?.active ?? false,
			landed: sq?.landed ?? false,
			abandoned: sq?.abandoned ?? false,
			planShapeApproved: sq?.planShapeApproved ?? false,
			chunks: sq !== undefined ? Array.from(sq.chunks.values()) : [],
			eventCount: events.length,
		};

		if (args.json || args.query) {
			output(detail, args);
		} else if (!args.quiet) {
			const lines: string[] = [
				`${pc.bold("Side-quest")}: ${sideQuestName}`,
				`  Phase: ${detail.phase}`,
				`  Active: ${detail.active}`,
				`  Landed: ${detail.landed}`,
				`  Abandoned: ${detail.abandoned}`,
				`  Plan shape approved: ${detail.planShapeApproved}`,
				`  Chunks: ${detail.chunks.length}`,
				`  Events: ${detail.eventCount}`,
			];
			output(lines.join("\n"), args);
		}
	},
});
