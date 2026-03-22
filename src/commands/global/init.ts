import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import { rpcInit } from "../../core/rpc/init.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan init` — initialize a new project in the current directory.
 *
 * Creates `.project/` with a valid project tree via the state machine.
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
		const projectDirPath = path.join(cwd, ".project");

		// Check cwd directly — do NOT use resolveProjectDir() which walks up
		if (fs.existsSync(projectDirPath)) {
			throw new GoodplanError(
				"STATE_ALREADY_INITIALIZED",
				"Project already initialized in this directory (.project/ exists)",
			);
		}

		const projectName = args.name || path.basename(cwd);

		const result = rpcInit(projectDirPath, projectName);

		if (args.json) {
			output(result, args);
		} else {
			output(`Initialized project "${result.name}" in ${result.projectDir}`, args);
		}
	},
});
