import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayAllScopes } from "../../engine/derived-state/replay-all-scopes.js";
import { replayEvents } from "../../engine/events/replay.js";
import type { SliceState } from "../../schemas/entities/derived-state.js";
import { output } from "../../util/output.js";
import { applyPagination, formatPaginationFooter } from "../../util/pagination.js";
import { globalArgs, listArgs } from "../global-args.js";

/**
 * Serialized slice summary for list output.
 * Maps -> Records for JSON serialization.
 */
interface SliceListItem {
	dir: string;
	phase: string;
	abandoned: boolean;
	epic: string;
}

/**
 * Convert DerivedState slice entries to list items.
 */
function sliceStateToListItems(
	slices: ReadonlyMap<string, SliceState>,
	epicName: string,
): SliceListItem[] {
	const items: SliceListItem[] = [];
	for (const [dir, slice] of slices) {
		items.push({
			dir,
			phase: slice.phase,
			abandoned: slice.abandoned,
			epic: epicName,
		});
	}
	return items;
}

/**
 * `gp slice:list [--epic <name>] [--all]` — list slices from event-sourced state.
 *
 * Default: slices for --epic (required unless --all is set).
 * --all: slices across all epics via replayAllScopes.
 */
export const sliceListCommand = defineCommand({
	meta: {
		name: "slice:list",
		description: "List slices. --epic filters by epic. --all shows all epics.",
	},
	args: {
		...globalArgs,
		...listArgs,
		epic: {
			type: "string",
			description: "Filter by epic name",
		},
		all: {
			type: "boolean",
			description: "Show slices from all epics",
			default: false,
		},
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		let allItems: SliceListItem[] = [];

		if (args.all) {
			// Replay all scopes and collect slices from every epic
			const state = await replayAllScopes(goodplanDir);
			for (const [epicName, epicState] of state.epics) {
				allItems.push(...sliceStateToListItems(epicState.slices, epicName));
			}
		} else {
			const epicName = args.epic as string | undefined;
			if (epicName === undefined || epicName === "") {
				const errorOutput = {
					ok: false,
					error: "Epic name is required via --epic flag (or use --all)",
					code: "VALIDATION_INVALID_INPUT",
				};
				if (args.json || args.query) {
					output(errorOutput, args);
				} else {
					process.stderr.write("Error: Epic name is required via --epic flag (or use --all)\n");
				}
				process.exit(1);
			}

			const epicEventsPath = path.join(goodplanDir, "epics", epicName, "events.jsonl");
			if (fs.existsSync(epicEventsPath)) {
				const { events } = await replayEvents({ eventsPath: epicEventsPath });
				const state = computeDerivedState(events);
				const epicState = state.epics.get(epicName);
				if (epicState !== undefined) {
					allItems = sliceStateToListItems(epicState.slices, epicName);
				}
			}
		}

		const paginated = applyPagination(allItems, args);

		if (args.json || args.query) {
			output(paginated, args);
		} else if (!args.quiet) {
			if (paginated.total === 0) {
				output("No slices found.", args);
			} else if (paginated.items.length === 0) {
				const lines: string[] = ["No slices in this range."];
				const footer = formatPaginationFooter(paginated);
				if (footer !== undefined) {
					lines.push(footer);
				}
				output(lines.join("\n"), args);
			} else if (args.all) {
				// Group by epic
				const byEpic = new Map<string, SliceListItem[]>();
				for (const item of paginated.items) {
					const group = byEpic.get(item.epic) ?? [];
					group.push(item);
					byEpic.set(item.epic, group);
				}
				const lines: string[] = [];
				for (const [epicName, slices] of byEpic) {
					lines.push(pc.bold(epicName));
					for (const item of slices) {
						const status = item.abandoned ? pc.yellow("abandoned") : pc.dim(item.phase);
						lines.push(`  ${pc.bold(item.dir)}  ${status}`);
					}
				}
				const footer = formatPaginationFooter(paginated);
				if (footer !== undefined) {
					lines.push(footer);
				}
				output(lines.join("\n"), args);
			} else {
				const lines: string[] = [];
				for (const item of paginated.items) {
					const status = item.abandoned ? pc.yellow("abandoned") : pc.dim(item.phase);
					lines.push(`  ${pc.bold(item.dir)}  ${status}`);
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
