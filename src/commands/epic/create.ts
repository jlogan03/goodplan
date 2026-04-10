import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import {
	createBeforeAppendHook,
	createCoreRegistry,
	createReplayGetContext,
} from "../../engine/invariants/index.js";
import { InvariantError } from "../../engine/invariants/index.js";
import { getGitBranch, getGitCommitHint } from "../../util/git-info.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:create` (v2) — create a new epic via the event engine.
 *
 * Appends an `epic-created` event to the epic's own scope event log.
 * Epic events live in `.goodplan/epics/<name>/events.jsonl`.
 *
 * Stdin: { "name": "<name>" }
 * Or: --name <name>
 */
export const epicCreateCommand = defineCommand({
	meta: {
		name: "epic:create",
		description: "Create a new epic. Accepts --name flag or stdin JSON { name }.",
	},
	args: {
		...globalArgs,
		name: {
			type: "string",
			description: "Epic name (used as directory slug)",
			required: false,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const name = (args.name as string | undefined) ?? (stdin.name as string | undefined);

		if (name === undefined || name === "") {
			const errorOutput = {
				ok: false,
				error: "Epic name is required",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Epic name is required\n`);
			}
			process.exit(1);
		}

		const goodplanDir = resolveProjectDir();
		const epicDir = path.join(goodplanDir, "epics", name);
		const eventsPath = path.join(epicDir, "events.jsonl");

		// Resolve git context for the event envelope
		const branch = getGitBranch();
		const commitHint = getGitCommitHint();

		// Wire up invariant engine
		const registry = createCoreRegistry();
		const getContext = createReplayGetContext(replayEvents);
		const beforeAppend = createBeforeAppendHook({
			eventsPath,
			registry,
			getContext,
		});

		// Create epic directory
		fs.mkdirSync(epicDir, { recursive: true });

		try {
			// Append epic-created event
			const result = await appendEvent({
				eventsPath,
				scope: "epic",
				scopeRef: name,
				actor: { kind: "cli", id: "gp:epic:create" },
				branch,
				commitHint,
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: name },
				beforeAppend,
			});

			// Output per MutatingCommandOutput contract
			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${name}` }, args);
			} else if (!args.quiet) {
				output(`Created epic ${pc.bold(name)}`, args);
			}
		} catch (error) {
			if (error instanceof InvariantError) {
				const firstViolation = error.violations[0];
				const errorOutput = {
					ok: false,
					error: firstViolation?.message ?? error.message,
					code: firstViolation?.ruleId ?? "INVARIANT_VIOLATION",
				};
				if (args.json || args.query) {
					output(errorOutput, args);
				} else {
					process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
				}
				process.exit(1);
			}
			throw error;
		}
	},
});
