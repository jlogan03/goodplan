/**
 * Init skill test harness — tests /gp:init skill against generated fixtures
 * using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-init.ts [--model <model>] [--max-iterations <n>]
 *
 * Tests:
 * 1. Empty directory → new project mode → initialized
 * 2. Directory with TypeScript source → onboard mode → conventions/architecture extracted
 * 3. Override with --mode new on a repo with source → forces new project mode
 * 4. Already-initialized project → detects existing state
 * 5. Error path: broken CLI binary → graceful error (not crash)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
	createLogger,
	createSimulatedUser,
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
const BASE_TEST_DIR = "/tmp/goodplan-init-test";
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/init-test.log");
const _TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/init-transcript.jsonl");
const FIXTURE_SCRIPT = join(GOODPLAN_DIR, "scripts/generate-onboard-fixture.sh");
const MODEL = parseModel(tierDefault("quality"));

// Read skill body for systemPrompt injection (Agent SDK resolves skills via slash commands
// only from the installed cache; for local dev, we inject the skill content directly)
const skillMdPath = join(PLUGIN_DIR, "skills", "init", "SKILL.md");
const skillBody = existsSync(skillMdPath) ? readFileSync(skillMdPath, "utf-8") : "";
if (!skillBody) {
	console.error("FATAL: Could not read init skill SKILL.md at", skillMdPath);
	process.exit(1);
}

const maxIterationsIdx = process.argv.indexOf("--max-iterations");
const MAX_TURNS =
	maxIterationsIdx !== -1 && process.argv[maxIterationsIdx + 1]
		? Number.parseInt(process.argv[maxIterationsIdx + 1] ?? "200", 10)
		: 200;

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-init] Building plugin...");
try {
	execFileSync("bun", ["run", "build:plugin"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-init] Plugin built successfully");
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

// ─── Logging ─────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Helpers ─────────────────────────────────────────────────

function createTestSimulatedUser(
	cwd: string,
	transcriptFile: string,
): ReturnType<typeof createSimulatedUser> {
	return createSimulatedUser({
		cwd,
		systemPrompt: `You are a developer testing the /gp:init skill.
When asked questions, choose reasonable defaults:
- For project name: use whatever is suggested or say "test-project"
- For confirmation prompts: approve and continue
- For mode detection: accept the detected mode
- For regenerate vs keep: choose to regenerate
- For re-run vs exit: choose to exit
- For project description: say "A test project for validating the init skill"
- The goal is to get the project initialized successfully.`,
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

// ─── Test 1: Empty directory → new project mode ─────────────

async function testEmptyDir(): Promise<boolean> {
	const testDir = join(BASE_TEST_DIR, "empty");
	logger.log("\n=== TEST 1: Empty directory → new project mode ===\n");

	try {
		// Create empty git repo
		mkdirSync(testDir, { recursive: true });
		writeFileSync(
			join(testDir, "package.json"),
			JSON.stringify({ name: "empty-project", version: "0.1.0" }, null, 2),
		);
		execFileSync("git", ["init"], { cwd: testDir, stdio: "pipe" });
		execFileSync("git", ["add", "-A"], { cwd: testDir, stdio: "pipe" });
		execFileSync(
			"git",
			["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "-m", "initial"],
			{ cwd: testDir, stdio: "pipe" },
		);

		const transcript = join(GOODPLAN_DIR, "tools/dogfood/init-transcript-test1.jsonl");
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
					env: {
						...process.env,
						PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					},
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
							skillBody,
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

			// Verify
			const hasGoodplan = existsSync(join(testDir, ".goodplan"));
			const hasProjectJson =
				existsSync(join(testDir, ".goodplan/goodplan.json")) ||
				existsSync(join(testDir, ".goodplan/project.json"));

			logger.log(`[test1] .goodplan/ exists: ${hasGoodplan}`);
			logger.log(`[test1] project state exists: ${hasProjectJson}`);
			logger.log(`[test1] Cost: $${session.totalCost.toFixed(4)}`);

			if (hasGoodplan && hasProjectJson) {
				logger.log("PASS: Test 1 — empty dir initialized as new project");
				return true;
			}
			logger.log("FAIL: Test 1 — .goodplan/ not created properly");
			return false;
		} finally {
			simulatedUser.close();
		}
	} catch (err) {
		logger.log(`FAIL: Test 1 — ${err instanceof Error ? err.message : String(err)}`);
		return false;
	}
}

// ─── Test 2: TypeScript source → onboard mode ───────────────

async function testOnboardTypescript(): Promise<boolean> {
	const testDir = join(BASE_TEST_DIR, "typescript");
	logger.log("\n=== TEST 2: TypeScript source → onboard mode ===\n");

	try {
		// Generate fixture with TypeScript source
		execFileSync("bash", [FIXTURE_SCRIPT, testDir], {
			stdio: "pipe",
			encoding: "utf-8",
		});

		const transcript = join(GOODPLAN_DIR, "tools/dogfood/init-transcript-test2.jsonl");
		const simulatedUser = createTestSimulatedUser(testDir, transcript);

		try {
			const session = await runSkillSession({
				prompt: "Run /gp:init. Initialize this project following the init skill instructions.",
				options: {
					cwd: testDir,
					permissionMode: "bypassPermissions",
					allowDangerouslySkipPermissions: true,
					maxTurns: MAX_TURNS,
					maxBudgetUsd: 15,
					model: MODEL,
					settingSources: [],
					plugins: [{ type: "local", path: PLUGIN_DIR }],
					env: {
						...process.env,
						PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					},
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
							skillBody,
						].join("\n"),
					},
				},
				transcriptFile: transcript,
				simulatedUser,
				checkViolations: true,
				onMessage: onMessage as (msg: Record<string, unknown>) => void,
			});

			if (isSuccess(session.result)) {
				logger.log(`[test2] Result: ${session.result.result.slice(0, 1000)}`);
			} else {
				logger.log(`[test2] Error: ${session.result.subtype}`);
			}

			// Verify
			const hasGoodplan = existsSync(join(testDir, ".goodplan"));
			const hasIdea = existsSync(join(testDir, ".goodplan/idea.md"));
			const hasConventions = existsSync(join(testDir, ".goodplan/conventions.md"));
			const hasArchitecture = existsSync(join(testDir, ".goodplan/architecture/_overview.md"));

			logger.log(`[test2] .goodplan/ exists: ${hasGoodplan}`);
			logger.log(`[test2] idea.md exists: ${hasIdea}`);
			logger.log(`[test2] conventions.md exists: ${hasConventions}`);
			logger.log(`[test2] architecture/_overview.md exists: ${hasArchitecture}`);
			logger.log(`[test2] Cost: $${session.totalCost.toFixed(4)}`);

			// Check gp status
			try {
				const status = gp(["status", "--json"], { cwd: testDir, gpBin: GP_BIN });
				logger.log(`[test2] gp status: exit=${status.exitCode}`);
			} catch (e) {
				logger.log(`[test2] gp status failed: ${e instanceof Error ? e.message : String(e)}`);
			}

			if (hasGoodplan && hasIdea && hasConventions && hasArchitecture) {
				logger.log("PASS: Test 2 — TypeScript repo onboarded with conventions and architecture");
				return true;
			}
			logger.log("FAIL: Test 2 — missing expected artifacts");
			return false;
		} finally {
			simulatedUser.close();
		}
	} catch (err) {
		logger.log(`FAIL: Test 2 — ${err instanceof Error ? err.message : String(err)}`);
		return false;
	}
}

// ─── Test 3: Override with --mode new ────────────────────────

async function testModeOverride(): Promise<boolean> {
	const testDir = join(BASE_TEST_DIR, "mode-override");
	logger.log("\n=== TEST 3: Override with --mode new on repo with source ===\n");

	try {
		// Generate fixture with TypeScript source
		execFileSync("bash", [FIXTURE_SCRIPT, testDir], {
			stdio: "pipe",
			encoding: "utf-8",
		});

		const transcript = join(GOODPLAN_DIR, "tools/dogfood/init-transcript-test3.jsonl");
		const simulatedUser = createTestSimulatedUser(testDir, transcript);

		try {
			const session = await runSkillSession({
				prompt: "Run /gp:init --mode new. Force new project mode following the init skill instructions.",
				options: {
					cwd: testDir,
					permissionMode: "bypassPermissions",
					allowDangerouslySkipPermissions: true,
					maxTurns: MAX_TURNS,
					maxBudgetUsd: 5,
					model: MODEL,
					settingSources: [],
					plugins: [{ type: "local", path: PLUGIN_DIR }],
					env: {
						...process.env,
						PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					},
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
							skillBody,
						].join("\n"),
					},
				},
				transcriptFile: transcript,
				simulatedUser,
				checkViolations: true,
				onMessage: onMessage as (msg: Record<string, unknown>) => void,
			});

			if (isSuccess(session.result)) {
				logger.log(`[test3] Result: ${session.result.result.slice(0, 500)}`);

				// Should have initialized but NOT created conventions.md or architecture
				// (new project mode skips onboarding)
				const hasGoodplan = existsSync(join(testDir, ".goodplan"));
				const hasConventions = existsSync(join(testDir, ".goodplan/conventions.md"));
				const hasArchitecture = existsSync(join(testDir, ".goodplan/architecture/_overview.md"));

				logger.log(`[test3] .goodplan/ exists: ${hasGoodplan}`);
				logger.log(`[test3] conventions.md exists (should be false): ${hasConventions}`);
				logger.log(`[test3] architecture exists (should be false): ${hasArchitecture}`);
				logger.log(`[test3] Cost: $${session.totalCost.toFixed(4)}`);

				if (hasGoodplan && !hasConventions && !hasArchitecture) {
					logger.log("PASS: Test 3 — --mode new override forced new project path");
					return true;
				}
				// Partial pass: if it initialized but also onboarded, the override didn't work perfectly
				if (hasGoodplan) {
					logger.log(
						"PARTIAL: Test 3 — initialized but may not have respected --mode new override",
					);
					return false; // Override not respected — count as failure
				}
			} else {
				logger.log(`[test3] Error: ${session.result.subtype}`);
			}

			logger.log("FAIL: Test 3 — did not initialize project");
			return false;
		} finally {
			simulatedUser.close();
		}
	} catch (err) {
		logger.log(`FAIL: Test 3 — ${err instanceof Error ? err.message : String(err)}`);
		return false;
	}
}

// ─── Test 4: Already-initialized project ─────────────────────

async function testAlreadyInitialized(): Promise<boolean> {
	const testDir = join(BASE_TEST_DIR, "already-init");
	logger.log("\n=== TEST 4: Already-initialized project ===\n");

	try {
		// Generate fixture with source
		execFileSync("bash", [FIXTURE_SCRIPT, testDir], {
			stdio: "pipe",
			encoding: "utf-8",
		});

		// Pre-initialize .goodplan/ via CLI
		const initResult = gp(["init", "--name", "already-init", "--json"], {
			cwd: testDir,
			gpBin: GP_BIN,
		});
		if (initResult.exitCode !== 0) {
			logger.log(`FAIL: Test 4 — could not pre-init: ${initResult.stdout}`);
			return false;
		}

		// Write some artifacts to simulate a fully onboarded project
		mkdirSync(join(testDir, ".goodplan/architecture"), { recursive: true });
		writeFileSync(
			join(testDir, ".goodplan/idea.md"),
			"# Already Init\n\nA pre-initialized project.",
		);
		writeFileSync(
			join(testDir, ".goodplan/conventions.md"),
			"# Conventions\n\nTypeScript + Express.",
		);
		writeFileSync(
			join(testDir, ".goodplan/architecture/_overview.md"),
			"# Architecture\n\nOverview.",
		);

		const transcript = join(GOODPLAN_DIR, "tools/dogfood/init-transcript-test4.jsonl");
		const simulatedUser = createTestSimulatedUser(testDir, transcript);

		try {
			const session = await runSkillSession({
				prompt: "Run /gp:init. Initialize this project following the init skill instructions.",
				options: {
					cwd: testDir,
					permissionMode: "bypassPermissions",
					allowDangerouslySkipPermissions: true,
					maxTurns: 30,
					maxBudgetUsd: 2,
					model: MODEL,
					settingSources: [],
					plugins: [{ type: "local", path: PLUGIN_DIR }],
					env: {
						...process.env,
						PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					},
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
							skillBody,
						].join("\n"),
					},
				},
				transcriptFile: transcript,
				simulatedUser,
				onMessage: onMessage as (msg: Record<string, unknown>) => void,
			});

			if (isSuccess(session.result)) {
				const text = session.result.result.toLowerCase();
				const detectedExisting =
					text.includes("already") ||
					text.includes("initialized") ||
					text.includes("existing") ||
					text.includes("current status");

				logger.log(`[test4] Result: ${session.result.result.slice(0, 500)}`);
				logger.log(`[test4] Detected existing: ${detectedExisting}`);
				logger.log(`[test4] Cost: $${session.totalCost.toFixed(4)}`);

				if (detectedExisting) {
					logger.log("PASS: Test 4 — detected already-initialized project");
					return true;
				}
			} else {
				logger.log(`[test4] Error: ${session.result.subtype}`);
			}

			logger.log("FAIL: Test 4 — did not detect existing project state");
			return false;
		} finally {
			simulatedUser.close();
		}
	} catch (err) {
		logger.log(`FAIL: Test 4 — ${err instanceof Error ? err.message : String(err)}`);
		return false;
	}
}

// ─── Test 5: Error path — broken CLI → graceful error ───────

async function testErrorPath(): Promise<boolean> {
	const testDir = join(BASE_TEST_DIR, "error-path");
	logger.log("\n=== TEST 5: Error path — broken CLI → graceful error ===\n");

	try {
		// Create empty git repo
		mkdirSync(testDir, { recursive: true });
		writeFileSync(
			join(testDir, "package.json"),
			JSON.stringify({ name: "error-test", version: "0.1.0" }, null, 2),
		);
		execFileSync("git", ["init"], { cwd: testDir, stdio: "pipe" });
		execFileSync("git", ["add", "-A"], { cwd: testDir, stdio: "pipe" });
		execFileSync(
			"git",
			["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "-m", "initial"],
			{ cwd: testDir, stdio: "pipe" },
		);

		// Sabotage the gp binary by creating a broken one that shadows the real one on PATH
		const brokenBinaryDir = join(testDir, ".broken-bin");
		mkdirSync(brokenBinaryDir, { recursive: true });
		writeFileSync(
			join(brokenBinaryDir, "gp"),
			'#!/bin/sh\necho "ERROR: gp binary corrupted" >&2\nexit 1\n',
			{
				mode: 0o755,
			},
		);

		const transcript = join(GOODPLAN_DIR, "tools/dogfood/init-transcript-test5.jsonl");
		const simulatedUser = createTestSimulatedUser(testDir, transcript);

		try {
			const session = await runSkillSession({
				prompt: "Run /gp:init. Initialize this project following the init skill instructions.",
				options: {
					cwd: testDir,
					permissionMode: "bypassPermissions",
					allowDangerouslySkipPermissions: true,
					maxTurns: 30,
					maxBudgetUsd: 2,
					model: MODEL,
					settingSources: [],
					plugins: [{ type: "local", path: PLUGIN_DIR }],
					env: {
						...process.env,
						PATH: `${brokenBinaryDir}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					},
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
							skillBody,
						].join("\n"),
					},
				},
				transcriptFile: transcript,
				simulatedUser,
				onMessage: onMessage as (msg: Record<string, unknown>) => void,
			});

			if (isSuccess(session.result)) {
				const text = session.result.result.toLowerCase();
				const reportedError =
					text.includes("error") ||
					text.includes("fail") ||
					text.includes("not found") ||
					text.includes("incompatible") ||
					text.includes("could not") ||
					text.includes("unable");

				logger.log(`[test5] Result: ${session.result.result.slice(0, 500)}`);
				logger.log(`[test5] Reported error gracefully: ${reportedError}`);
				logger.log(`[test5] Cost: $${session.totalCost.toFixed(4)}`);

				if (reportedError) {
					logger.log("PASS: Test 5 — broken CLI produced graceful error");
					return true;
				}
				logger.log("FAIL: Test 5 — did not report CLI error gracefully");
				return false;
			}

			// Non-success result is also acceptable — the skill errored out
			logger.log(`[test5] Session ended with: ${session.result.subtype}`);
			logger.log(`[test5] Cost: $${session.totalCost.toFixed(4)}`);
			logger.log("PASS: Test 5 — skill did not crash on broken CLI (non-success exit)");
			return true;
		} finally {
			simulatedUser.close();
		}
	} catch (err) {
		logger.log(`FAIL: Test 5 — ${err instanceof Error ? err.message : String(err)}`);
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
		logger.log(`[test-init] CLI version: ${versionResult.stdout.trim()}`);
	} catch (e) {
		console.error("[test-init] FATAL: goodplan CLI not available");
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}

	// Clean up previous test runs
	execFileSync("rm", ["-rf", BASE_TEST_DIR], { stdio: "pipe" });
	mkdirSync(BASE_TEST_DIR, { recursive: true });

	const results: Array<{ name: string; passed: boolean }> = [];

	// Run tests sequentially (each needs its own simulated user session)
	const test1 = await testEmptyDir();
	results.push({ name: "Empty dir → new project", passed: test1 });

	const test2 = await testOnboardTypescript();
	results.push({ name: "TypeScript source → onboard", passed: test2 });

	const test3 = await testModeOverride();
	results.push({ name: "--mode new override", passed: test3 });

	const test4 = await testAlreadyInitialized();
	results.push({ name: "Already-initialized detection", passed: test4 });

	const test5 = await testErrorPath();
	results.push({ name: "Broken CLI → graceful error", passed: test5 });

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

	if (passed < total) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
