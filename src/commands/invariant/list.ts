import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayEvents } from "../../engine/events/replay.js";
import { createCoreRegistry } from "../../engine/invariants/index.js";
import { output } from "../../util/output.js";
import { applyPagination, formatPaginationFooter } from "../../util/pagination.js";
import { globalArgs, listArgs } from "../global-args.js";

/**
 * Summary for list output — combines core and custom invariants.
 */
interface InvariantSummary {
	id: string;
	description: string;
	type: "core" | "custom";
	active: boolean;
}

/**
 * `gp invariant:list` — list all invariant rules (core + custom).
 */
export const invariantListCommand = defineCommand({
	meta: {
		name: "invariant:list",
		description: "List all invariant rules (core and custom).",
	},
	args: {
		...globalArgs,
		...listArgs,
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const projectEventsPath = `${goodplanDir}/events.jsonl`;
		const { events } = await replayEvents({ eventsPath: projectEventsPath });
		const state = computeDerivedState(events);

		const items: InvariantSummary[] = [];

		// Core invariants from the registry
		const registry = createCoreRegistry();
		for (const rule of registry.getAll()) {
			items.push({
				id: rule.id,
				description: rule.description,
				type: "core",
				active: true,
			});
		}

		// Custom invariants from derived state
		for (const [, inv] of state.customInvariants) {
			items.push({
				id: inv.id,
				description: inv.description,
				type: "custom",
				active: inv.status === "active",
			});
		}

		const paginated = applyPagination(items, args);

		if (args.json || args.query) {
			output(paginated, args);
		} else if (!args.quiet) {
			if (paginated.total === 0) {
				output("No invariants found.", args);
			} else {
				const lines: string[] = [];
				for (const item of paginated.items) {
					const status = item.active ? pc.green("active") : pc.yellow("inactive");
					const typeLabel = item.type === "core" ? pc.dim("core") : pc.cyan("custom");
					lines.push(`  ${pc.bold(item.id)}  ${typeLabel}  ${status}`);
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
