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
 * `gp epic:pressure-test-finding-disposition --epic <name> --finding <id> --disposition <accepted|dismissed>` (v2)
 *
 * Emits `pressure-test-finding-accepted` with domain "entity-lifecycle".
 */
export const epicPressureTestFindingDispositionCommand = defineCommand({
	meta: {
		name: "epic:pressure-test-finding-disposition",
		description: "Set the disposition of a pressure test finding.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		finding: {
			type: "string",
			description: "Finding ID",
			required: true,
		},
		disposition: {
			type: "string",
			description: "Disposition: accepted or dismissed",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const disposition = args.disposition as string;
		const validDispositions = ["accepted", "dismissed"];
		if (!validDispositions.includes(disposition)) {
			const errorOutput = {
				ok: false,
				error: `Invalid disposition: "${disposition}". Must be one of: ${validDispositions.join(", ")}`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const goodplanDir = resolveProjectDir();
		const epicName = args.epic as string;
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
				actor: { kind: "cli", id: "gp:epic:pressure-test-finding-disposition" },
				branch,
				commitHint,
				domain: "entity-lifecycle",
				type: "pressure-test-finding-accepted",
				payload: { findingId: args.finding as string, disposition },
				beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${epicName}` }, args);
			} else if (!args.quiet) {
				output(
					`Finding ${pc.bold(args.finding as string)} ${disposition} for epic ${pc.bold(epicName)}`,
					args,
				);
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
