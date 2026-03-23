import compile from "@michaelhomer/jqjs";
import { defineCommand } from "citty";
import pc from "picocolors";
import { assembleState } from "../../core/data/assemble.js";
import { countFiles } from "../../core/data/files.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson, getJsonl } from "../../core/data/tree.js";
import type { ActivityEntry } from "../../schemas/records/activity-log.js";
import type { DecisionEntry } from "../../schemas/records/decision.js";
import type { LearningEntry } from "../../schemas/records/learning.js";
import type { Epic } from "../../schemas/entities/epic.js";
import type { Overview } from "../../schemas/entities/overview.js";
import type { Project } from "../../schemas/entities/project.js";
import type { Quest } from "../../schemas/entities/quest.js";
import type { Slice } from "../../schemas/entities/slice.js";
import type { Artifacts, StatusResult } from "../../schemas/commands/status.js";
import { GoodplanError } from "../../util/errors.js";
import { deterministicStringify } from "../../util/json.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * Build a StatusResult from the current project state.
 * Uses assembleState() (not loadState) — deliberately chosen because it handles
 * fresh/zero-state projects gracefully.
 *
 * Architecture: read-only commands bypass RPC and access the Data Layer directly.
 */
export function buildStatusResult(projectDir?: string): StatusResult {
	const dir = projectDir ?? resolveProjectDir();
	const state = assembleState(dir);

	const project = getJson<Project>(state, "project.json");
	if (project === undefined) {
		throw new GoodplanError(
			"DATA_NO_PROJECT",
			"No project.json found in .project/ directory",
		);
	}

	// ── Active entities ──
	const activeEpic = resolveActiveEpic(project, state);
	const activeSlice = resolveActiveSlice(project, state);
	const activeQuest = resolveActiveQuest(project, state);

	// ── Artifacts ──
	const artifacts = countArtifacts(project, dir, state);

	// ── Recommendations & warnings ──
	const recommendations: string[] = [];
	const warnings: string[] = [];

	generateRecommendations(project, activeEpic, activeSlice, activeQuest, artifacts, recommendations);
	generateWarnings(project, state, warnings);

	return {
		project: {
			name: project.name,
			version: project.version,
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

function resolveActiveEpic(
	project: Project,
	state: import("../../core/tree.js").ProjectState,
): StatusResult["activeEpic"] {
	if (project.activeEpic === null) return null;
	const epic = getJson<Epic>(state, `epics/${project.activeEpic}/epic.json`);
	if (epic === undefined) return null;
	return { name: epic.name, status: epic.status };
}

function resolveActiveSlice(
	project: Project,
	state: import("../../core/tree.js").ProjectState,
): StatusResult["activeSlice"] {
	if (project.activeSlice === null) return null;
	const slice = getJson<Slice>(state, `slices/${project.activeSlice}/slice.json`);
	if (slice === undefined) return null;
	return { name: slice.name, status: slice.status };
}

function resolveActiveQuest(
	project: Project,
	state: import("../../core/tree.js").ProjectState,
): StatusResult["activeQuest"] {
	if (project.activeQuest === null) return null;
	const quest = getJson<Quest>(state, `quests/${project.activeQuest}/quest.json`);
	if (quest === undefined) return null;
	return { name: quest.name, status: quest.status };
}

// ── Artifact counting ────────────────────────────────────────

function countArtifacts(
	project: Project,
	projectDir: string,
	state: import("../../core/tree.js").ProjectState,
): Artifacts {
	// Decisions and learnings from JSONL in state
	const decisions = getJsonl<DecisionEntry>(state, "decisions.jsonl");
	const learnings = getJsonl<LearningEntry>(state, "learnings.jsonl");

	// Slice overview for completed/total counts
	const sliceOverview = getJson<Overview>(state, "slices/overview.json");
	let completedSlices = 0;
	let totalSlices = 0;
	if (sliceOverview !== undefined) {
		totalSlices = sliceOverview.items.length;
		for (const item of sliceOverview.items) {
			if (item.status === "completed") {
				completedSlices++;
			}
		}
	}

	// File-based artifact counts — use countFiles helper to keep filesystem I/O in Data Layer.
	// Count across both project-level and active epic dirs.
	let architectureFiles = countFiles(projectDir, "architecture", ".md");
	let researchFiles = countFiles(projectDir, "research", ".md");
	let brainstormFiles = countFiles(projectDir, "brainstorm", ".md");
	let prototypeFiles = countFiles(projectDir, "prototypes", ".md");

	if (project.activeEpic !== null) {
		const epicBase = `epics/${project.activeEpic}`;
		architectureFiles += countFiles(projectDir, `${epicBase}/architecture`, ".md");
		researchFiles += countFiles(projectDir, `${epicBase}/research`, ".md");
		brainstormFiles += countFiles(projectDir, `${epicBase}/brainstorm`, ".md");
		prototypeFiles += countFiles(projectDir, `${epicBase}/prototypes`, ".md");
	}

	return {
		architectureFiles,
		researchFiles,
		brainstormFiles,
		prototypeFiles,
		decisions: decisions?.length ?? 0,
		learnings: learnings?.length ?? 0,
		completedSlices,
		totalSlices,
	};
}

// ── Recommendations ──────────────────────────────────────────

function generateRecommendations(
	project: Project,
	activeEpic: StatusResult["activeEpic"],
	activeSlice: StatusResult["activeSlice"],
	activeQuest: StatusResult["activeQuest"],
	artifacts: Artifacts,
	recommendations: string[],
): void {
	// No epic → suggest creating one
	if (activeEpic === null && activeSlice === null && activeQuest === null) {
		recommendations.push("Run epic:create to start");
		return;
	}

	// Active slice recommendations based on status
	if (activeSlice !== null) {
		const statusActions: Record<string, string> = {
			created: `Active slice ${activeSlice.name} is created — run slice:plan to begin planning`,
			planning: `Active slice ${activeSlice.name} is in planning — waiting for submit-plan`,
			"plan-created": `Active slice ${activeSlice.name} has a plan — run slice:refine-plan or slice:implement`,
			refining: `Active slice ${activeSlice.name} is refining — waiting for submit-refinement`,
			"plan-refined": `Active slice ${activeSlice.name} plan is refined — run slice:implement`,
			implementing: `Active slice ${activeSlice.name} is implementing — waiting for submit-implementation`,
			"implementation-complete": `Active slice ${activeSlice.name} implementation is complete — run slice:complete`,
		};
		const action = statusActions[activeSlice.status];
		if (action !== undefined) {
			recommendations.push(action);
		}
	}

	// Active quest recommendations based on status
	if (activeQuest !== null) {
		const statusActions: Record<string, string> = {
			created: `Active quest ${activeQuest.name} is created — run quest:plan to begin planning`,
			planning: `Active quest ${activeQuest.name} is in planning — waiting for submit-plan`,
			"plan-created": `Active quest ${activeQuest.name} has a plan — run quest:refine-plan or quest:implement`,
			refining: `Active quest ${activeQuest.name} is refining — waiting for submit-refinement`,
			"plan-refined": `Active quest ${activeQuest.name} plan is refined — run quest:implement`,
			implementing: `Active quest ${activeQuest.name} is implementing — waiting for submit-implementation`,
			"implementation-complete": `Active quest ${activeQuest.name} implementation is complete — run quest:complete`,
		};
		const action = statusActions[activeQuest.status];
		if (action !== undefined) {
			recommendations.push(action);
		}
	}

	// Epic progress summary
	if (activeEpic !== null && artifacts.totalSlices > 0) {
		recommendations.push(
			`Epic ${activeEpic.name}: ${artifacts.completedSlices}/${artifacts.totalSlices} slices complete`,
		);
	}
}

// ── Warnings ─────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateWarnings(
	project: Project,
	state: import("../../core/tree.js").ProjectState,
	warnings: string[],
): void {
	const activityLog = getJsonl<ActivityEntry>(state, "activity-log.jsonl");
	if (activityLog === undefined || activityLog.length === 0) return;

	const now = Date.now();

	// Check for stale active entities
	if (project.activeSlice !== null) {
		checkStale(activityLog, `slices/${project.activeSlice}`, project.activeSlice, "slice", now, warnings);
	}
	if (project.activeQuest !== null) {
		checkStale(activityLog, `quests/${project.activeQuest}`, project.activeQuest, "quest", now, warnings);
	}
}

function checkStale(
	activityLog: ActivityEntry[],
	scopePrefix: string,
	entityName: string,
	entityType: string,
	now: number,
	warnings: string[],
): void {
	// Find most recent activity entry for this entity
	let latestTs = 0;
	for (const entry of activityLog) {
		if (entry.scope === scopePrefix || entry.scope.startsWith(`${scopePrefix}/`)) {
			const ts = new Date(entry.ts).getTime();
			if (ts > latestTs) {
				latestTs = ts;
			}
		}
	}

	if (latestTs > 0 && now - latestTs > STALE_THRESHOLD_MS) {
		const days = Math.floor((now - latestTs) / (24 * 60 * 60 * 1000));
		warnings.push(`Active ${entityType} ${entityName} has had no activity for ${days} days`);
	}
}

// ── Human-readable output ────────────────────────────────────

/**
 * Format StatusResult as human-readable output with picocolors.
 * Sections: Project, Active Work, Progress, Artifacts, Recommendations/Warnings.
 * Empty sections are omitted (using "No active work" pattern).
 */
export function formatStatusHuman(status: StatusResult): string {
	const lines: string[] = [];

	// ── Project section ──
	lines.push(`${pc.bold(status.project.name)} v${status.project.version}`);

	// ── Active Work section ──
	const hasActiveWork =
		status.activeEpic !== null ||
		status.activeSlice !== null ||
		status.activeQuest !== null;

	if (!hasActiveWork) {
		lines.push("");
		lines.push("No active work");
	} else {
		lines.push("");
		lines.push(pc.bold("Active Work"));
		if (status.activeEpic !== null) {
			lines.push(`  Epic:  ${status.activeEpic.name} ${pc.dim(`(${status.activeEpic.status})`)}`);
		}
		if (status.activeSlice !== null) {
			lines.push(`  Slice: ${status.activeSlice.name} ${pc.dim(`(${status.activeSlice.status})`)}`);
		}
		if (status.activeQuest !== null) {
			lines.push(`  Quest: ${status.activeQuest.name} ${pc.dim(`(${status.activeQuest.status})`)}`);
		}
	}

	// ── Progress section ──
	if (status.artifacts.totalSlices > 0) {
		lines.push("");
		lines.push(pc.bold("Progress"));
		lines.push(`  Slices: ${status.artifacts.completedSlices}/${status.artifacts.totalSlices} complete`);
	}

	// ── Artifacts section ──
	const hasArtifacts =
		status.artifacts.architectureFiles > 0 ||
		status.artifacts.researchFiles > 0 ||
		status.artifacts.brainstormFiles > 0 ||
		status.artifacts.prototypeFiles > 0 ||
		status.artifacts.decisions > 0 ||
		status.artifacts.learnings > 0;

	if (hasArtifacts) {
		lines.push("");
		lines.push(pc.bold("Artifacts"));
		if (status.artifacts.architectureFiles > 0)
			lines.push(`  Architecture: ${status.artifacts.architectureFiles} files`);
		if (status.artifacts.researchFiles > 0)
			lines.push(`  Research:     ${status.artifacts.researchFiles} files`);
		if (status.artifacts.brainstormFiles > 0)
			lines.push(`  Brainstorm:   ${status.artifacts.brainstormFiles} files`);
		if (status.artifacts.prototypeFiles > 0)
			lines.push(`  Prototypes:   ${status.artifacts.prototypeFiles} files`);
		if (status.artifacts.decisions > 0)
			lines.push(`  Decisions:    ${status.artifacts.decisions}`);
		if (status.artifacts.learnings > 0)
			lines.push(`  Learnings:    ${status.artifacts.learnings}`);
	}

	// ── Recommendations section ──
	if (status.recommendations.length > 0) {
		lines.push("");
		for (const rec of status.recommendations) {
			lines.push(`  ${pc.dim("-")} ${rec}`);
		}
	}

	// ── Warnings section ──
	if (status.warnings.length > 0) {
		lines.push("");
		for (const warn of status.warnings) {
			lines.push(`  ${pc.yellow("!")} ${warn}`);
		}
	}

	return lines.join("\n");
}

/**
 * Apply a jq expression to data and return the results.
 * Throws VALIDATION_INVALID_QUERY for invalid expressions.
 */
export function applyQuery(data: unknown, expr: string): unknown {
	let filter: (input: unknown) => Generator<unknown>;
	try {
		filter = compile(expr);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		throw new GoodplanError("VALIDATION_INVALID_QUERY", `Invalid jq expression: ${message}`, {
			expression: expr,
		});
	}

	const results: unknown[] = [];
	try {
		for (const value of filter(data)) {
			results.push(value);
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		throw new GoodplanError("VALIDATION_INVALID_QUERY", `jq query execution failed: ${message}`, {
			expression: expr,
		});
	}

	if (results.length === 0) {
		return null;
	}
	if (results.length === 1) {
		return results[0];
	}
	return results;
}

/**
 * `goodplan status` — show current project status.
 *
 * Flags:
 * - --json: output as structured JSON
 * - --query <expr>: apply jq expression to JSON output (implies --json)
 */
export const statusCommand = defineCommand({
	meta: {
		name: "status",
		description: "Show current project status",
	},
	args: {
		...globalArgs,
		query: {
			type: "string",
			description: "jq expression to filter JSON output (implies --json)",
			required: false,
		},
	},
	setup() {},
	async run({ args }) {
		// --query implies --json per architecture (commands-api.md): the intermediate
		// representation is always JSON, and query results are printed as JSON.
		const useJson = args.json || Boolean(args.query);

		const status = buildStatusResult();

		if (useJson) {
			if (args.query) {
				const result = applyQuery(status, args.query);
				process.stdout.write(`${deterministicStringify(result)}\n`);
			} else {
				output(status, args);
			}
		} else {
			const formatted = formatStatusHuman(status);
			output(formatted, args);
		}
	},
});
