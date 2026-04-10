import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { storeContentRef } from "../../engine/content/store.js";
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
 * `gp epic:explore-conclude --epic <name>` (v2) — conclude exploration.
 *
 * Emits `exploration-concluded` with domain "entity-lifecycle" (triggers phase transition).
 * Accepts stdin JSON `{ content }` for exploration summary.
 */
export const epicExploreConcludeCommand = defineCommand({
	meta: {
		name: "epic:explore-conclude",
		description: "Conclude exploration for an epic.",
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
		const stdin = await readStdin();
		const content = stdin.content as string | undefined;

		if (content === undefined || content === "") {
			const errorOutput = {
				ok: false,
				error: "Exploration summary content is required via stdin JSON { content }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Exploration summary content is required\n`);
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

		const summaryPath = path.join("epics", epicName, "exploration-summary.md");
		const contentRef = await storeContentRef(content, summaryPath, "text/markdown");

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
			// Domain is entity-lifecycle because this triggers a phase transition (P1 -> P2)
			const result = await appendEvent({
				eventsPath: epicEventsPath,
				scope: "epic",
				scopeRef: epicName,
				actor: { kind: "cli", id: "gp:epic:explore-conclude" },
				branch,
				commitHint,
				domain: "entity-lifecycle",
				type: "exploration-concluded",
				payload: { summary: contentRef },
				beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${epicName}` }, args);
			} else if (!args.quiet) {
				output(`Concluded exploration for epic ${pc.bold(epicName)}`, args);
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
