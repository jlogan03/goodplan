import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { LEGACY_DIR_NAME, PROJECT_DIR_NAME } from "../../core/data/project.js";
import { GoodplanError } from "../../util/errors.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
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

export function detectVersion(cwd: string): MigrateDetectionResult {
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
 * `gp migrate` (v2) — project migration command.
 *
 * Detects project version (v1/v2/partial/none). For v1 projects,
 * drives the multi-round RPC migration protocol via stdin/stdout JSON.
 *
 * Usage:
 * - First call (no stdin): returns Round 1 questions or detection result
 * - Subsequent calls (stdin with answers): advances migration rounds
 * - On completion: returns summary with entity counts
 *
 * The `/gp:upgrade` skill drives this protocol interactively.
 */
export const migrateCommand = defineCommand({
	meta: {
		name: "migrate",
		description: "Migrate project from v1 to v2 event-sourced format.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const cwd = process.cwd();
		const detection = detectVersion(cwd);

		// For v2 and none: just report detection (no migration needed)
		if (detection.version === "v2" || detection.version === "none") {
			if (args.json || args.query) {
				output(detection, args);
			} else if (!args.quiet) {
				const label =
					detection.version === "v2"
						? pc.green(detection.message)
						: detection.message;
				process.stdout.write(`${label}\n`);
			}
			return;
		}

		// For v1 or partial: run the RPC migration protocol
		const { rpcMigrate } = await import("../../core/rpc/migrate.js");

		const projectDir = fs.existsSync(path.join(cwd, PROJECT_DIR_NAME))
			? path.join(cwd, PROJECT_DIR_NAME)
			: path.join(cwd, LEGACY_DIR_NAME);

		// Read stdin (may be null if no answers provided — triggers question emission)
		const stdin = await readStdin();
		const stdinData = Object.keys(stdin).length > 0 ? stdin : null;

		try {
			const result = await rpcMigrate(projectDir, stdinData, cwd);

			if (args.json || args.query) {
				output(result, args);
			} else if (!args.quiet) {
				if (result.status === "questions") {
					process.stdout.write(`${pc.yellow("Migration round")} — answer the questions below:\n`);
					for (const q of result.round.questions) {
						process.stdout.write(`\n${pc.bold(q.id)}: ${q.question}\n`);
						process.stdout.write(`  ${pc.dim(q.hint)}\n`);
					}
					if (result.warning) {
						process.stdout.write(`\n${pc.yellow("Warning")}: ${result.warning}\n`);
					}
				} else {
					process.stdout.write(
						`${pc.green("Migration complete")} — ${result.summary.projectName}: ` +
							`${String(result.summary.epicCount)} epic(s), ` +
							`${String(result.summary.questCount)} quest(s), ` +
							`${String(result.summary.sliceCount)} slice(s)\n`,
					);
				}
			}
		} catch (error) {
			if (error instanceof GoodplanError) {
				const errorOutput = {
					ok: false,
					error: error.message,
					code: error.code,
				};
				if (args.json || args.query) {
					output(errorOutput, args);
				} else {
					process.stderr.write(`${pc.red("Error")}: ${error.message}\n`);
				}
				process.exit(1);
			}
			throw error;
		}
	},
});
