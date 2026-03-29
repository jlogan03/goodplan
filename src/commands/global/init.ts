import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import { PROJECT_DIR_NAME } from "../../core/data/project.js";
import { rpcInit } from "../../core/rpc/init.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp init` — initialize a new project in the current directory.
 *
 * Creates `.goodplan/` with a valid project tree via the state machine.
 * Checks cwd directly (not via resolveProjectDir, which walks up).
 */
export const initCommand = defineCommand({
	meta: {
		name: "init",
		description: "Initialize a new goodplan project in the current directory",
	},
	args: {
		...globalArgs,
		name: {
			type: "string",
			description: "Project name (defaults to current directory name)",
			required: false,
		},
	},
	setup() {},
	async run({ args }) {
		const cwd = process.cwd();
		const projectDirPath = path.join(cwd, PROJECT_DIR_NAME);

		// Fast-fail: check cwd directly before assembleState() to avoid the overhead
		// of building a full state tree for the common "already initialized" case.
		// This duplicates the state machine's INIT_PROJECT guard (which checks project.json)
		// intentionally — per tracer bullet learning, the directory check is a cheap pre-filter.
		// Do NOT use resolveProjectDir() here, which walks up the directory tree.
		if (fs.existsSync(projectDirPath)) {
			throw new GoodplanError(
				"STATE_ALREADY_INITIALIZED",
				`Project already initialized in this directory (${PROJECT_DIR_NAME}/ exists)`,
			);
		}

		const projectName = args.name || path.basename(cwd);

		const result = rpcInit(projectDirPath, projectName);

		if (args.json || args.query) {
			output(result, args);
		} else {
			output(`Initialized project "${result.name}" in ${result.projectDir}`, args);
		}
	},
});
