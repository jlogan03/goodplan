/**
 * Onboard-repo test harness — runs /onboard-repo skill against a generated
 * fixture repo using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-onboard.ts [--model <model>]
 *
 * Generates a fixture TypeScript project at /tmp/goodplan-onboard-test/,
 * installs skills into the fixture's project-level .claude/skills/,
 * then runs the /onboard-repo skill against it via the Agent SDK.
 */

import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
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
const TEST_DIR = "/tmp/goodplan-onboard-test";
const FIXTURE_SCRIPT = join(GOODPLAN_DIR, "scripts/generate-onboard-fixture.sh");
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/onboard-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/onboard-transcript.jsonl");
const MODEL = parseModel(tierDefault("quality"));

// ─── Setup ───────────────────────────────────────────────────

console.log("\n[test-onboard] Generating fixture repo...");

// Generate fixture
execFileSync("bash", [FIXTURE_SCRIPT, TEST_DIR], {
	stdio: "pipe",
	encoding: "utf-8",
});

console.log(`[test-onboard] Fixture created at: ${TEST_DIR}`);

// Install skills to fixture's project-level .claude/skills/
const fixtureSkillsDir = join(TEST_DIR, ".claude/skills");
mkdirSync(fixtureSkillsDir, { recursive: true });

const repoSkillsDir = join(GOODPLAN_DIR, "skills");
cpSync(repoSkillsDir, fixtureSkillsDir, { recursive: true });
console.log(`[test-onboard] Skills installed to: ${fixtureSkillsDir}`);

// Verify goodplan CLI is available
try {
	const versionResult = gp(["--version", "--json"]);
	if (versionResult.exitCode !== 0) throw new Error(`exit ${versionResult.exitCode}`);
	console.log(`[test-onboard] CLI version: ${versionResult.stdout.trim()}`);
} catch (e) {
	console.error("[test-onboard] FATAL: goodplan CLI not available");
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
}

// ─── Logging ─────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Simulated User ─────────────────────────────────────────

const simulatedUser = createSimulatedUser({
	cwd: TEST_DIR,
	systemPrompt: `You are a developer testing the /onboard-repo skill on a TypeScript fixture project.
When asked questions, choose reasonable defaults:
- For project name: use whatever is suggested
- For confirmation prompts: approve and continue
- For regenerate vs keep: choose to regenerate
- The goal is to onboard the fixture repo and create a .goodplan/ directory with idea.md.`,
	transcriptFile: TRANSCRIPT_FILE,
});

// ─── Run /onboard-repo skill ─────────────────────────────────

async function main(): Promise<void> {
	const startTime = Date.now();
	logger.log("\n[test-onboard] Running /onboard-repo skill...\n");

	try {
		const session = await runSkillSession({
			prompt: "/onboard-repo",
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
			checkViolations: true,
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
		logger.log(`Violations: ${session.violations.length}`);

		if (session.violations.length > 0) {
			for (const v of session.violations) {
				logger.log(`  VIOLATION: ${v}`);
			}
		}
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		logger.log(`\n[ERROR] ${errMsg}`);
	}

	// ─── Post-onboard verification ───────────────────────────

	logger.log("\n--- POST-ONBOARD VERIFICATION ---\n");

	// Check .goodplan/ exists
	const hasGoodplan = existsSync(join(TEST_DIR, ".goodplan"));
	logger.log(`PASS: .goodplan/ exists: ${hasGoodplan}`);

	// Check idea.md exists and is non-empty
	const ideaPath = join(TEST_DIR, ".goodplan/idea.md");
	const hasIdea = existsSync(ideaPath);
	let ideaSize = 0;
	if (hasIdea) {
		ideaSize = readFileSync(ideaPath, "utf-8").length;
	}
	logger.log(`PASS: idea.md exists: ${hasIdea}, size: ${ideaSize} bytes`);

	// Check goodplan status works
	try {
		const status = gpJson<Record<string, unknown>>(["status", "--json"], { cwd: TEST_DIR });
		logger.log(`PASS: goodplan status: ${JSON.stringify(status).slice(0, 500)}`);
	} catch (e) {
		logger.log(`FAIL: goodplan status failed: ${e instanceof Error ? e.message : String(e)}`);
	}

	logger.log(`\n[test-onboard] Done. Test directory preserved at: ${TEST_DIR}`);
	logger.log(`[test-onboard] Log file: ${LOG_FILE}`);
}

// ─── Negative test: existing .goodplan/ ───────────────────

const NEGATIVE_TEST_DIR = "/tmp/goodplan-onboard-test-negative";

async function negativeTest(): Promise<void> {
	logger.log("\n--- NEGATIVE TEST: existing .goodplan/ ---\n");

	// Generate a fresh fixture
	execFileSync("bash", [FIXTURE_SCRIPT, NEGATIVE_TEST_DIR], {
		stdio: "pipe",
		encoding: "utf-8",
	});

	// Install skills
	const negSkillsDir = join(NEGATIVE_TEST_DIR, ".claude/skills");
	mkdirSync(negSkillsDir, { recursive: true });
	cpSync(join(GOODPLAN_DIR, "skills"), negSkillsDir, { recursive: true });

	// Pre-create .goodplan/ to simulate a fully-onboarded repo
	const negGoodplanDir = join(NEGATIVE_TEST_DIR, ".goodplan");
	mkdirSync(join(negGoodplanDir, "architecture"), { recursive: true });
	writeFileSync(join(negGoodplanDir, "project.json"), '{"name":"taskflow"}');
	writeFileSync(join(negGoodplanDir, "idea.md"), "# TaskFlow\n\nA task management API.");
	writeFileSync(join(negGoodplanDir, "conventions.md"), "# Conventions\n\nTypeScript + Express.");
	writeFileSync(join(negGoodplanDir, "architecture", "_overview.md"), "# Architecture\n\nOverview.");

	logger.log("[negative-test] .goodplan/ pre-created with idea.md, conventions.md, architecture");

	let stopped = false;
	let crashed = false;

	try {
		const negTranscript = join(GOODPLAN_DIR, "tools/dogfood/onboard-negative-transcript.jsonl");
		const session = await runSkillSession({
			prompt: "/onboard-repo",
			options: {
				cwd: NEGATIVE_TEST_DIR,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 30,
				maxBudgetUsd: 2,
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
			transcriptFile: negTranscript,
			simulatedUser,
		});

		if (isSuccess(session.result)) {
			const text = session.result.result.toLowerCase();
			if (text.includes("already has") || text.includes("migrate") || text.includes("project-status") || text.includes("fully onboarded")) {
				stopped = true;
			}
			logger.log(`[negative-test] Result: ${session.result.result.slice(0, 500)}`);
		} else {
			logger.log(`[negative-test] Error result: ${session.result.subtype}`);
		}
	} catch (err) {
		crashed = true;
		logger.log(`[negative-test] CRASH: ${err instanceof Error ? err.message : String(err)}`);
	}

	if (crashed) {
		logger.log("FAIL: Skill crashed on existing .goodplan/");
	} else if (stopped) {
		logger.log("PASS: Skill detected existing project and stopped gracefully");
	} else {
		logger.log("FAIL: Skill did not detect existing .goodplan/ or did not stop gracefully");
	}
}

main()
	.then(() => negativeTest())
	.then(() => { simulatedUser.close(); })
	.catch((err) => {
		console.error("Fatal error:", err);
		process.exit(1);
	});
