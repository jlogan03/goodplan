import { defineCommand } from "citty";
import pc from "picocolors";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { createEventCommandContext } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp finding:list --epic <name>` — list findings for an epic.
 *
 * Read-only command. Accepts optional --status filter.
 */
export const findingListCommand = defineCommand({
	meta: {
		name: "finding:list",
		description: "List findings for an epic. Accepts optional --status filter.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		status: {
			type: "string",
			description:
				'Filter by disposition status: "pending", "accepted", "dismissed", "deferred", or "untriaged" (alias for pending)',
		},
	},
	setup() {},
	async run({ args }) {
		const ctx = createEventCommandContext(args, { requireSlice: false });

		const { events } = await replayEvents({ eventsPath: ctx.epicEventsPath });
		const state = computeDerivedState(events);
		const epic = state.epics.get(ctx.epicName);

		if (epic === undefined) {
			const errorOutput = {
				ok: false,
				error: `Epic '${ctx.epicName}' not found in derived state`,
				code: "ENTITY_NOT_FOUND",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		let findings = [...epic.findings];

		// Apply status filter
		const statusFilter = args.status as string | undefined;
		if (statusFilter !== undefined) {
			const filterValue = statusFilter === "untriaged" ? "pending" : statusFilter;
			findings = findings.filter((f) => f.disposition === filterValue);
		}

		if (args.json || args.query) {
			output(
				{
					ok: true,
					total: findings.length,
					items: findings,
				},
				args,
			);
		} else if (!args.quiet) {
			if (findings.length === 0) {
				output("No findings found.", args);
			} else {
				const lines: string[] = [];
				lines.push(`Findings for epic ${pc.bold(ctx.epicName)} (${findings.length} total):`);
				for (const f of findings) {
					const status =
						f.disposition === "pending"
							? pc.yellow("pending")
							: f.disposition === "accepted"
								? pc.green("accepted")
								: f.disposition === "deferred"
									? pc.blue("deferred")
									: pc.dim("dismissed");
					lines.push(`  ${f.id.slice(0, 8)}  [${status}]  ${f.summary}`);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
