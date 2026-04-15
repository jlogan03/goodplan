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
import { getGitBranch, getGitCommitHint } from "../../util/git-info.js";
import { output } from "../../util/output.js";
import { handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp side-quest:create` — create a new side-quest.
 *
 * Creates the side-quest directory and emits `side-quest-created` event.
 * The directory and events.jsonl file are created by appendEvent.
 */
export const sideQuestCreateCommand = defineCommand({
	meta: {
		name: "side-quest:create",
		description: "Create a new side-quest. Requires --name and --goal.",
	},
	args: {
		...globalArgs,
		name: {
			type: "string",
			description: "Side-quest name (used as directory slug)",
			required: true,
		},
		goal: {
			type: "string",
			description: "Side-quest goal description",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const name = args.name as string;
		const goal = args.goal as string;

		const goodplanDir = resolveProjectDir();
		const eventsPath = path.join(goodplanDir, "side-quests", name, "events.jsonl");

		const branch = getGitBranch();
		const commitHint = getGitCommitHint();

		const registry = createCoreRegistry();
		const getContext = createReplayGetContext(replayEvents);
		const beforeAppend = createBeforeAppendHook({
			eventsPath,
			registry,
			getContext,
		});

		try {
			const result = await appendEvent({
				eventsPath,
				scope: "side-quest",
				scopeRef: name,
				actor: { kind: "cli", id: "gp:side-quest:create" },
				branch,
				commitHint,
				domain: "entity-lifecycle",
				type: "side-quest-created",
				payload: {
					dir: name,
					goal,
				},
				beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `side-quest:${name}` }, args);
			} else if (!args.quiet) {
				output(`Created side-quest ${pc.bold(name)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
