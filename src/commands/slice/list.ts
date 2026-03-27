import { defineCommand } from "citty";
import pc from "picocolors";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson } from "../../core/tree.js";
import type { EpicOverview, SliceOverviewItem } from "../../schemas/entities/overview.js";
import type { Project } from "../../schemas/entities/project.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

type SliceWithEpic = SliceOverviewItem & { epic: string };

/**
 * `goodplan slice:list [--epic <name>] [--all]` — list slices.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Reads epics/overview.json and returns embedded slice arrays.
 * Default: slices for --epic (or active epic). --all: all slices across all epics.
 */
export const sliceListCommand = defineCommand({
	meta: {
		name: "slice:list",
		description:
			"List slices. Default: active epic's slices. --epic filters by epic. --all shows all epics.",
	},
	args: {
		...globalArgs,
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
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const epicOverview = getJson<EpicOverview>(state, "epics/overview.json") ?? { items: [] };

		let items: SliceWithEpic[] = [];

		if (args.all) {
			// Flatten all epics' slices
			for (const epicItem of epicOverview.items) {
				for (const slice of epicItem.slices) {
					items.push({ ...slice, epic: epicItem.name });
				}
			}
		} else {
			// Filter to a specific epic
			let epicName = args.epic as string | undefined;
			if (epicName === undefined) {
				// Default to active epic from project.json
				const project = getJson<Project>(state, "project.json");
				epicName = project?.activeEpic ?? undefined;
			}
			if (epicName !== undefined) {
				const epicEntry = epicOverview.items.find((e) => e.name === epicName);
				if (epicEntry !== undefined) {
					for (const slice of epicEntry.slices) {
						items.push({ ...slice, epic: epicName });
					}
				}
			}
		}

		if (args.json || args.query) {
			output({ items }, args);
		} else if (!args.quiet) {
			if (items.length === 0) {
				output("No slices found.", args);
			} else if (args.all) {
				// Group by epic
				const byEpic = new Map<string, SliceWithEpic[]>();
				for (const item of items) {
					const group = byEpic.get(item.epic) ?? [];
					group.push(item);
					byEpic.set(item.epic, group);
				}
				const lines: string[] = [];
				for (const [epicName, slices] of byEpic) {
					lines.push(pc.bold(epicName));
					for (const item of slices) {
						const completedStr = item.completed !== null ? ` (completed ${item.completed})` : "";
						lines.push(`  ${pc.bold(item.name)}  ${item.status}${completedStr}`);
					}
				}
				output(lines.join("\n"), args);
			} else {
				const lines: string[] = [];
				for (const item of items) {
					const completedStr = item.completed !== null ? ` (completed ${item.completed})` : "";
					lines.push(`  ${pc.bold(item.name)}  ${item.status}${completedStr}`);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
