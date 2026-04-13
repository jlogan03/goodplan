/**
 * V2 event generation for migrated state.
 *
 * After commitState() produces v1-format entity JSON, this module walks the
 * ProjectState tree and writes v2 events.jsonl files at each scope. This enables
 * the v2 derived state computer to process migrated projects.
 *
 * INV-001 exception: migration bypasses the invariant engine. Envelopes are built
 * in-memory with manual prevId chaining, validated via AnyEventEnvelopeSchema.parse(),
 * and written in a single fs.writeFileSync() per scope.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import type { ContentRef } from "../../schemas/envelope.js";
import type { AnyEventEnvelope, EventDomain, Scope } from "../../schemas/envelope.js";
import { AnyEventEnvelopeSchema } from "../../schemas/envelope.js";

import type { Epic } from "../../schemas/entities/epic.js";
import type { EpicStatus } from "../../schemas/entities/epic.js";
import type { Quest, QuestStatus } from "../../schemas/entities/quest.js";
import type { Slice } from "../../schemas/entities/slice.js";
import type { SliceStatus } from "../../schemas/entities/slice.js";
import type { Project } from "../../schemas/entities/project.js";

import type { ProjectState } from "../tree.js";
import { getDir, getJson } from "../tree.js";

import { storeContentRef } from "../../engine/content/store.js";
import { getGitBranch, getGitCommitHint } from "../../util/git-info.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScopeContext {
	readonly scope: Scope;
	readonly scopeRef: string | null;
	prevId: string | null;
	lastTs: number;
	readonly events: AnyEventEnvelope[];
}

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a timestamp to ISO 8601 with exactly 3 decimal places (ms precision).
 * Entity timestamps from v1 may lack sub-second precision.
 */
function normalizeToPrecision3(ts: string): string {
	const d = new Date(ts);
	return d.toISOString(); // always produces exactly 3 decimal places
}

/**
 * Get a monotonically increasing timestamp within a scope.
 * If the candidate is <= lastTs, bump by 1ms.
 */
function nextMonotonicTs(ctx: ScopeContext, candidateTs: string): string {
	const candidateMs = new Date(candidateTs).getTime();
	const ts = candidateMs > ctx.lastTs ? candidateMs : ctx.lastTs + 1;
	ctx.lastTs = ts;
	return new Date(ts).toISOString();
}

// ---------------------------------------------------------------------------
// Envelope builder
// ---------------------------------------------------------------------------

function pushEvent(
	ctx: ScopeContext,
	branch: string,
	commitHint: string | null,
	domain: EventDomain,
	type: string,
	payload: unknown,
	candidateTs: string,
): void {
	const id = crypto.randomUUID();
	const ts = nextMonotonicTs(ctx, normalizeToPrecision3(candidateTs));

	const envelope: AnyEventEnvelope = {
		id,
		schemaVersion: 1,
		ts,
		scope: ctx.scope,
		scopeRef: ctx.scopeRef,
		actor: { kind: "cli", id: "gp:migrate" },
		branch,
		commitHint,
		domain,
		type,
		payload,
		prevId: ctx.prevId,
	};

	// Validate at build time — throws on bad envelopes
	AnyEventEnvelopeSchema.parse(envelope);

	ctx.events.push(envelope);
	ctx.prevId = id;
}

// ---------------------------------------------------------------------------
// Scope context factory
// ---------------------------------------------------------------------------

