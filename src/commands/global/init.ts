import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import { PROJECT_DIR_NAME } from "../../core/data/project.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import {
	createBeforeAppendHook,
	createCoreRegistry,
	createReplayGetContext,
} from "../../engine/invariants/index.js";
import { GoodplanError } from "../../util/errors.js";
import { getGitBranch, getGitCommitHint } from "../../util/git-info.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp init` (v2) — initialize a new project via the event engine.
 *
 * Creates `.goodplan/` and appends a `project-initialized` event to the event log.
 * Only emits `project-initialized` in this slice; other init events
 * (architecture-committed, conventions-committed, subsystem-registered)
 * are deferred to spine commands (slice 07).
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

		// Fast-fail: check cwd directly (not resolveProjectDir which walks up)
		if (fs.existsSync(projectDirPath)) {
			throw new GoodplanError(
				"STATE_ALREADY_INITIALIZED",
				`Project already initialized in this directory (${PROJECT_DIR_NAME}/ exists)`,
			);
		}

		const projectName = args.name || path.basename(cwd);
		const eventsPath = path.join(projectDirPath, "events.jsonl");

		// Resolve git context for the event envelope
		const branch = getGitBranch();
		const commitHint = getGitCommitHint();

		// Wire up invariant engine (project.exists allows project-initialized as first event)
		const registry = createCoreRegistry();
		const getContext = createReplayGetContext(replayEvents);
		const beforeAppend = createBeforeAppendHook({
			eventsPath,
			registry,
			getContext,
		});

		// Create .goodplan/ directory (appendEvent creates parent but we want it explicit)
		fs.mkdirSync(projectDirPath, { recursive: true });

		// Append project-initialized event
		const result = await appendEvent({
			eventsPath,
			scope: "project",
			scopeRef: null,
			actor: { kind: "cli", id: "gp:init" },
			branch,
			commitHint,
			domain: "entity-lifecycle",
			type: "project-initialized",
			payload: { name: projectName },
			beforeAppend,
		});

		// Output per MutatingCommandOutput contract
		if (args.json || args.query) {
			output({ ok: true, event: result.event.id, entity: "project" }, args);
		} else if (!args.quiet) {
			output(`Initialized project "${projectName}" in ${PROJECT_DIR_NAME}/`, args);
		}
	},
});
