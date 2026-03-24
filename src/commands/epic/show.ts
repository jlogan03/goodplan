import { defineCommand } from "citty";
import pc from "picocolors";
import { detectArtifacts } from "../../core/artifacts.js";
import { loadState } from "../../core/data/load.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getDir, getJson } from "../../core/tree.js";
import type { Epic } from "../../schemas/entities/epic.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan epic:show --epic <name>` — show full epic entity.
 *
 * Read-only: goes directly to the data layer, no RPC.
 * Returns the full epic.json content for the named epic.
 */
export const epicShowCommand = defineCommand({
	meta: {
		name: "epic:show",
		description: "Show full epic entity details. Requires --epic flag.",
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
		const projectDir = resolveProjectDir();
		const state = loadState(projectDir);

		const epic = getJson<Epic>(state, `epics/${args.epic}/epic.json`);
		if (epic === undefined) {
			throw new GoodplanError("DATA_FILE_NOT_FOUND", `Epic '${args.epic}' not found`);
		}

		if (args.json || args.query) {
			const artifacts = detectArtifacts(getDir(state, `epics/${args.epic}`), "epic", epic);
			output({ ...epic, artifacts }, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(`${pc.bold(epic.name)}  ${epic.status}`);
			lines.push(`  Goal: ${epic.goal}`);
			lines.push(`  Created: ${epic.created}`);
			if (epic.activated !== null) {
				lines.push(`  Activated: ${epic.activated}`);
			}
			if (epic.verifications.length > 0) {
				lines.push(`  Verifications: ${epic.verifications.length}`);
			}
			if (epic.refinement !== null) {
				lines.push(`  Refinement: round ${epic.refinement.round}/${epic.refinement.maxRounds}`);
			}
			output(lines.join("\n"), args);
		}
	},
});
