import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { replayAllScopes } from "../../engine/derived-state/index.js";
import type { StatusResult } from "../../schemas/commands/status.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";
import { buildStatusResult } from "./status/build-result.js";

// Re-export for backward compatibility (tests import from this module)
export { buildStatusResult } from "./status/build-result.js";

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
		status.activeEpic !== null || status.activeSlice !== null || status.activeQuest !== null;

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
		lines.push(
			`  Slices: ${status.artifacts.completedSlices}/${status.artifacts.totalSlices} complete`,
		);
	}

	// ── Tasks section ──
	if (status.artifacts.openTasks > 0) {
		lines.push("");
		lines.push(pc.bold("Tasks"));
		lines.push(`  Tasks: ${status.artifacts.openTasks} open`);
	}

	// ── Artifacts section ──
	const hasArtifacts =
		status.artifacts.architecture.count > 0 ||
		status.artifacts.research.count > 0 ||
		status.artifacts.brainstorm.count > 0 ||
		status.artifacts.prototypes.count > 0 ||
		status.artifacts.decisions > 0 ||
		status.artifacts.learnings > 0;

	if (hasArtifacts) {
		lines.push("");
		lines.push(pc.bold("Artifacts"));
		if (status.artifacts.architecture.count > 0)
			lines.push(`  Architecture: ${status.artifacts.architecture.count} files`);
		if (status.artifacts.research.count > 0)
			lines.push(`  Research:     ${status.artifacts.research.count} files`);
		if (status.artifacts.brainstorm.count > 0)
			lines.push(`  Brainstorm:   ${status.artifacts.brainstorm.count} files`);
		if (status.artifacts.prototypes.count > 0)
			lines.push(`  Prototypes:   ${status.artifacts.prototypes.count} files`);
		if (status.artifacts.decisions > 0) lines.push(`  Decisions:    ${status.artifacts.decisions}`);
		if (status.artifacts.learnings > 0) lines.push(`  Learnings:    ${status.artifacts.learnings}`);
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
 * `gp status` (v2) — show current project status from event-sourced state.
 *
 * 1. Resolves .goodplan/ directory
 * 2. Replays all event logs via replayAllScopes
 * 3. Builds StatusResult via buildStatusResult
 * 4. Outputs JSON or human-readable format
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
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const state = await replayAllScopes(goodplanDir);
		const status = buildStatusResult(state, goodplanDir);

		// When --query is present, output() handles it (auto-implies json).
		// When --json is explicit, pass structured data.
		// Otherwise, format as human-readable text.
		if (args.query || args.json) {
			output(status, args);
		} else {
			const formatted = formatStatusHuman(status);
			output(formatted, args);
		}
	},
});