function createScopeCtx(scope: Scope, scopeRef: string | null): ScopeContext {
	return {
		scope,
		scopeRef,
		prevId: null,
		lastTs: 0,
		events: [],
	};
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

function writeEventsFile(filePath: string, events: readonly AnyEventEnvelope[]): void {
	if (events.length === 0) return;
	const dir = path.dirname(filePath);
	fs.mkdirSync(dir, { recursive: true });
	const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
	fs.writeFileSync(filePath, lines, "utf-8");
}

/**
 * Collect all events.jsonl paths that were written, for cleanup on failure.
 */
function cleanupWrittenFiles(paths: readonly string[]): void {
	for (const p of paths) {
		try {
			fs.unlinkSync(p);
		} catch {
			// best-effort cleanup
		}
	}
}

// ---------------------------------------------------------------------------
// Content ref helpers
// ---------------------------------------------------------------------------

/**
 * Try to read a markdown file from disk and store as a git blob ContentRef.
 * Falls back to storing a placeholder string if the file doesn't exist.
 */
async function contentRefFromFile(
	goodplanDir: string,
	relativePath: string,
): Promise<ContentRef> {
	const absPath = path.join(goodplanDir, relativePath);
	let content: string;
	try {
		content = fs.readFileSync(absPath, "utf-8");
	} catch {
		content = `[Migrated from v1 — original artifact at ${relativePath}]`;
	}
	return storeContentRef(content, relativePath, "text/markdown");
}

/**
 * Store a string as a git blob ContentRef.
 */
async function contentRefFromString(
	content: string,
	logicalPath: string,
): Promise<ContentRef> {
	return storeContentRef(content, logicalPath, "text/markdown");
}

// ---------------------------------------------------------------------------
// Epic event generation
// ---------------------------------------------------------------------------

const EPIC_STATUSES_WITH_GOAL: ReadonlySet<EpicStatus> = new Set([
	"exploring",
	"explored",
	"defining-architecture",
	"architecture-defined",
	"refining-architecture",
	"architecture-refined",
	"defining-slices",
	"slices-defined",
	"refining-slices",
	"slices-refined",
	"activated",
	"completed",
]);

async function generateEpicEvents(
	ctx: ScopeContext,
	epic: Epic,
	epicName: string,
	goodplanDir: string,
	branch: string,
	commitHint: string | null,
): Promise<void> {
	const ts = epic.created;

	// All epics get epic-created
	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "epic-created", {
		directory: epicName,
	}, ts);

	if (epic.status === "abandoned") {
		pushEvent(ctx, branch, commitHint, "entity-lifecycle", "epic-abandoned", {
			reason: "Abandoned during v1 — migrated as-is",
		}, epic.updated);
		return;
	}

	// Statuses with goal committed
	if (EPIC_STATUSES_WITH_GOAL.has(epic.status)) {
		// Try to read goal.md, fall back to goal string from entity
		const goalPath = `epics/${epicName}/goal.md`;
		const goalAbsPath = path.join(goodplanDir, goalPath);
		let goalContent: string;
		try {
			goalContent = fs.readFileSync(goalAbsPath, "utf-8");
		} catch {
			goalContent = epic.goal;
		}
		const goalRef = await contentRefFromString(goalContent, goalPath);

		pushEvent(ctx, branch, commitHint, "entity-lifecycle", "epic-goal-committed", {
			goal: goalRef,
		}, ts);
	}

	if (epic.status === "activated" || epic.status === "completed") {
		pushEvent(ctx, branch, commitHint, "entity-lifecycle", "epic-activated", {}, epic.activated ?? epic.updated);
	}

	if (epic.status === "completed") {
		pushEvent(ctx, branch, commitHint, "entity-lifecycle", "epic-completed", {}, epic.updated);
	}
}

// ---------------------------------------------------------------------------
// Slice event generation
// ---------------------------------------------------------------------------

