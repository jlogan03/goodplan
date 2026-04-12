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
 * Read v1 overview.json and extract slices for a specific epic.
 * TODO: Remove after slice 12 completes v1-to-v2 migration.
 */
function readV1Slices(goodplanDir: string, epicName: string): SliceListItem[] {
	const overviewPath = path.join(goodplanDir, "overview.json");
	if (!fs.existsSync(overviewPath)) return [];
	try {
		const raw = JSON.parse(fs.readFileSync(overviewPath, "utf-8")) as {
			epics?: Array<{ name: string; slices?: Array<{ name: string; status: string }> }>;
		};
		const epicEntry = raw.epics?.find((e) => e.name === epicName);
		if (epicEntry?.slices === undefined) return [];
		return epicEntry.slices.map((s) => ({
			dir: s.name,
			phase: s.status,
			abandoned: s.status === "abandoned",
			epic: epicName,
		}));
	} catch {
		return [];
	}
}

/**
 * Read v1 overview.json and extract slices across all epics.
 * TODO: Remove after slice 12 completes v1-to-v2 migration.
 */
function readV1AllSlices(goodplanDir: string): SliceListItem[] {
	const overviewPath = path.join(goodplanDir, "overview.json");
	if (!fs.existsSync(overviewPath)) return [];
	try {
		const raw = JSON.parse(fs.readFileSync(overviewPath, "utf-8")) as {
			epics?: Array<{ name: string; slices?: Array<{ name: string; status: string }> }>;
		};
		const items: SliceListItem[] = [];
		for (const epicEntry of raw.epics ?? []) {
			for (const s of epicEntry.slices ?? []) {
				items.push({
					dir: s.name,
					phase: s.status,
					abandoned: s.status === "abandoned",
					epic: epicEntry.name,
				});
			}
		}
		return items;
	} catch {
		return [];
	}
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
 * Check if any slice-created events exist for this epic.
 */
function hasSliceCreatedEvents(slices: ReadonlyMap<string, SliceState>): boolean {
	return slices.size > 0;
}

/**
 * `gp slice:list [--epic <name>] [--all]` (v2) — list slices from event-sourced state.
 *
 * Default: slices for --epic (required unless --all is set).
 * --all: slices across all epics via replayAllScopes.
 *
 * v1 fallback: when no slice-created events exist, falls back to overview.json.
 * TODO: Remove v1 fallback after slice 12 completes migration.
 */
export const sliceListCommand = defineCommand({
	meta: {
		name: "slice:list",
		description:
			"List slices. --epic filters by epic. --all shows all epics. Falls back to v1 overview.json when no v2 events exist.",
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
			let hasAnyV2Slices = false;
			for (const [epicName, epicState] of state.epics) {
				if (hasSliceCreatedEvents(epicState.slices)) {
					hasAnyV2Slices = true;
					allItems.push(...sliceStateToListItems(epicState.slices, epicName));
				}
			}
			// v1 fallback: if no v2 slice events found across any epic
			if (!hasAnyV2Slices) {
				allItems = readV1AllSlices(goodplanDir);
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
				if (epicState !== undefined && hasSliceCreatedEvents(epicState.slices)) {
					allItems = sliceStateToListItems(epicState.slices, epicName);
				} else {
					// v1 fallback for this epic
					allItems = readV1Slices(goodplanDir, epicName);
				}
			} else {
				// Epic events file doesn't exist -- try v1 fallback
				allItems = readV1Slices(goodplanDir, epicName);
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
