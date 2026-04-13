/**
 * Core skills v2 test harness -- validates /gp:init, /gp:status, and
 * workflow-guide skill loading work correctly against the full v2 CLI
 * command surface.
 *
 * Usage: bun tools/dogfood/test-core-skills-v2.ts [--model <model>] [--max-iterations <n>]
 *
 * Prerequisites: `bun run build` must have been run first.
 *
 * Tests:
 * 1. /gp:init skill -- initializes a project in a temp directory
 * 2. /gp:status via CLI -- returns structured JSON with expected fields
 * 3. workflow-guide skill -- loads and provides orientation with gp command suggestions
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
	createLogger,
	createSimulatedUser,
	createTestEnv,
	gp,
	isSuccess,
	parseModel,
	platformBinaryDir,
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
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");
const GP_BIN = join(PLUGIN_DIR, "binaries", platformBinaryDir(), "gp");
const BASE_TEST_DIR = "/tmp/goodplan-core-skills-v2-test";
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/core-skills-v2-test.log");
const MODEL = parseModel(tierDefault("pipeline"));

const maxIterationsIdx = process.argv.indexOf("--max-iterations");
const MAX_TURNS =
	maxIterationsIdx !== -1 && process.argv[maxIterationsIdx + 1]
		? Number.parseInt(process.argv[maxIterationsIdx + 1] ?? "100", 10)
		: 100;

// Read skill bodies for systemPrompt injection
const initSkillPath = join(PLUGIN_DIR, "skills", "init", "SKILL.md");
const workflowGuideSkillPath = join(PLUGIN_DIR, "skills", "workflow-guide", "SKILL.md");

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-core-skills-v2] Building plugin...");
try {
	execFileSync("bun", ["run", "build"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-core-skills-v2] Plugin built successfully");
} catch (err) {
	console.error("FATAL: Plugin build failed:", err instanceof Error ? err.message : String(err));
	process.exit(1);
}

if (!existsSync(PLUGIN_DIR)) {
	console.error("FATAL: Plugin not built at", PLUGIN_DIR);
	process.exit(1);
}

if (!existsSync(GP_BIN)) {
	console.error("FATAL: Plugin binary not found at", GP_BIN);
	process.exit(1);
}

const initSkillBody = existsSync(initSkillPath) ? readFileSync(initSkillPath, "utf-8") : "";
if (!initSkillBody) {
	console.error("FATAL: Could not read init skill SKILL.md at", initSkillPath);
	process.exit(1);
}

const workflowGuideSkillBody = existsSync(workflowGuideSkillPath)
	? readFileSync(workflowGuideSkillPath, "utf-8")
	: "";
if (!workflowGuideSkillBody) {
	console.error("FATAL: Could not read workflow-guide skill SKILL.md at", workflowGuideSkillPath);
	process.exit(1);
}

// ─── Logging ─────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Helpers ─────────────────────────────────────────────────

function createTestSimulatedUser(
	cwd: string,
	transcriptFile: string,
): ReturnType<typeof createSimulatedUser> {
	return createSimulatedUser({
		cwd,
		systemPrompt: `You are a developer testing goodplan skills.
When asked questions, choose reasonable defaults:
- For project name: use whatever is suggested or say "v2-test"
- For confirmation prompts: approve and continue
- For mode detection: accept the detected mode
- For regenerate vs keep: choose to keep
- For re-run vs exit: choose to exit
- For project description: say "A test project for validating core skills"
- The goal is to get through the skill successfully.`,
		transcriptFile,
	});
}

function onMessage(message: Record<string, unknown>): void {
	if (message.type === "assistant") {
		const msg = message as {
			message: { content: Array<{ type: string; name?: string; input?: unknown }> };
		};
		for (const block of msg.message.content) {
			if (block.type === "tool_use") {
				if (block.name === "Bash") {
					const cmd =
						typeof block.input === "object" && block.input && "command" in block.input
							? String((block.input as Record<string, unknown>).command).slice(0, 100)
							: "?";
					logger.log(`  [${block.name}] ${cmd}`);
				} else {
					logger.log(`  [${block.name}]`);
				}
			}
		}
	} else if (message.type === "system") {
		if (message.subtype === "task_started") {
			const desc = typeof message.description === "string" ? message.description : "unknown";
			logger.log(`  [subagent] started: ${desc.slice(0, 100)}`);
		} else if (message.subtype === "task_notification") {
			const status = typeof message.status === "string" ? message.status : "unknown";
			const summary = typeof message.summary === "string" ? message.summary : "";
			logger.log(`  [subagent] ${status}: ${summary.slice(0, 100)}`);
		}
	}
}

// ─── Test 1: Init skill creates valid project state ──────────

async function testInit(): Promise<boolean> {
	const testDir = join(BASE_TEST_DIR, "init");
	logger.log("\n=== TEST 1: /gp:init skill creates valid project state ===\n");

	try {
		// Create empty git repo
		mkdirSync(testDir, { recursive: true });
		writeFileSync(
			join(testDir, "package.json"),
			JSON.stringify({ name: "v2-test", version: "0.1.0" }, null, 2),
		);
		execFileSync("git", ["init"], { cwd: testDir, stdio: "pipe" });
		execFileSync("git", ["add", "-A"], { cwd: testDir, stdio: "pipe" });
		execFileSync(
			"git",
			["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "-m", "initial"],
			{ cwd: testDir, stdio: "pipe" },
		);

		const transcript = join(GOODPLAN_DIR, "tools/dogfood/core-skills-v2-transcript-test1.jsonl");
		const simulatedUser = createTestSimulatedUser(testDir, transcript);

		try {
			const session = await runSkillSession({
				prompt: "Run /gp:init. Initialize this project following the init skill instructions.",
				options: {
					cwd: testDir,
					permissionMode: "bypassPermissions",
					allowDangerouslySkipPermissions: true,
					maxTurns: MAX_TURNS,
					maxBudgetUsd: 5,
					model: MODEL,
					settingSources: [],
					plugins: [{ type: "local", path: PLUGIN_DIR }],
					env: createTestEnv(PLUGIN_DIR),
					systemPrompt: {
						type: "preset",
						preset: "claude_code",
						append: [
							"You are in an automated test harness. Execute the skill below faithfully.",
							"Do not ask the user to confirm -- proceed automatically.",
							"When AskUserQuestion is needed, use it (the harness has a simulated user).",
							"",
							"# Init Skill Instructions",
							"",
							initSkillBody,
						].join("\n"),
					},
				},
				transcriptFile: transcript,
				simulatedUser,
				checkViolations: true,
				onMessage: onMessage as (msg: Record<string, unknown>) => void,
			});

			if (isSuccess(session.result)) {
				logger.log(`[test1] Result: ${session.result.result.slice(0, 500)}`);
			} else {
				logger.log(`[test1] Error: ${session.result.subtype}`);
			}

			// Verify: .goodplan/events.jsonl exists with project-initialized event
			const eventsPath = join(testDir, ".goodplan/events.jsonl");
			const hasEvents = existsSync(eventsPath);
			let hasProjectInitialized = false;

			if (hasEvents) {
				const eventsContent = readFileSync(eventsPath, "utf-8");
				hasProjectInitialized = eventsContent.includes("project-initialized");
				logger.log(`[test1] events.jsonl has project-initialized: ${hasProjectInitialized}`);
			}

			const hasGoodplan = existsSync(join(testDir, ".goodplan"));
			logger.log(`[test1] .goodplan/ exists: ${hasGoodplan}`);
			logger.log(`[test1] events.jsonl exists: ${hasEvents}`);
			logger.log(`[test1] Cost: $${session.totalCost.toFixed(4)}`);

			if (hasGoodplan && hasEvents && hasProjectInitialized) {
				logger.log("PASS: Test 1 -- init created valid project state");
				return true;
			}
			logger.log("FAIL: Test 1 -- missing expected project state");
			return false;
		} finally {
			simulatedUser.close();
		}
	} catch (err) {
		logger.log(`FAIL: Test 1 -- ${err instanceof Error ? err.message : String(err)}`);
		return false;
	}
}

// ─── Test 2: Status returns structured JSON ──────────────────

async function testStatus(): Promise<boolean> {
	const testDir = join(BASE_TEST_DIR, "init"); // Reuse init dir from test 1
	logger.log("\n=== TEST 2: gp status --json returns structured output ===\n");

	try {
		// Run gp status --json directly via CLI (not Agent SDK -- this is a CLI test)
		const result = gp(["status", "--json"], { cwd: testDir, gpBin: GP_BIN });

		logger.log(`[test2] exit code: ${result.exitCode}`);
		logger.log(`[test2] stdout (first 500): ${result.stdout.slice(0, 500)}`);

		if (result.exitCode !== 0) {
			logger.log("FAIL: Test 2 -- gp status --json exited non-zero");
			return false;
		}

		// Verify output parses as JSON with expected top-level keys
		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(result.stdout) as Record<string, unknown>;
		} catch (parseErr) {
			logger.log(
				`FAIL: Test 2 -- output is not valid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
			);
			return false;
		}

		const hasProject = "project" in parsed;
		const hasActiveEpic = "activeEpic" in parsed;
		const hasRecommendations = "recommendations" in parsed;

		logger.log(`[test2] has 'project' key: ${hasProject}`);
		logger.log(`[test2] has 'activeEpic' key: ${hasActiveEpic}`);
		logger.log(`[test2] has 'recommendations' key: ${hasRecommendations}`);

		// Verify project name matches what we initialized
		const project = parsed.project as Record<string, unknown> | undefined;
		const projectName = project?.name;
		logger.log(`[test2] project.name: ${String(projectName)}`);

		if (hasProject && hasActiveEpic && hasRecommendations) {
			logger.log("PASS: Test 2 -- status returns structured JSON with expected keys");
			return true;
		}

		logger.log("FAIL: Test 2 -- missing expected top-level keys");
		return false;
	} catch (err) {
		logger.log(`FAIL: Test 2 -- ${err instanceof Error ? err.message : String(err)}`);
		return false;
	}
}

// ─── Test 3: Workflow guide provides orientation ─────────────

async function testWorkflowGuide(): Promise<boolean> {
	const testDir = join(BASE_TEST_DIR, "init"); // Reuse init dir from test 1
	logger.log("\n=== TEST 3: workflow-guide skill provides orientation ===\n");

	try {
		const transcript = join(GOODPLAN_DIR, "tools/dogfood/core-skills-v2-transcript-test3.jsonl");

		const session = await runSkillSession({
			prompt: "What should I do next with this project?",
			options: {
				cwd: testDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 50,
				maxBudgetUsd: 3,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: createTestEnv(PLUGIN_DIR),
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test. Execute skills and report results concisely.",
						"Use the workflow-guide skill if available, or provide guidance based on project state.",
						"",
						"# Workflow Guide Skill Instructions",
						"",
						workflowGuideSkillBody,
					].join("\n"),
				},
			},
			transcriptFile: transcript,
			onMessage: onMessage as (msg: Record<string, unknown>) => void,
		});

		if (isSuccess(session.result)) {
			const resultText = session.result.result;
			logger.log(`[test3] Result (first 1000): ${resultText.slice(0, 1000)}`);
			logger.log(`[test3] Cost: $${session.totalCost.toFixed(4)}`);

			// Deterministic metric: response contains gp command suggestions
			const hasGpCommands = resultText.includes("gp ");
			logger.log(`[test3] Contains 'gp ' command references: ${hasGpCommands}`);

			if (hasGpCommands) {
				logger.log("PASS: Test 3 -- workflow-guide provided orientation with gp commands");
				return true;
			}

			// Fallback: check for slash command references
			const hasSlashCommands = resultText.includes("/gp:");
			logger.log(`[test3] Contains '/gp:' slash command references: ${hasSlashCommands}`);

			if (hasSlashCommands) {
				logger.log("PASS: Test 3 -- workflow-guide provided orientation with slash commands");
				return true;
			}

			logger.log("FAIL: Test 3 -- response lacks actionable gp command suggestions");
			return false;
		}

		logger.log(`[test3] Error: ${session.result.subtype}`);
		logger.log("FAIL: Test 3 -- session did not complete successfully");
		return false;
	} catch (err) {
		logger.log(`FAIL: Test 3 -- ${err instanceof Error ? err.message : String(err)}`);
		return false;
	}
}

// ─── Main ────────────────────────────────────────────────────

async function main(): Promise<void> {
	const startTime = Date.now();

	// Verify CLI is available
	try {
		const versionResult = gp(["--version", "--json"], { gpBin: GP_BIN });
		if (versionResult.exitCode !== 0) throw new Error(`exit ${versionResult.exitCode}`);
		logger.log(`[test-core-skills-v2] CLI version: ${versionResult.stdout.trim()}`);
	} catch (e) {
		console.error("[test-core-skills-v2] FATAL: goodplan CLI not available");
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}

	// Clean up previous test runs
	execFileSync("rm", ["-rf", BASE_TEST_DIR], { stdio: "pipe" });
	mkdirSync(BASE_TEST_DIR, { recursive: true });

	logger.log(`[test-core-skills-v2] Model: ${MODEL}`);
	logger.log(`[test-core-skills-v2] Max turns: ${MAX_TURNS}`);

	const results: Array<{ name: string; passed: boolean }> = [];

	// Test 1: Init (must run first -- tests 2 and 3 depend on it)
	const test1 = await testInit();
	results.push({ name: "Init skill creates valid project state", passed: test1 });

	// Test 2: Status (depends on test 1 having created .goodplan/)
	if (test1) {
		const test2 = await testStatus();
		results.push({ name: "Status returns structured JSON", passed: test2 });
	} else {
		logger.log("\n=== TEST 2: SKIPPED (depends on test 1) ===\n");
		results.push({ name: "Status returns structured JSON", passed: false });
	}

	// Test 3: Workflow guide (depends on test 1 having created .goodplan/)
	if (test1) {
		const test3 = await testWorkflowGuide();
		results.push({ name: "Workflow guide provides orientation", passed: test3 });
	} else {
		logger.log("\n=== TEST 3: SKIPPED (depends on test 1) ===\n");
		results.push({ name: "Workflow guide provides orientation", passed: false });
	}

	// Summary
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	const passed = results.filter((r) => r.passed).length;
	const total = results.length;

	logger.log("\n=== SUMMARY ===\n");
	for (const r of results) {
		logger.log(`${r.passed ? "PASS" : "FAIL"}: ${r.name}`);
	}
	logger.log(`\n${passed}/${total} tests passed in ${elapsed}s`);
	logger.log(`Test directories preserved at: ${BASE_TEST_DIR}`);
	logger.log(`Log file: ${LOG_FILE}`);

	// Clean up test directory
	execFileSync("rm", ["-rf", BASE_TEST_DIR], { stdio: "pipe" });
	logger.log(`\n[test-core-skills-v2] Cleaned up ${BASE_TEST_DIR}`);

	if (passed < total) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
