import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import { writeProject } from "../../core/data/project.js";
import type { Project } from "../../schemas/entities/project.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan init` — initialize a new project in the current directory.
 *
 * Creates `.project/` with a valid `project.json`.
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
		const now = new Date().toISOString();

		const project: Project = {
			version: "1.0.0",
			name: projectName,
			activeEpic: null,
			activeSlice: null,
			activeQuest: null,
			created: now,
			updated: now,
		};

		// Create .project/ directory
		fs.mkdirSync(projectDirPath, { recursive: true });

		// Write project.json via data layer
		writeProject(project, projectDirPath);

		if (args.json) {
			output(project, args);
		} else {
			output(`Initialized project "${projectName}" in ${projectDirPath}`, args);
		}
	},
});
