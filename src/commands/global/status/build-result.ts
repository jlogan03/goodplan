import * as fs from "node:fs";
import * as path from "node:path";
import { suggestedNextSteps } from "../../../engine/derived-state/index.js";
import type { Artifacts, StatusResult } from "../../../schemas/commands/status.js";
import type {
	DerivedStateData,
	EpicState,
	NextStep,
} from "../../../schemas/entities/derived-state.js";
import type { DeepReadonly } from "../../../util/types.js";
import { VERSION } from "../../../version.js";

/**
 * Build a StatusResult from event-sourced derived state.
 *
 * NOT pure: performs filesystem scanning for artifact file lists (architecture,
 * research, brainstorm, prototypes) and JSONL counting (decisions, learnings)
 * as fallbacks until artifact-tracking events are added in later slices.
 *
 * @param state - DerivedStateData from replayAllScopes
 * @param goodplanDir - absolute path to .goodplan/ directory for glob resolution
 */
export function buildStatusResult(
	state: DeepReadonly<DerivedStateData>,
	goodplanDir: string,
): StatusResult {
	// ── Active entities ──
	const activeEpic = resolveActiveEpic(state);
	const activeSlice = resolveActiveSlice(state);
	const activeQuest = resolveActiveQuest(state);

	// ── Artifacts ──
	const artifacts = buildArtifacts(state, goodplanDir);

	// ── Recommendations (from suggestedNextSteps for backward compat) ──
	const steps = suggestedNextSteps(state);
	const recommendations = steps.map((s: NextStep) => s.description);

	// ── Warnings (stale entity detection) ──
	const warnings = detectStaleEntities(state);

	return {
		project: {
			name: state.project.name,
			version: VERSION,
		},
		activeEpic,
		activeSlice,
		activeQuest,
		artifacts,
		recommendations,
		warnings,
	};
}

// ── Active entity resolution ─────────────────────────────────

/**
 * Find the active epic: an epic that is active, not completed, not abandoned.
 * Active phases are P6-P12 (activated through landed).
 */
function resolveActiveEpic(state: DeepReadonly<DerivedStateData>): StatusResult["activeEpic"] {
	for (const [_dir, epic] of state.epics) {
		if (epic.active && !epic.completed && !epic.abandoned) {
			return { name: _dir, status: phaseToEpicStatus(epic) };
		}
	}
	return null;
}

/**
 * Find the active slice within the active epic: a slice in phase P10-P11
 * (implementation/refinement), not abandoned, not landed.
 */
function resolveActiveSlice(state: DeepReadonly<DerivedStateData>): StatusResult["activeSlice"] {
	for (const [_epicDir, epic] of state.epics) {
		if (!epic.active || epic.completed || epic.abandoned) continue;
		for (const [sliceDir, slice] of epic.slices) {
			if (!slice.abandoned && slice.phase !== "P12") {
				return { name: sliceDir, status: phaseToSliceStatus(slice.phase) };
			}
		}
	}
	return null;
}

/**
 * Find the active side-quest. Abandoned side-quests are excluded (return null).
 * Phase-to-status mapping: S0->"created", S1->"planning", S2->"implementing", S3->"completed".
 */
function resolveActiveQuest(state: DeepReadonly<DerivedStateData>): StatusResult["activeQuest"] {
	for (const [dir, sq] of state.sideQuests) {
		if (sq.abandoned) continue;
		if (sq.landed) continue;
		if (sq.active) {
			return { name: dir, status: phaseToQuestStatus(sq.phase) };
		}
	}
	return null;
}

// ── Phase-to-status mapping ──────────────────────────────────

const EPIC_PHASE_STATUS: Record<string, string> = {
	P0: "created",
	P1: "goal-committed",
	P2: "exploring",
	P3: "architecture-committed",
	P4: "pressure-tested",
	P5: "slices-committed",
	P6: "activated",
	P7: "planning",
	P8: "plan-approved",
	P9: "plan-committed",
	P10: "implementing",
	P11: "refining",
	P12: "landed",
};

