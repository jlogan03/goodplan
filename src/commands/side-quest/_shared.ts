import * as fs from "node:fs";
import * as path from "node:path";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { replayEvents } from "../../engine/events/replay.js";
import {
	createBeforeAppendHook,
	createCoreRegistry,
	createReplayGetContext,
} from "../../engine/invariants/index.js";
import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import { getGitBranch, getGitCommitHint } from "../../util/git-info.js";
import { output } from "../../util/output.js";

// ── Args interface expected by the side-quest helpers ─────────

interface CommandArgs {
	json?: boolean | undefined;
	query?: string | undefined;
	quiet?: boolean | undefined;
	[key: string]: unknown;
}

// ── Shared args definition for citty ─────────────────────────

/**
 * Common args for side-quest:* commands that operate on an existing side-quest.
 */
export const sideQuestArgs = {
	"side-quest": {
		type: "string" as const,
		description: "Side-quest name",
		required: true,
	},
} as const;

// ── Context result type ──────────────────────────────────────

export interface SideQuestCommandContext {
	goodplanDir: string;
	sideQuestName: string;
	eventsPath: string;
	branch: string;
	commitHint: string | null;
	beforeAppend: (envelope: AnyEventEnvelope) => void | Promise<void>;
}

// ── Context creation ─────────────────────────────────────────

/**
 * Create a side-quest command context from CLI args.
 * Resolves the side-quest directory, events path, git info, and invariant hook.
 *
 * Exits with error if the side-quest doesn't exist (no events.jsonl).
 */
export function createSideQuestCommandContext(args: CommandArgs): SideQuestCommandContext {
	const sideQuestName = args["side-quest"] as string;
	const goodplanDir = resolveProjectDir();
	const eventsPath = path.join(goodplanDir, "side-quests", sideQuestName, "events.jsonl");

	if (!fs.existsSync(eventsPath)) {
		const errorOutput = {
			ok: false,
			error: `Side-quest '${sideQuestName}' not found`,
			code: "ENTITY_NOT_FOUND",
		};
		if (args.json || args.query) {
			output(errorOutput, args);
		} else {
			process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
		}
		process.exit(1);
	}

	const branch = getGitBranch();
	const commitHint = getGitCommitHint();

	const registry = createCoreRegistry();
	const getContext = createReplayGetContext(replayEvents);
	const beforeAppend = createBeforeAppendHook({
		eventsPath,
		registry,
		getContext,
	});

	return {
		goodplanDir,
		sideQuestName,
		eventsPath,
		branch,
		commitHint,
		beforeAppend,
	};
}
