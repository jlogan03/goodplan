import { defineCommand } from "citty";
import pc from "picocolors";
import { detectArtifacts } from "../../core/artifacts.js";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getDir, getJson } from "../../core/tree.js";
import type { Slice } from "../../schemas/entities/slice.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan slice:show --slice <name>` — show full slice entity.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Returns the full slice.json content for the named slice.
 */
export const sliceShowCommand = defineCommand({
	meta: {
		name: "slice:show",
		description: "Show full slice entity details. Requires --slice flag.",
	},
	args: {
		...globalArgs,
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const slice = getJson<Slice>(state, `slices/${args.slice}/slice.json`);
		if (slice === undefined) {
			throw new GoodplanError("DATA_FILE_NOT_FOUND", `Slice '${args.slice}' not found`);
		}

		if (args.json || args.query) {
			const artifacts = detectArtifacts(getDir(state, `slices/${args.slice}`), "slice", slice);
			output({ ...slice, artifacts }, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(`${pc.bold(slice.name)}  ${slice.status}  (epic: ${slice.epic})`);
			lines.push(`  Goal: ${slice.goal}`);
			lines.push(`  Created: ${slice.created}`);
			lines.push(`  Updated: ${slice.updated}`);
			if (slice.deferred.length > 0) {
				lines.push(`  Deferred: ${slice.deferred.length}`);
			}
			if (slice.refinement !== null) {
				lines.push(`  Refinement: round ${slice.refinement.round}/${slice.refinement.maxRounds}`);
			}
			output(lines.join("\n"), args);
		}
	},
});