function phaseToEpicStatus(epic: DeepReadonly<EpicState>): string {
	if (epic.paused) return "paused";
	return EPIC_PHASE_STATUS[epic.phase] ?? epic.phase;
}

const SLICE_PHASE_STATUS: Record<string, string> = {
	P0: "created",
	P6: "created",
	P7: "planning",
	P8: "plan-approved",
	P9: "plan-committed",
	P10: "implementing",
	P11: "refining",
	P12: "completed",
};

function phaseToSliceStatus(phase: string): string {
	return SLICE_PHASE_STATUS[phase] ?? phase;
}

const QUEST_PHASE_STATUS: Record<string, string> = {
	S0: "created",
	S1: "planning",
	S2: "implementing",
	S3: "completed",
};

function phaseToQuestStatus(phase: string): string {
	return QUEST_PHASE_STATUS[phase] ?? phase;
}

// ── Artifact counting ────────────────────────────────────────

/**
 * Build artifact counts from a mix of derived state (slices) and
 * filesystem scanning (files, decisions, learnings, tasks).
 *
 * Filesystem fallback will be removed field-by-field as
 * artifact-tracking events are added in later slices.
 */
function buildArtifacts(state: DeepReadonly<DerivedStateData>, goodplanDir: string): Artifacts {
	// Slice counts from derived state
	let completedSlices = 0;
	let totalSlices = 0;
	for (const [_dir, epic] of state.epics) {
		for (const [_sliceDir, slice] of epic.slices) {
			totalSlices++;
			if (slice.phase === "P12") {
				completedSlices++;
			}
		}
	}

	// Decisions: filesystem fallback (count JSONL entries)
	const decisions = countJsonlEntries(path.join(goodplanDir, "decisions.jsonl"));

	// Learnings: filesystem fallback (count JSONL entries)
	const learnings = countJsonlEntries(path.join(goodplanDir, "learnings.jsonl"));

	// Tasks: filesystem fallback (count from overview.json)
	const { openTasks, totalTasks } = countTasks(goodplanDir);

	// File-based artifacts: filesystem scanning with glob patterns
	// Dual-directory aggregation: project-level + all epic-level
	const architectureFiles = scanMdFiles(goodplanDir, "architecture").concat(
		scanEpicMdFiles(goodplanDir, "architecture"),
	);
	const researchFiles = scanMdFiles(goodplanDir, "research").concat(
		scanEpicMdFiles(goodplanDir, "research"),
	);
	const brainstormFiles = scanMdFiles(goodplanDir, "brainstorm").concat(
		scanEpicMdFiles(goodplanDir, "brainstorm"),
	);
	const prototypeFiles = scanPrototypeDirs(goodplanDir, "prototypes").concat(
		scanEpicPrototypeDirs(goodplanDir, "prototypes"),
	);

	return {
		architecture: { count: architectureFiles.length, files: architectureFiles },
		research: { count: researchFiles.length, files: researchFiles },
		brainstorm: { count: brainstormFiles.length, files: brainstormFiles },
		prototypes: { count: prototypeFiles.length, files: prototypeFiles },
		decisions,
		learnings,
		completedSlices,
		totalSlices,
		openTasks,
		totalTasks,
	};
}

/**
 * Count non-empty lines in a JSONL file (each line = one entry).
 */
function countJsonlEntries(filePath: string): number {
	if (!fs.existsSync(filePath)) return 0;
	try {
		const content = fs.readFileSync(filePath, "utf-8");
		if (content.trim() === "") return 0;
		return content.trim().split("\n").length;
	} catch {
		return 0;
	}
}

/**
 * Count tasks from overview.json (filesystem fallback).
 */
function countTasks(goodplanDir: string): { openTasks: number; totalTasks: number } {
	const overviewPath = path.join(goodplanDir, "overview.json");
	if (!fs.existsSync(overviewPath)) return { openTasks: 0, totalTasks: 0 };
	try {
		const overview = JSON.parse(fs.readFileSync(overviewPath, "utf-8")) as {
			tasks?: Array<{ status: string }>;
		};
		const tasks = overview.tasks ?? [];
		let openTasks = 0;
		for (const task of tasks) {
			if (task.status === "open") openTasks++;
		}
		return { openTasks, totalTasks: tasks.length };
	} catch {
		return { openTasks: 0, totalTasks: 0 };
	}
}

