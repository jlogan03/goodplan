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
import type { AnyEventEnvelope, Scope } from "../../schemas/envelope.js";
import { getGitBranch, getGitCommitHint } from "../../util/git-info.js";
import { output } from "../../util/output.js";

// ── Args interface expected by the refine helpers ──────────────────

interface CommandArgs {
	json?: boolean | undefined;
	query?: string | undefined;
	quiet?: boolean | undefined;
	[key: string]: unknown;
}

// ── Shared args definition for citty ──────────────────────────────

/**
 * Common args for all refine:* commands.
 * --epic and --side-quest are mutually exclusive (validated at runtime).
 */
export const refineArgs = {
	epic: {
		type: "string" as const,
		description: "Epic name (mutually exclusive with --side-quest)",
		required: false,
	},
	"side-quest": {
		type: "string" as const,
		description: "Side-quest name (mutually exclusive with --epic)",
		required: false,
	},
	"artifact-type": {
		type: "string" as const,
		description: "Artifact type being refined (e.g., plan, architecture)",
		required: true,
	},
} as const;

// ── Context result type ───────────────────────────────────────────

export interface RefineCommandContext {
	goodplanDir: string;
	eventsPath: string;
	scope: Scope;
	scopeRef: string;
	artifactType: string;
	branch: string;
	commitHint: string | null;
	beforeAppend: (envelope: AnyEventEnvelope) => void | Promise<void>;
}

// ── Context creation ──────────────────────────────────────────────

/**
 * Create a refine command context from CLI args.
 * Resolves scope (epic vs side-quest), events path, git info, and invariant hook.
 *
 * Exits with error on validation failure.
 */
export function createRefineCommandContext(args: CommandArgs): RefineCommandContext {
	const epicName = args.epic as string | undefined;
	const sideQuestName = args["side-quest"] as string | undefined;
	const artifactType = args["artifact-type"] as string | undefined;

	// Validate mutually exclusive scope flags
	if (epicName !== undefined && sideQuestName !== undefined) {
		const errorOutput = {
			ok: false,
			error: "--epic and --side-quest are mutually exclusive",
			code: "VALIDATION_INVALID_INPUT",
		};
		if (args.json || args.query) {
			output(errorOutput, args);
		} else {
			process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
		}
		process.exit(1);
	}

	if (epicName === undefined && sideQuestName === undefined) {
		const errorOutput = {
			ok: false,
			error: "One of --epic or --side-quest is required",
			code: "VALIDATION_INVALID_INPUT",
		};
		if (args.json || args.query) {
			output(errorOutput, args);
		} else {
			process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
		}
		process.exit(1);
	}

	if (artifactType === undefined || artifactType === "") {
		const errorOutput = {
			ok: false,
			error: "--artifact-type is required",
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
	const scope: Scope = epicName !== undefined ? "epic" : "side-quest";
	const scopeRef = (epicName ?? sideQuestName) as string;

	// Resolve events path
	const eventsPath =
		scope === "epic"
			? path.join(goodplanDir, "epics", scopeRef, "events.jsonl")
			: path.join(goodplanDir, "side-quests", scopeRef, "events.jsonl");

	if (!fs.existsSync(eventsPath)) {
		const entityLabel = scope === "epic" ? "Epic" : "Side-quest";
		const errorOutput = {
			ok: false,
			error: `${entityLabel} '${scopeRef}' not found`,
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
		eventsPath,
		scope,
		scopeRef,
		artifactType,
		branch,
		commitHint,
		beforeAppend,
	};
}

// ── Round detection helper ────────────────────────────────────────

/**
 * Auto-detect the current round from the latest `refinement-round-started` event
 * that matches the given artifactType in the scope's event log.
 *
 * Returns 0 if no round has been started (useful for start command to increment to 1).
 */
export async function detectCurrentRound(
	eventsPath: string,
	artifactType: string,
): Promise<number> {
	const { events } = await replayEvents({
		eventsPath,
		filter: {
			domain: "refinement",
			type: "refinement-round-started",
		},
	});

	let latestRound = 0;
	for (const event of events) {
		const payload = event.payload as { artifactType?: string; round?: number };
		if (payload.artifactType === artifactType && typeof payload.round === "number") {
			if (payload.round > latestRound) {
				latestRound = payload.round;
			}
		}
	}

	return latestRound;
}
