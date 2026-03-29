import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import { LEGACY_DIR_NAME, PROJECT_DIR_NAME } from "../../core/data/project.js";
import { rpcMigrate } from "../../core/rpc/migrate.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp migrate` — migrate or re-migrate a .goodplan/ or legacy .project/ directory to CLI format.
 *
 * Multi-round Q&A protocol driven via --json. Each invocation either emits
 * questions (stdout JSON) or accepts answers (stdin JSON).
 *
 * Stdin payload shape: { "round": <number>, "answers": [{ "id": "<question-id>", "data": <response> }] }
 * No stdin = fresh start or resume (re-emits current round's questions).
 *
 * Preconditions:
 * - .goodplan/ or .project/ must exist (pre-CLI artifacts or existing CLI state to re-migrate)
 *
 * Supports re-migration of already-initialized projects. When project.json exists,
 * a warning is included in the first questions response. The existing directory is
 * renamed to a backup and state is rebuilt from directory contents.
 *
 * Intermediate state stored at <cwd>/.migration-in-progress.json (overwritten on restart).
 * --force has no migration-specific behavior (handled by commitState as usual).
 *
 * This command requires --json mode (LLM-driven protocol). Without --json, it outputs
 * structured data as indented JSON for human debugging.
 */
export const migrateCommand = defineCommand({
	meta: {
		name: "migrate",
		description:
			"Migrate or re-migrate a .goodplan/ or .project/ directory to CLI format. " +
			"Stdin: {round, answers: [{id, data}]}. " +
			"Requires .goodplan/ or .project/ to exist.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const cwd = process.cwd();

		// Dual-path resolution: check .goodplan/ first (re-migration), then .project/ (legacy)
		const primaryDir = path.join(cwd, PROJECT_DIR_NAME);
		const legacyDir = path.join(cwd, LEGACY_DIR_NAME);
		let projectDir: string;

		if (fs.existsSync(primaryDir) && fs.statSync(primaryDir).isDirectory()) {
			projectDir = primaryDir;
		} else if (fs.existsSync(legacyDir) && fs.statSync(legacyDir).isDirectory()) {
			projectDir = legacyDir;
		} else {
			throw new GoodplanError(
				"DATA_NO_PROJECT",
				`No ${PROJECT_DIR_NAME}/ or ${LEGACY_DIR_NAME}/ directory found. Cannot migrate without existing project artifacts.`,
			);
		}

		// Read stdin — empty object means no input (TTY or empty pipe)
		const stdinData = await readStdin();
		const hasStdin = Object.keys(stdinData).length > 0;

		const result = await rpcMigrate(projectDir, hasStdin ? stdinData : null, cwd);

		output(result, args);
	},
});
