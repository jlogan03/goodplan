import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson } from "../../core/tree.js";
import type { Task } from "../../schemas/entities/task.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp task:show --task <name>` — show full task entity.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Returns the full task.json content for the named task.
 */
export const taskShowCommand = defineCommand({
	meta: {
		name: "task:show",
		description: "Show full task entity details. Requires --task flag.",
	},
	args: {
		...globalArgs,
		task: {
			type: "string",
			description: "Task name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const task = getJson<Task>(state, `tasks/${args.task}/task.json`);
		if (task === undefined) {
			throw new GoodplanError("DATA_FILE_NOT_FOUND", `Task '${args.task}' not found`);
		}

		if (args.json || args.query) {
			output(task, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(`${pc.bold(task.name)}  ${task.status}`);
			lines.push(`  Title: ${task.title}`);
			if (task.description !== undefined) {
				lines.push(`  Description: ${task.description}`);
			}
			lines.push(`  Created: ${task.created}`);

			// Context fields
			const ctx = task.context;
			if (ctx.gitBranch !== undefined) {
				lines.push(`  Git Branch: ${ctx.gitBranch}`);
			}
			if (ctx.activeEpic !== undefined) {
				lines.push(`  Active Epic: ${ctx.activeEpic}`);
			}
			if (ctx.activeQuest !== undefined) {
				lines.push(`  Active Quest: ${ctx.activeQuest}`);
			}
			if (ctx.activeSlice !== undefined) {
				lines.push(`  Active Slice: ${ctx.activeSlice}`);
			}
			if (ctx.capturedDuring !== undefined) {
				lines.push(`  Captured During: ${ctx.capturedDuring}`);
			}

			if (task.convertedTo !== undefined) {
				lines.push(`  Converted To: ${task.convertedTo.type} (${task.convertedTo.name})`);
			}
			if (task.droppedReason !== undefined) {
				lines.push(`  Dropped Reason: ${task.droppedReason}`);
			}

			output(lines.join("\n"), args);
		}
	},
});