async function generateSliceEvents(
	ctx: ScopeContext,
	slice: Slice,
	epicName: string,
	goodplanDir: string,
	branch: string,
	commitHint: string | null,
): Promise<void> {
	const ts = slice.created;
	const sliceRef = slice.name;

	// All slices get slice-created
	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "slice-created", {
		sliceRef,
		directory: slice.name,
		...(slice.goal !== undefined ? { goal: slice.goal } : {}),
	}, ts);

	if (slice.status === "abandoned") {
		pushEvent(ctx, branch, commitHint, "entity-lifecycle", "slice-abandoned", {
			sliceRef,
			reason: "Abandoned during v1 — migrated as-is",
		}, slice.updated);
		return;
	}

	if (slice.status === "created" || slice.status === "planning") {
		return;
	}

	// plan-created and beyond: slice-plan-drafted
	const planPath = `epics/${epicName}/slices/${slice.name}/plan-refined.md`;
	const planDraftPath = `epics/${epicName}/slices/${slice.name}/plan.md`;
	// Try refined first, then draft
	let planRef: ContentRef;
	const refinedAbs = path.join(goodplanDir, planPath);
	const draftAbs = path.join(goodplanDir, planDraftPath);
	if (fs.existsSync(refinedAbs)) {
		planRef = await contentRefFromFile(goodplanDir, planPath);
	} else if (fs.existsSync(draftAbs)) {
		planRef = await contentRefFromFile(goodplanDir, planDraftPath);
	} else {
		planRef = await contentRefFromString(
			`[Plan for slice ${slice.name} — migrated from v1]`,
			planDraftPath,
		);
	}

	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "slice-plan-drafted", {
		sliceRef,
		plan: planRef,
	}, ts);

	if (slice.status === "plan-created") {
		return;
	}

	// refining and beyond: plan-shape-checkpoint-auto-shaped
	pushEvent(ctx, branch, commitHint, "spine", "plan-shape-checkpoint-auto-shaped", {
		sliceRef,
		preference: "best-guess-and-flag",
	}, ts);

	if (slice.status === "refining") {
		return;
	}

	// plan-refined and beyond: slice-plan-committed
	const extract = {
		chunks: [],
		chunkDependencies: [],
		affectedSubsystems: [],
		rollbackPath: "N/A - migrated from v1",
	};

	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "slice-plan-committed", {
		sliceRef,
		plan: planRef,
		extract,
	}, ts);

	if (slice.status === "plan-refined") {
		return;
	}

	// implementing and beyond: slice-implementation-started
	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "slice-implementation-started", {
		sliceRef,
	}, ts);

	if (slice.status === "implementing" || slice.status === "implementation-complete") {
		return;
	}

	// completed: code refinement + converge + landed
	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "slice-code-refinement-started", {
		sliceRef,
	}, slice.updated);

	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "code-refinement-converged", {
		sliceRef,
	}, slice.updated);

	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "slice-landed", {
		sliceRef,
	}, slice.updated);
}

// ---------------------------------------------------------------------------
// Side-quest event generation
// ---------------------------------------------------------------------------

async function generateSideQuestEvents(
	ctx: ScopeContext,
	quest: Quest,
	questName: string,
	goodplanDir: string,
	branch: string,
	commitHint: string | null,
): Promise<void> {
	const ts = quest.created;

	// All side-quests get side-quest-created
	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "side-quest-created", {
		dir: questName,
		goal: quest.goal,
	}, ts);

	if (quest.status === "abandoned") {
		pushEvent(ctx, branch, commitHint, "entity-lifecycle", "side-quest-abandoned", {
			reason: "Abandoned during v1 — migrated as-is",
		}, quest.updated);
		return;
	}

	if (quest.status === "created" || quest.status === "exploring" || quest.status === "explored") {
		return;
	}

	// planning and beyond: side-quest-goal-committed
	const goalPath = `quests/${questName}/goal.md`;
	const goalAbsPath = path.join(goodplanDir, goalPath);
	let goalContent: string;
	try {
		goalContent = fs.readFileSync(goalAbsPath, "utf-8");
	} catch {
		goalContent = quest.goal;
	}
	// Store under the v2 side-quests path for the content ref
	const goalRef = await contentRefFromString(goalContent, `side-quests/${questName}/goal.md`);

	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "side-quest-goal-committed", {
		goal: goalRef,
	}, ts);

	if (
		quest.status === "planning" ||
		quest.status === "plan-created" ||
		quest.status === "refining"
	) {
		return;
	}

	// plan-refined and beyond: side-quest-plan-committed
	const planPath = `quests/${questName}/plan-refined.md`;
	const planDraftPath = `quests/${questName}/plan.md`;
	let planRef: ContentRef;
	const refinedAbs = path.join(goodplanDir, planPath);
	const draftAbs = path.join(goodplanDir, planDraftPath);
	if (fs.existsSync(refinedAbs)) {
		planRef = await contentRefFromFile(goodplanDir, planPath);
	} else if (fs.existsSync(draftAbs)) {
		planRef = await contentRefFromFile(goodplanDir, planDraftPath);
	} else {
		planRef = await contentRefFromString(
			`[Plan for side-quest ${questName} — migrated from v1]`,
			`side-quests/${questName}/plan.md`,
		);
	}

	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "side-quest-plan-committed", {
		plan: planRef,
	}, ts);

	if (quest.status === "plan-refined") {
		return;
	}

	// implementing and beyond: side-quest-implementation-started
	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "side-quest-implementation-started", {}, ts);

	if (quest.status === "implementing" || quest.status === "implementation-complete") {
		return;
	}

	// completed: side-quest-landed
	pushEvent(ctx, branch, commitHint, "entity-lifecycle", "side-quest-landed", {}, quest.updated);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate v2 event logs from a migrated ProjectState tree.
 *
 * Walks the state tree (produced by buildMigrationState + commitState), generates
 * v2 event envelopes for each entity, validates them, and writes events.jsonl files
 * at each scope.
 *
 * INV-001 exception: bypasses invariant engine. Migration events are bulk-written
 * with manual prevId chaining.
 *
 * On failure mid-write, cleans up any partially-written events.jsonl files.
 * Entity JSON from commitState is still valid as v1 fallback.
 */