/**
 * Scan a directory under goodplanDir for .md files (non-recursive).
 * Returns state-tree-relative paths (relative to .goodplan/).
 */
function scanMdFiles(goodplanDir: string, dirName: string): string[] {
	const dirPath = path.join(goodplanDir, dirName);
	if (!fs.existsSync(dirPath)) return [];
	try {
		const entries = fs.readdirSync(dirPath);
		const files: string[] = [];
		for (const entry of entries) {
			if (entry.endsWith(".md")) {
				files.push(`${dirName}/${entry}`);
			}
		}
		return files.sort();
	} catch {
		return [];
	}
}

/**
 * Scan all epic directories for .md files in a given subdirectory.
 * Returns state-tree-relative paths.
 */
function scanEpicMdFiles(goodplanDir: string, subDir: string): string[] {
	const epicsDir = path.join(goodplanDir, "epics");
	if (!fs.existsSync(epicsDir)) return [];
	const result: string[] = [];
	try {
		const epicEntries = fs.readdirSync(epicsDir, { withFileTypes: true });
		for (const epicEntry of epicEntries) {
			if (!epicEntry.isDirectory()) continue;
			const mdDir = path.join(epicsDir, epicEntry.name, subDir);
			if (!fs.existsSync(mdDir)) continue;
			const files = fs.readdirSync(mdDir);
			for (const file of files) {
				if (file.endsWith(".md")) {
					result.push(`epics/${epicEntry.name}/${subDir}/${file}`);
				}
			}
		}
	} catch {
		// Silently skip on error
	}
	return result.sort();
}

/**
 * Scan for prototype directories at project level.
 * Returns state-tree-relative paths of subdirectories.
 */
function scanPrototypeDirs(goodplanDir: string, dirName: string): string[] {
	const dirPath = path.join(goodplanDir, dirName);
	if (!fs.existsSync(dirPath)) return [];
	try {
		const entries = fs.readdirSync(dirPath, { withFileTypes: true });
		const dirs: string[] = [];
		for (const entry of entries) {
			if (entry.isDirectory()) {
				dirs.push(`${dirName}/${entry.name}`);
			}
		}
		return dirs.sort();
	} catch {
		return [];
	}
}

/**
 * Scan all epic directories for prototype subdirectories.
 */
function scanEpicPrototypeDirs(goodplanDir: string, subDir: string): string[] {
	const epicsDir = path.join(goodplanDir, "epics");
	if (!fs.existsSync(epicsDir)) return [];
	const result: string[] = [];
	try {
		const epicEntries = fs.readdirSync(epicsDir, { withFileTypes: true });
		for (const epicEntry of epicEntries) {
			if (!epicEntry.isDirectory()) continue;
			const protoDir = path.join(epicsDir, epicEntry.name, subDir);
			if (!fs.existsSync(protoDir)) continue;
			const entries = fs.readdirSync(protoDir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory()) {
					result.push(`epics/${epicEntry.name}/${subDir}/${entry.name}`);
				}
			}
		}
	} catch {
		// Silently skip on error
	}
	return result.sort();
}

// ── Stale entity detection ───────────────────────────────────

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Detect stale entities using event timestamps.
 * Currently a stub -- returns empty warnings since the derived state
 * doesn't yet track per-entity last-activity timestamps.
 * TODO: Add lastActivityTs to EpicState/SliceState/SideQuestState
 *       and populate from event replay.
 */
function detectStaleEntities(_state: DeepReadonly<DerivedStateData>): string[] {
	// Stale detection requires per-entity timestamps which the current
	// derived state schema doesn't track. The v1 implementation read
	// from activity-log.jsonl. For now, return empty -- this will be
	// wired when entity timestamps are added to derived state.
	void STALE_THRESHOLD_MS;
	return [];
}
