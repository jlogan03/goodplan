import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp subsystem:show --name <name>` — show full details for a subsystem.
 */
export const subsystemShowCommand = defineCommand({
	meta: {
		name: "subsystem:show",
		description: "Show full subsystem details. Requires --name flag.",
	},
	args: {
		...globalArgs,
		name: {
			type: "string",
			description: "Subsystem name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const projectEventsPath = `${goodplanDir}/events.jsonl`;
		const { events } = await replayEvents({ eventsPath: projectEventsPath });
		const state = computeDerivedState(events);

		const name = args.name as string;
		const sub = state.subsystems.get(name);

		if (sub === undefined) {
			const errorOutput = {
				ok: false,
				error: `Subsystem '${name}' not found`,
				code: "ENTITY_NOT_FOUND",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		if (args.json || args.query) {
			output(
				{
					ok: true,
					name: sub.name,
					maturity: sub.maturity,
					owns: sub.owns,
					retired: sub.retired,
				},
				args,
			);
		} else if (!args.quiet) {
			const lines: string[] = [];
			const status = sub.retired ? pc.yellow("retired") : pc.cyan(sub.maturity);
			lines.push(`${pc.bold(sub.name)}  ${status}`);
			lines.push(`  Maturity: ${sub.maturity}`);
			lines.push(`  Owns: ${sub.owns.join(", ")}`);
			lines.push(`  Retired: ${sub.retired}`);
			output(lines.join("\n"), args);
		}
	},
});
