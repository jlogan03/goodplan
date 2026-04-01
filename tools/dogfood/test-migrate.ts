/**
 * Migration test harness — runs /migrate skill against a copy of this repo
 * using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-migrate.ts [--model <model>]
 *
 * Creates a temporary copy of this repo at /tmp/goodplan-migrate-test/,
 * then runs the /migrate skill against it via the Agent SDK.
 *
 * Note: This script legitimately references .project/ in fixture setup/verification
 * because it tests migration *from* .project/ to .goodplan/.
 */

import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
} from "node:fs";
import { join } from "node:path";
import {
	createLogger,
	createSimulatedUser,
	gp,
	gpJson,
	isSuccess,
	parseModel,
	runSkillSession,
	tierDefault,
} from "./utils";

// ─── Environment ─────────────────────────────────────────────

const HOME = process.env.HOME;
if (!HOME) {
	console.error("FATAL: HOME environment variable is not set");
	process.exit(1);
}

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const TEST_DIR = "/tmp/goodplan-migrate-test";
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/migrate-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/migrate-transcript.jsonl");
const MODEL = parseModel(tierDefault("quality"));

// ─── Setup ───────────────────────────────────────────────────

console.log("\n[test-migrate] Setting up test copy...");

// Clean previous test
if (existsSync(TEST_DIR)) {
	rmSync(TEST_DIR, { recursive: true, force: true });
}

// Copy the repo using git archive, then overlay .project/
mkdirSync(TEST_DIR, { recursive: true });
execFileSync("bash", ["-c", `git archive HEAD | tar -x -C "${TEST_DIR}"`], { cwd: GOODPLAN_DIR });

// Copy .project/ directory (includes untracked files git archive misses)
// Note: .project/ reference is intentional — this tests migration FROM .project/ to .goodplan/
cpSync(join(GOODPLAN_DIR, ".project"), join(TEST_DIR, ".project"), { recursive: true });

// Copy CLAUDE.md
if (existsSync(join(GOODPLAN_DIR, "CLAUDE.md"))) {
	cpSync(join(GOODPLAN_DIR, "CLAUDE.md"), join(TEST_DIR, "CLAUDE.md"));
}

// Initialize git in the copy so skills can use git commands
execFileSync("git", ["init"], { cwd: TEST_DIR, stdio: "pipe" });
execFileSync("git", ["add", "-A"], { cwd: TEST_DIR, stdio: "pipe" });
execFileSync("git", ["commit", "-m", "initial"], { cwd: TEST_DIR, stdio: "pipe" });

console.log(`[test-migrate] Test copy at: ${TEST_DIR}`);

// Verify goodplan CLI works against the copy
try {
	const parsed = gpJson<{ artifacts?: { totalSlices?: number } }>(["status", "--json"], { cwd: TEST_DIR });
	console.log(`[test-migrate] Status check passed — ${parsed.artifacts?.totalSlices ?? "?"} slices`);
} catch (e) {
	console.error("[test-migrate] FATAL: goodplan status --json failed on test copy");
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
}

// ─── Logging ─────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Simulated User ─────────────────────────────────────────

const simulatedUser = createSimulatedUser({
	systemPrompt: `You are a developer testing the /migrate skill on a goodplan project.
When asked questions, use reasonable defaults:
- For project name: use "goodplan"
- For epic names/details: read the current .project/ directory to discover them
- For slice details: read the existing slice directories
- For approval prompts: approve and continue
- If asked about backup before migration: answer "yes"
- The goal is to migrate the .project/ directory from flat slices to nested (under epics).`,
	transcriptFile: TRANSCRIPT_FILE,
});

// ─── Run /migrate skill ─────────────────────────────────────

async function main(): Promise<void> {
	const startTime = Date.now();
	logger.log("\n[test-migrate] Running /migrate skill...\n");

	try {
		const session = await runSkillSession({
			prompt: "/migrate",
			options: {
				cwd: TEST_DIR,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 300,
				maxBudgetUsd: 15,
				model: MODEL,
				settingSources: ["user", "project"],
				env: {
					...process.env,
					PATH: `${HOME}/.local/bin:${HOME}/bin:${process.env.PATH ?? ""}`,
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser,
			onMessage: (message) => {
				if (message.type === "assistant") {
					const msg = message as { message: { content: Array<{ type: string; name?: string; input?: unknown }> } };
					for (const block of msg.message.content) {
						if (block.type === "tool_use") {
							if (block.name === "Bash") {
								const cmd = typeof block.input === "object" && block.input && "command" in block.input
									? String((block.input as Record<string, unknown>).command).slice(0, 100)
									: "?";
								logger.log(`  [${block.name}] ${cmd}`);
							} else {
								logger.log(`  [${block.name}]`);
							}
						}
					}
				} else if (message.type === "system") {
					const sysMsg = message as Record<string, unknown>;
					if (sysMsg.subtype === "task_started") {
						const desc = typeof sysMsg.description === "string" ? sysMsg.description : "unknown";
						logger.log(`  [subagent] started: ${desc.slice(0, 100)}`);
					} else if (sysMsg.subtype === "task_notification") {
						const status = typeof sysMsg.status === "string" ? sysMsg.status : "unknown";
						const summary = typeof sysMsg.summary === "string" ? sysMsg.summary : "";
						logger.log(`  [subagent] ${status}: ${summary.slice(0, 100)}`);
					}
				}
			},
		});

		if (isSuccess(session.result)) {
			logger.log(`\n--- RESULT ($${session.totalCost.toFixed(4)}) ---\n${session.result.result.slice(0, 3000)}`);
		} else {
			logger.log(`\n--- ERROR (${session.result.subtype}) ---`);
		}

		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		logger.log("\n--- STATS ---");
		logger.log(`Elapsed: ${elapsed}s`);
		logger.log(`Cost: $${session.totalCost.toFixed(4)}`);
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		logger.log(`\n[ERROR] ${errMsg}`);
	}

	// ─── Post-migration verification ─────────────────────────

	logger.log("\n--- POST-MIGRATION VERIFICATION ---\n");

	// Check if slices moved under epics
	// Note: .project/ reference intentional — verifying migration happened
	const hasTopLevelSlices = existsSync(join(TEST_DIR, ".project/slices"));
	logger.log(`Top-level .project/slices/ exists: ${hasTopLevelSlices} (should be false after migration)`);

	// Check status
	try {
		const status = gpJson<{ artifacts?: { totalSlices?: number }; warnings?: unknown }>(["status", "--json"], { cwd: TEST_DIR });
		logger.log(`Status: totalSlices=${status.artifacts?.totalSlices}, warnings=${JSON.stringify(status.warnings)}`);
	} catch (e) {
		logger.log(`Status check failed: ${e instanceof Error ? e.message : String(e)}`);
	}

	// Check if .project-old-* backup exists
	try {
		const parentEntries = readdirSync(TEST_DIR);
		const backups = parentEntries.filter((e) => e.startsWith(".project-old"));
		logger.log(`Backup directories: ${backups.length > 0 ? backups.join(", ") : "none"}`);
	} catch {
		logger.log("Could not list test directory");
	}

	logger.log(`\n[test-migrate] Done. Test directory preserved at: ${TEST_DIR}`);
	logger.log(`[test-migrate] Log file: ${LOG_FILE}`);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
