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
 * `gp epic:brainstorm-capture --epic <name>` (v2) — capture a brainstorm artifact.
 *
 * Accepts stdin JSON `{ content, title }`.
 * Stores content as a git blob, emits `brainstorm-captured` with domain "exploration".
 */
export const epicBrainstormCaptureCommand = defineCommand({
	meta: {
		name: "epic:brainstorm-capture",
		description: "Capture a brainstorm artifact for an epic.",
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
		const title = stdin.title as string | undefined;

		if (content === undefined || content === "") {
			const errorOutput = {
				ok: false,
				error: "Brainstorm content is required via stdin JSON { content, title }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Brainstorm content is required\n`);
			}
			process.exit(1);
		}

		if (title === undefined || title === "") {
			const errorOutput = {
				ok: false,
				error: "Brainstorm title is required via stdin JSON { content, title }",
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Brainstorm title is required\n`);
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

		const slug = title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		const brainstormPath = path.join("epics", epicName, "brainstorm", `${slug}.md`);
		const contentRef = await storeContentRef(content, brainstormPath, "text/markdown");

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
				actor: { kind: "cli", id: "gp:epic:brainstorm-capture" },
				branch,
				commitHint,
				domain: "exploration",
				type: "brainstorm-captured",
				payload: { contentRef, title },
				beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `epic:${epicName}`, title }, args);
			} else if (!args.quiet) {
				output(`Captured brainstorm "${title}" for epic ${pc.bold(epicName)}`, args);
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
