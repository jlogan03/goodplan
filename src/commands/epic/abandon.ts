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
import { globalArgs } from "../global-args.js";

/**
 * `gp epic:abandon --epic <name> --reason <text>` (v2) — abandon an epic via event engine.
 *
 * Appends an `epic-abandoned` event to the epic's scope event log.
 */
export const epicAbandonCommand = defineCommand({
	meta: {
		name: "epic:abandon",
		description: "Abandon an epic with a reason. Requires --epic and --reason flags.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		reason: {
			type: "string",
			description: "Reason for abandoning the epic",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const epicName = args.epic as string;
		const reason = args.reason as string;
		const epicEventsPath = path.join(goodplanDir, "epics", epicName, "events.jsonl");

		if (!fs.existsSync(epicEventsPath)) {
			const errorOutput = {
				ok: false,
				error: `Epic '${epicName}' not found`,
				code: "ENTITY_NOT_FOUND",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Epic '${epicName}' not found\n`);
			}
			process.exit(1);
		}

		const branch = getGitBranch();
		const commitHint = getGitCommitHint();

		const registry = createCoreRegistry();
		const getContext = createReplayGetContext(replayEvents);
		const beforeAppend = createBeforeAppendHook({
			eventsPath: epicEventsPath,
			registry,
			getContext,
		});

		try {
			const result = await appendEvent({
				eventsPath: epicEventsPath,
				scope: "epic",
				scopeRef: epicName,
				actor: { kind: "cli", id: "gp:epic:abandon" },
				branch,
				commitHint,
				domain: "entity-lifecycle",
				type: "epic-abandoned",
				payload: { reason },
				beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${epicName}` }, args);
			} else if (!args.quiet) {
				output(`Abandoned epic ${pc.bold(epicName)}: ${reason}`, args);
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
