import * as path from "node:path";
import { defineCommand } from "citty";
import { rpcMigrate } from "../../core/rpc/migrate.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan migrate` — migrate or re-migrate a .project/ directory to CLI format.
 *
 * Multi-round Q&A protocol driven via --json. Each invocation either emits
 * questions (stdout JSON) or accepts answers (stdin JSON).
 *
 * Stdin payload shape: { "round": <number>, "answers": [{ "id": "<question-id>", "data": <response> }] }
 * No stdin = fresh start or resume (re-emits current round's questions).
 *
 * Preconditions:
 * - .project/ must exist (pre-CLI artifacts or existing CLI state to re-migrate)
 *
 * Supports re-migration of already-initialized projects. When project.json exists,
 * a warning is included in the first questions response. The existing .project/ is
 * renamed to .project-old-<YYYYMMDD-HHmmss>/ and state is rebuilt from directory contents.
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
			"Migrate or re-migrate a .project/ directory to CLI format. " +
			"Stdin: {round, answers: [{id, data}]}. " +
			"Requires .project/ to exist.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const cwd = process.cwd();
		const projectDir = path.join(cwd, ".project");

		// Read stdin — empty object means no input (TTY or empty pipe)
		const stdinData = await readStdin();
		const hasStdin = Object.keys(stdinData).length > 0;

		const result = await rpcMigrate(projectDir, hasStdin ? stdinData : null, cwd);

		output(result, args);
	},
});