export async function generateV2Events(
	state: ProjectState,
	goodplanDir: string,
): Promise<void> {
	// Resolve git context once
	let branch = getGitBranch();
	if (branch === "HEAD" || branch === "unknown") {
		branch = "migration";
	}
	const commitHint = getGitCommitHint();

	// Track written files for cleanup on failure
	const writtenFiles: string[] = [];

	try {
		// ── Project scope ────────────────────────────────────────
		const projectJson = getJson<Project>(state, "project.json");
		if (projectJson === undefined) {
			throw new Error("No project.json in migrated state tree");
		}

		const projectCtx = createScopeCtx("project", null);
		pushEvent(projectCtx, branch, commitHint, "entity-lifecycle", "project-initialized", {
			name: projectJson.name,
		}, projectJson.created);

		const projectEventsPath = path.join(goodplanDir, "events.jsonl");
		writeEventsFile(projectEventsPath, projectCtx.events);
		writtenFiles.push(projectEventsPath);

		// ── Epic scopes ──────────────────────────────────────────
		const epicsDir = getDir(state, "epics");
		if (epicsDir !== undefined) {
			for (const epicName of Object.keys(epicsDir.contents)) {
				const epicEntry = epicsDir.contents[epicName];
				if (epicEntry === undefined || epicEntry.type !== "directory") continue;

				const epic = getJson<Epic>(state, `epics/${epicName}/epic.json`);
				if (epic === undefined) continue;

				const epicCtx = createScopeCtx("epic", epicName);

				// Generate epic-level events
				await generateEpicEvents(epicCtx, epic, epicName, goodplanDir, branch, commitHint);

				// Generate slice events within epic scope
				const slicesDir = getDir(state, `epics/${epicName}/slices`);
				if (slicesDir !== undefined) {
					for (const sliceName of Object.keys(slicesDir.contents)) {
						const sliceEntry = slicesDir.contents[sliceName];
						if (sliceEntry === undefined || sliceEntry.type !== "directory") continue;

						const slice = getJson<Slice>(state, `epics/${epicName}/slices/${sliceName}/slice.json`);
						if (slice === undefined) continue;

						await generateSliceEvents(epicCtx, slice, epicName, goodplanDir, branch, commitHint);
					}
				}

				const epicEventsPath = path.join(goodplanDir, "epics", epicName, "events.jsonl");
				writeEventsFile(epicEventsPath, epicCtx.events);
				writtenFiles.push(epicEventsPath);
			}
		}

		// ── Side-quest scopes ────────────────────────────────────
		// v1 state tree has quests/, v2 events go to side-quests/
		const questsDir = getDir(state, "quests");
		if (questsDir !== undefined) {
			for (const questName of Object.keys(questsDir.contents)) {
				const questEntry = questsDir.contents[questName];
				if (questEntry === undefined || questEntry.type !== "directory") continue;

				const quest = getJson<Quest>(state, `quests/${questName}/quest.json`);
				if (quest === undefined) continue;

				const sqCtx = createScopeCtx("side-quest", questName);
				await generateSideQuestEvents(sqCtx, quest, questName, goodplanDir, branch, commitHint);

				// Write to side-quests/ directory (v2 layout)
				const sqEventsPath = path.join(goodplanDir, "side-quests", questName, "events.jsonl");
				writeEventsFile(sqEventsPath, sqCtx.events);
				writtenFiles.push(sqEventsPath);
			}
		}
	} catch (err) {
		// Clean up any partially-written events.jsonl files
		cleanupWrittenFiles(writtenFiles);
		throw err;
	}
}
