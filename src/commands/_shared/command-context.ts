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
import { InvariantError } from "../../engine/invariants/index.js";
import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import { getGitBranch, getGitCommitHint } from "../../util/git-info.js";
import { output } from "../../util/output.js";

// ── Options type ────────────────────────────────────────────

export interface EventCommandContextOptions {
	/** When true, sliceName is required (never undefined). */
	requireSlice: boolean;
}

// ── Result types ────────────────────────────────────────────

/** Base fields shared by all event command contexts. */
interface EventCommandContextBase {
	goodplanDir: string;
	epicName: string;
	epicEventsPath: string;
	branch: string;
	commitHint: string | null;
	beforeAppend: (envelope: AnyEventEnvelope) => void | Promise<void>;
}

/** Context when slice is required. */
export interface EventCommandContextWithSlice extends EventCommandContextBase {
	sliceName: string;
}

/** Context when slice is not required. */
export interface EventCommandContextWithoutSlice extends EventCommandContextBase {
	sliceName?: undefined;
}

/** Discriminated union keyed on requireSlice. */
export type EventCommandContext<T extends EventCommandContextOptions> = T extends {
	requireSlice: true;
}
	? EventCommandContextWithSlice
	: EventCommandContextWithoutSlice;

// ── Args interface expected by the helper ───────────────────

interface CommandArgs {
	epic?: string;
	slice?: string;
	json?: boolean;
	query?: string;
	[key: string]: unknown;
}

// ── Main helper ─────────────────────────────────────────────

/**
 * Create the standard v2 event command context: resolveProjectDir,
 * events path resolution, git info, invariant wiring.
 *
 * Generic over `requireSlice` to narrow sliceName's type.
 * Calls process.exit(1) if the epic events file doesn't exist
 * (matching the pattern from all v2 epic commands).
 */
export function createEventCommandContext<T extends EventCommandContextOptions>(
	args: CommandArgs,
	opts: T,
): EventCommandContext<T> {
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

	const base: EventCommandContextBase = {
		goodplanDir,
		epicName,
		epicEventsPath,
		branch,
		commitHint,
		beforeAppend,
	};

	if (opts.requireSlice) {
		return {
			...base,
			sliceName: args.slice as string,
		} as EventCommandContext<T>;
	}

	return base as EventCommandContext<T>;
}

// ── InvariantError handler ──────────────────────────────────

/**
 * Handle InvariantError in the standard way: output structured error
 * for JSON mode, stderr message for human mode, exit 1.
 */
export function handleInvariantError(error: unknown, args: CommandArgs): never {
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
