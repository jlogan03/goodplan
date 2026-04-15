import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { serializeDerivedState } from "../../engine/derived-state/serialize.js";
import { replayEvents } from "../../engine/events/replay.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:show --epic <name>` (v2) — show epic state from event replay.
 *
 * Replays the epic's events and returns the EpicState projection
 * from derived state computation.
 */
export const epicShowCommand = defineCommand({
	meta: {
		name: "epic:show",
		description: "Show full epic entity details from event-sourced state. Requires --epic flag.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const epicName = args.epic as string;
		const epicEventsPath = path.join(goodplanDir, "epics", epicName, "events.jsonl");

		if (!fs.existsSync(epicEventsPath)) {
			const errorOutput = {
				ok: false,
				error: `Epic '${epicName}' not found`,
				code: "ENTITY_NOT_FOUND",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Epic '${epicName}' not found\n`);
			}
			process.exit(1);
		}

		const { events } = await replayEvents({ eventsPath: epicEventsPath });
		const state = computeDerivedState(events);
		const epicState = state.epics.get(epicName);

		if (epicState === undefined) {
			throw new GoodplanError(
				"DATA_FILE_NOT_FOUND",
				`Epic '${epicName}' has events but no derived state`,
			);
		}

		// Serialize the epic state for output (Maps -> Records)
		const serialized = serializeDerivedState(state);
		const epicData = serialized.epics[epicName];

		if (args.json || args.query) {
			output({ ok: true, ...epicData }, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(`${pc.bold(epicName)}  phase=${epicState.phase}`);
			lines.push(`  Active: ${epicState.active}`);
			lines.push(`  Paused: ${epicState.paused}`);
			lines.push(`  Completed: ${epicState.completed}`);
			lines.push(`  Abandoned: ${epicState.abandoned}`);
			if (epicState.goal !== null) {
				lines.push(`  Goal: ${epicState.goal.sha.slice(0, 8)}...`);
			}
			output(lines.join("\n"), args);
		}
	},
});
