import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { LEGACY_DIR_NAME, PROJECT_DIR_NAME } from "../../core/data/project.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

// ---------------------------------------------------------------------------
// Detection result types
// ---------------------------------------------------------------------------

/** v1 indicators that signal a pre-event-engine project */
const V1_INDICATORS = ["state-cache.json", "project.json", "state.json"] as const;

/** v2 indicator: the event log file */
const V2_INDICATOR = "events.jsonl";

export type DetectedVersion = "v1" | "v2" | "partial" | "none";

export interface MigrateDetectionResult {
	readonly version: DetectedVersion;
	readonly indicators: string[];
	readonly message: string;
}

// ---------------------------------------------------------------------------
// Detection logic
// ---------------------------------------------------------------------------

function detectVersion(cwd: string): MigrateDetectionResult {
	const goodplanDir = path.join(cwd, PROJECT_DIR_NAME);
	const legacyDir = path.join(cwd, LEGACY_DIR_NAME);

	const hasGoodplanDir = fs.existsSync(goodplanDir) && fs.statSync(goodplanDir).isDirectory();
	const hasLegacyDir = fs.existsSync(legacyDir) && fs.statSync(legacyDir).isDirectory();

	// No project directory at all
	if (!hasGoodplanDir && !hasLegacyDir) {
		return {
			version: "none",
			indicators: [],
			message: "No project found. Run `gp init` to create one.",
		};
	}

	// Determine which directory to scan (prefer .goodplan/ over .project/)
	const scanDir = hasGoodplanDir ? goodplanDir : legacyDir;
	const indicators: string[] = [];

	// Check for v1 indicators
	for (const indicator of V1_INDICATORS) {
		if (fs.existsSync(path.join(scanDir, indicator))) {
			indicators.push(indicator);
		}
	}

	// Also check for .project/ directory as a pre-v1 indicator
	if (hasLegacyDir) {
		indicators.push(LEGACY_DIR_NAME);
	}

	const hasV2 = fs.existsSync(path.join(scanDir, V2_INDICATOR));
	if (hasV2) {
		indicators.push(V2_INDICATOR);
	}

	const hasV1Indicators = indicators.some((i) => i !== V2_INDICATOR && i !== LEGACY_DIR_NAME);

	// Both v1 and v2 indicators present
	if (hasV1Indicators && hasV2) {
		return {
			version: "partial",
			indicators,
			message: "Partially migrated project detected. Both v1 and v2 indicators found.",
		};
	}

	// v2 only
	if (hasV2) {
		return {
			version: "v2",
			indicators,
			message: "Already a v2 project.",
		};
	}

	// v1 indicators (or legacy dir) without v2
	if (hasV1Indicators || hasLegacyDir) {
		return {
			version: "v1",
			indicators,
			message: "v1 project detected. Full migration available in a future release.",
		};
	}

	// .goodplan/ exists but no recognizable indicators
	return {
		version: "none",
		indicators: [],
		message: "No project found. Run `gp init` to create one.",
	};
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/**
 * `gp migrate` (v2) — detection-only skeleton.
 *
 * Checks for v1 indicators (.state-cache.json, project.json, state.json, .project/)
 * and v2 indicators (events.jsonl). Reports the detected version.
 *
 * Full migration logic is deferred to slice 12.
 */
export const migrateCommand = defineCommand({
	meta: {
		name: "migrate",
		description: "Detect project version (v1 vs v2). Full migration deferred to a future release.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const cwd = process.cwd();
		const result = detectVersion(cwd);

		if (args.json || args.query) {
			output(result, args);
		} else if (!args.quiet) {
			const label =
				result.version === "v2"
					? pc.green(result.message)
					: result.version === "v1" || result.version === "partial"
						? pc.yellow(result.message)
						: result.message;

			process.stdout.write(`${label}\n`);
			if (result.indicators.length > 0) {
				process.stdout.write(`Indicators: ${result.indicators.join(", ")}\n`);
			}
		}
	},
});
