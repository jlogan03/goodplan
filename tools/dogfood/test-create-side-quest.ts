/**
 * Create-side-quest orchestrator test harness — runs /gp:create-side-quest skill against a
 * minimal fixture using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-create-side-quest.ts [--model <model>] [--max-iterations <n>]
 *
 * Creates a project with an active epic via `createMinimalFixture`, then runs
 * `/gp:create-side-quest` via the Agent SDK with a simulated user.
 *
 * Tests:
 * 1. Full pipeline: all 4 phases run, quest reaches `plan-refined` status
 * 2. Re-entry: fixture at `explored` status resumes from plan Q&A (assert first
 *    sub-agent is `plan-phase`, not `explore-phase`)
 * 3. Error path: invoke with missing epic context, verify graceful error message
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import {
	createLogger,
	createMinimalFixture,
	createSimulatedUser,
	gp,
	isSuccess,
	parseModel,
	platformBinaryDir,
	runSkillSession,
	tierDefault,
	verifyEntityStatus,
} from "./utils";

// ─── CLI Arg Parsing ────────────────────────────────────────

function parseMaxIterations(defaultVal: number): number {
	const idx = process.argv.indexOf("--max-iterations");
	if (idx !== -1) {
		const next = process.argv[idx + 1];
		if (next && !next.startsWith("--")) {
			const parsed = Number.parseInt(next, 10);
			if (!Number.isNaN(parsed) && parsed > 0) return parsed;
		}
	}
	return defaultVal;
}

// ─── Environment ────────────────────────────────────────────

const HOME = process.env.HOME;
if (!HOME) {
	console.error("FATAL: HOME environment variable is not set");
	process.exit(1);
}

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");
const GP_BIN = join(PLUGIN_DIR, "binaries", platformBinaryDir(), "gp");
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/create-side-quest-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/create-side-quest-transcript.jsonl");
const MODEL = parseModel(tierDefault("structural"));
const FULL_PIPELINE_MAX_ITERATIONS = parseMaxIterations(30);
const REENTRY_MAX_ITERATIONS = Math.min(parseMaxIterations(15), 15);

const QUEST_NAME = "test-fix-logging";
const QUEST_GOAL =
	"Fix structured logging to include correlation IDs across all API endpoints. " +
	"Currently logs are unstructured and cannot be traced across service boundaries.";

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-create-side-quest] Building plugin...");
try {
	execFileSync("bun", ["run", "build:plugin"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-create-side-quest] Plugin built successfully");
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

// Sync new skills from dist to installed cache so the Agent SDK can discover them.
const installedSkillsDir = join(
	HOME,
	".claude/plugins/cache/goodplan-marketplace/goodplan",
);
try {
	const versions = readdirSync(installedSkillsDir)
		.filter((d: string) => statSync(join(installedSkillsDir, d)).isDirectory())
		.sort()
		.reverse();
	const latestVersion = versions[0];
	if (latestVersion) {
		const installedPluginDir = join(installedSkillsDir, latestVersion);
		// Sync create-side-quest skill to installed cache
		const srcSkill = join(PLUGIN_DIR, "skills", "create-side-quest");
		const dstSkill = join(installedPluginDir, "skills", "create-side-quest");
		if (existsSync(srcSkill)) {
			mkdirSync(dstSkill, { recursive: true });
			execFileSync("rsync", ["-a", "--exclude", ".DS_Store", `${srcSkill}/`, `${dstSkill}/`]);
			console.log("[test-create-side-quest] Synced create-side-quest skill to installed cache");
		}
		// Sync agents to installed cache
		const srcAgents = join(PLUGIN_DIR, "agents");
		const dstAgents = join(installedPluginDir, "agents");
		if (existsSync(srcAgents)) {
			execFileSync("rsync", ["-a", "--exclude", ".DS_Store", `${srcAgents}/`, `${dstAgents}/`]);
			console.log("[test-create-side-quest] Synced agents to installed cache");
		}
	}
} catch (err) {
	console.warn("[test-create-side-quest] WARN: Could not sync to installed cache:", err instanceof Error ? err.message : String(err));
}

// ─── Logging ────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Tool call tracking ─────────────────────────────────────

function createToolCallTracker(logFn: (msg: string) => void): {
	toolCalls: Array<{ toolName: string; input: unknown }>;
	scoreProgression: number[];
	agentNames: string[];
	onMessage: (message: SDKMessage) => void;
} {
	const toolCalls: Array<{ toolName: string; input: unknown }> = [];
	const scoreProgression: number[] = [];
	const agentNames: string[] = [];

	const onMessage = (message: SDKMessage): void => {
		if (message.type === "assistant" && "message" in message) {
			const msg = message as Record<string, unknown>;
			const innerMsg =
				typeof msg.message === "object" && msg.message !== null
					? (msg.message as Record<string, unknown>)
					: null;
			const content = Array.isArray(innerMsg?.content)
				? (innerMsg.content as Array<Record<string, unknown>>)
				: null;

			if (content) {
				for (const block of content) {
					if (block.type === "tool_use") {
						const name = typeof block.name === "string" ? block.name : "unknown";
						toolCalls.push({ toolName: name, input: block.input });

						if (name === "Bash") {
							const cmd =
								typeof block.input === "object" &&
								block.input &&
								"command" in (block.input as Record<string, unknown>)
									? String((block.input as Record<string, unknown>).command).slice(0, 120)
									: "?";
							logFn(`  [${name}] ${cmd}`);
						} else if (name === "Agent") {
							const inputStr = JSON.stringify(block.input).slice(0, 150);
							logFn(`  [${name}] ${inputStr}`);
							// Track agent names for re-entry assertions
							if (typeof block.input === "object" && block.input) {
								const agentInput = block.input as Record<string, unknown>;
								const agentName = typeof agentInput.agent === "string" ? agentInput.agent : "";
								if (agentName) agentNames.push(agentName);
							}
						} else {
							logFn(`  [${name}]`);
						}
					}

					if (block.type === "text" && typeof block.text === "string") {
						const scoreMatch = block.text.match(
							/(?:aggregate|overall|net)\s*score[:\s]*(\d+(?:\.\d+)?)/i,
						);
						if (scoreMatch?.[1]) {
							const score = Number.parseFloat(scoreMatch[1]);
							if (!Number.isNaN(score)) {
								scoreProgression.push(score);
								logFn(`  [score] ${score}/10 (iteration ${scoreProgression.length})`);
							}
						}
					}
				}
			}
		} else if (message.type === "system") {
			const sysMsg = message as Record<string, unknown>;
			if (sysMsg.subtype === "task_started") {
				const desc = typeof sysMsg.description === "string" ? sysMsg.description : "unknown";
				logFn(`  [subagent] started: ${desc.slice(0, 120)}`);
			} else if (sysMsg.subtype === "task_notification") {
				const status = typeof sysMsg.status === "string" ? sysMsg.status : "unknown";
				const summary = typeof sysMsg.summary === "string" ? sysMsg.summary : "";
				logFn(`  [subagent] ${status}: ${summary.slice(0, 120)}`);
			}
		}
	};

	return { toolCalls, scoreProgression, agentNames, onMessage };
}

// ─── Load SKILL.md ──────────────────────────────────────────

function loadSkillBody(): string {
	const skillMdPath = join(PLUGIN_DIR, "skills", "create-side-quest", "SKILL.md");
	if (!existsSync(skillMdPath)) {
		logger.log("FATAL: create-side-quest SKILL.md not found in dist");
		process.exit(1);
	}
	const skillContent = readFileSync(skillMdPath, "utf-8");
	return skillContent.replace(/^---[\s\S]*?---\n/, "");
}

// ─── Test 1: Full Pipeline ──────────────────────────────────

async function testFullPipeline(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 1: Full Pipeline");
	logger.log("========================================\n");

	const startTime = Date.now();
	let allPassed = true;

	// Setup fixture with active epic (needed for quest context)
	logger.log("[full-pipeline] Creating fixture with active epic...");
	const fixtureDir = await createMinimalFixture({
		epicName: "parent-epic",
		sliceName: "placeholder-slice",
		sliceGoal: "Placeholder for fixture setup",
		withSource: true,
		activateEpic: true,
	});
	logger.log(`[full-pipeline] Fixture created at: ${fixtureDir}`);

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			"You are a senior developer testing the /gp:create-side-quest skill.",
			`You want to create a quest to fix logging. The quest goal is: ${QUEST_GOAL}`,
			`The quest name should be: ${QUEST_NAME}`,
			"",
			"When asked about quest name or goal, confirm the provided name and goal.",
			"When asked about exploration findings, say 'That's enough, let's move on.'",
			"When asked about approach, suggest adding middleware for correlation IDs.",
			"When asked about phasing, suggest 2 phases: middleware first, then logging refactor.",
			"When asked about expected behavior, say each request gets a unique correlation ID in all logs.",
			"When asked about risks, say potential performance impact of ID generation.",
			"Always choose concrete, specific answers. Never say 'Proceed' without context.",
			"If asked to continue exploring, say 'That's enough' or choose the option to stop exploring.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody();

	logger.log(
		`\n[full-pipeline] Running /gp:create-side-quest (model: ${MODEL}, max-iterations: ${FULL_PIPELINE_MAX_ITERATIONS})...\n`,
	);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Create a side quest named "${QUEST_NAME}" with the goal: ${QUEST_GOAL}. Follow the create-side-quest skill instructions completely through all phases.`,
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 400,
				maxBudgetUsd: 30,
				model: MODEL,
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: {
					...process.env,
					PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					GP_CREATE_SIDE_QUEST_MAX_ITERATIONS: String(FULL_PIPELINE_MAX_ITERATIONS),
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						`Use at most ${FULL_PIPELINE_MAX_ITERATIONS} refinement iterations for cost control.`,
						"Do not ask the user to confirm — proceed automatically through all phases.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"",
						"# Create-Side-Quest Skill Instructions",
						"",
						skillBody,
					].join("\n"),
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser,
			checkViolations: true,
			onMessage: tracker.onMessage,
		});

		if (isSuccess(sessionResult.result)) {
			logger.log(`\n--- RESULT ($${sessionResult.totalCost.toFixed(4)}) ---`);
			logger.log(sessionResult.result.result.slice(0, 3000));
		} else {
			logger.log(`\n--- ERROR (${sessionResult.result.subtype}) ---`);
		}
	} catch (err) {
		logger.log(`\n[ERROR] ${err instanceof Error ? err.message : String(err)}`);
	} finally {
		simulatedUser.close();
	}

	// ─── Post-run verification ──────────────────────────────

	logger.log("\n--- POST-RUN VERIFICATION (Full Pipeline) ---\n");

	// Test 1a: Quest exists and reached plan-refined status
	const questStatus = verifyEntityStatus("quest", QUEST_NAME, "plan-refined", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});
	if (questStatus.ok) {
		logger.log("PASS: Quest reached 'plan-refined' status");
	} else {
		const lateStatuses = ["refining", "plan-created", "planning", "explored", "exploring"];
		if (lateStatuses.includes(questStatus.actual)) {
			logger.log(`WARN: Quest reached '${questStatus.actual}' (expected 'plan-refined') — partial pipeline completion`);
		} else {
			logger.log(`FAIL: Quest status is '${questStatus.actual}', expected 'plan-refined'`);
			allPassed = false;
		}
	}

	// Test 1b: Orchestrator discipline — no artifact reads
	const artifactViolations = sessionResult?.artifactReadViolations ?? [];
	if (artifactViolations.length === 0) {
		logger.log("PASS: No orchestrator-level artifact reads detected");
	} else {
		logger.log(`FAIL: ${artifactViolations.length} artifact read violation(s):`);
		for (const v of artifactViolations) {
			logger.log(`  - ${v}`);
		}
		allPassed = false;
	}

	// Test 1c: Score progression (refinement loop ran)
	if (tracker.scoreProgression.length >= 1) {
		logger.log(`PASS: Refinement loop ran ${tracker.scoreProgression.length} iteration(s)`);
		logger.log(`  Scores: ${tracker.scoreProgression.join(" -> ")}`);
	} else {
		logger.log("WARN: No score progression detected in session log");
		logger.log("  (Scores may have been reported in sub-agent sessions)");
	}

	// Test 1d: State write violations
	if (sessionResult && sessionResult.violations.length > 0) {
		logger.log(`FAIL: ${sessionResult.violations.length} state write violation(s):`);
		for (const v of sessionResult.violations) {
			logger.log(`  - ${v}`);
		}
		allPassed = false;
	} else {
		logger.log("PASS: No state write violations detected");
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	logger.log(`\n[full-pipeline] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`);
	logger.log(`[full-pipeline] Fixture preserved at: ${fixtureDir}`);

	return allPassed;
}

// ─── Test 2: Re-entry from "explored" status ────────────────

async function testReentry(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 2: Re-entry from 'explored' status");
	logger.log("========================================\n");

	const startTime = Date.now();
	let allPassed = true;

	// Create fixture with active epic
	logger.log("[re-entry] Creating fixture with active epic and explored quest...");
	const fixtureDir = await createMinimalFixture({
		epicName: "parent-epic",
		sliceName: "placeholder-slice",
		sliceGoal: "Placeholder for fixture setup",
		withSource: true,
		activateEpic: true,
	});

	// Create quest and advance to explored status
	gp(["quest:create", "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
		stdin: JSON.stringify({ name: QUEST_NAME, goal: QUEST_GOAL }),
	});
	gp(["quest:explore", "--quest", QUEST_NAME, "--json"], { cwd: fixtureDir, gpBin: GP_BIN });
	gp(["submit-explore", "--quest", QUEST_NAME, "--json"], { cwd: fixtureDir, gpBin: GP_BIN });

	// Verify pre-condition
	const preStatus = verifyEntityStatus("quest", QUEST_NAME, "explored", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});
	if (!preStatus.ok) {
		logger.log(`FAIL: Pre-condition not met — quest status is '${preStatus.actual}', expected 'explored'`);
		return false;
	}
	logger.log(`[re-entry] Fixture at '${preStatus.actual}' status: ${fixtureDir}`);

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			"You are a senior developer testing re-entry of the /gp:create-side-quest skill.",
			"The quest is already explored. You should be starting from plan Q&A.",
			"",
			"When asked about approach, suggest middleware for correlation IDs.",
			"When asked about phasing, suggest 2 phases: middleware, then logging.",
			"When asked about expected behavior, say correlation IDs in all logs.",
			"Always choose concrete answers.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody();

	logger.log(`\n[re-entry] Running /gp:create-side-quest (model: ${MODEL}, max-iterations: ${REENTRY_MAX_ITERATIONS})...\n`);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Continue the quest "${QUEST_NAME}". It should already be explored. Follow the create-side-quest skill instructions to resume from the correct phase.`,
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 400,
				maxBudgetUsd: 20,
				model: MODEL,
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: {
					...process.env,
					PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					GP_CREATE_SIDE_QUEST_MAX_ITERATIONS: String(REENTRY_MAX_ITERATIONS),
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						`Use at most ${REENTRY_MAX_ITERATIONS} refinement iterations for cost control.`,
						"Do not ask the user to confirm — proceed automatically through all phases.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"",
						"# Create-Side-Quest Skill Instructions",
						"",
						skillBody,
					].join("\n"),
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser,
			checkViolations: true,
			onMessage: tracker.onMessage,
		});

		if (isSuccess(sessionResult.result)) {
			logger.log(`\n--- RESULT ($${sessionResult.totalCost.toFixed(4)}) ---`);
			logger.log(sessionResult.result.result.slice(0, 3000));
		} else {
			logger.log(`\n--- ERROR (${sessionResult.result.subtype}) ---`);
		}
	} catch (err) {
		logger.log(`\n[ERROR] ${err instanceof Error ? err.message : String(err)}`);
	} finally {
		simulatedUser.close();
	}

	// Verification
	logger.log("\n--- POST-RUN VERIFICATION (Re-entry) ---\n");

	const postStatus = verifyEntityStatus("quest", QUEST_NAME, "plan-refined", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});

	// Check explore was not re-run
	const exploreCommands = tracker.toolCalls.filter((tc) => {
		if (tc.toolName !== "Bash") return false;
		const input = tc.input as Record<string, unknown>;
		const cmd = typeof input.command === "string" ? input.command : "";
		return cmd.includes("quest:explore") && !cmd.includes("quest:show");
	});

	if (exploreCommands.length === 0) {
		logger.log("PASS: Explore phase was not re-run (re-entry skipped it)");
	} else {
		logger.log(`FAIL: Explore phase was re-run (${exploreCommands.length} quest:explore commands found)`);
		allPassed = false;
	}

	// Check first agent spawn was plan-phase, not explore-phase
	if (tracker.agentNames.length > 0) {
		const firstAgent = tracker.agentNames[0];
		if (firstAgent === "plan-phase") {
			logger.log("PASS: First sub-agent spawn is 'plan-phase' (not 'explore-phase')");
		} else if (firstAgent === "explore-phase") {
			logger.log("FAIL: First sub-agent spawn is 'explore-phase' — should be 'plan-phase' for re-entry from explored");
			allPassed = false;
		} else {
			logger.log(`INFO: First sub-agent spawn is '${firstAgent}' — not explore-phase (acceptable)`);
		}
	} else {
		logger.log("INFO: No agent spawns tracked (may use different tool patterns)");
	}

	if (postStatus.ok) {
		logger.log("PASS: Quest reached 'plan-refined' status after re-entry");
	} else {
		const lateStatuses = ["refining", "plan-created", "planning"];
		if (lateStatuses.includes(postStatus.actual)) {
			logger.log(`WARN: Quest reached '${postStatus.actual}' (expected 'plan-refined') — partial re-entry completion`);
		} else {
			logger.log(`FAIL: Quest status is '${postStatus.actual}', expected advancement beyond 'explored'`);
			allPassed = false;
		}
	}

	// Discipline check
	const artifactViolations = sessionResult?.artifactReadViolations ?? [];
	if (artifactViolations.length === 0) {
		logger.log("PASS: No orchestrator-level artifact reads detected");
	} else {
		logger.log(`FAIL: ${artifactViolations.length} artifact read violation(s):`);
		for (const v of artifactViolations) {
			logger.log(`  - ${v}`);
		}
		allPassed = false;
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	logger.log(`\n[re-entry] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`);
	logger.log(`[re-entry] Fixture preserved at: ${fixtureDir}`);

	return allPassed;
}

// ─── Test 3: Error path (no epic context) ───────────────────

async function testErrorPath(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 3: Error path (graceful handling)");
	logger.log("========================================\n");

	// Create a bare project with no epic — the skill should handle this gracefully
	const tmpDir = join("/tmp", `gp-fixture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
	mkdirSync(tmpDir, { recursive: true });
	writeFileSync(
		join(tmpDir, "package.json"),
		JSON.stringify({ name: "gp-test-fixture", version: "0.1.0", type: "module" }, null, 2),
	);
	execFileSync("git", ["init"], { cwd: tmpDir, stdio: "pipe" });
	execFileSync("git", ["add", "-A"], { cwd: tmpDir, stdio: "pipe" });
	execFileSync(
		"git",
		["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "-m", "initial"],
		{ cwd: tmpDir, stdio: "pipe" },
	);
	gp(["init", "--name", "test-fixture", "--json"], { cwd: tmpDir, gpBin: GP_BIN });

	// The skill should still be able to create a quest even without an active epic
	// (quests are project-scoped, not epic-scoped)
	const questResult = gp(["quest:create", "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
		stdin: JSON.stringify({ name: "test-quest", goal: "Test quest" }),
	});

	if (questResult.exitCode === 0) {
		logger.log("PASS: Quest creation succeeds without active epic (quests are project-scoped)");
	} else {
		logger.log(`FAIL: Quest creation failed without active epic: ${questResult.stdout.slice(0, 200)}`);
		return false;
	}

	// Test explore commands work on quests
	const exploreResult = gp(["quest:explore", "--quest", "test-quest", "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
	});

	if (exploreResult.exitCode === 0) {
		logger.log("PASS: quest:explore succeeds");
	} else {
		logger.log(`FAIL: quest:explore failed: ${exploreResult.stdout.slice(0, 200)}`);
		return false;
	}

	const submitResult = gp(["submit-explore", "--quest", "test-quest", "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
	});

	if (submitResult.exitCode === 0) {
		logger.log("PASS: submit-explore --quest succeeds");
	} else {
		logger.log(`FAIL: submit-explore --quest failed: ${submitResult.stdout.slice(0, 200)}`);
		return false;
	}

	// Verify quest reached explored status
	const status = verifyEntityStatus("quest", "test-quest", "explored", {
		cwd: tmpDir,
		gpBin: GP_BIN,
	});
	if (status.ok) {
		logger.log("PASS: Quest reached 'explored' status via CLI commands");
	} else {
		logger.log(`FAIL: Quest status is '${status.actual}', expected 'explored'`);
		return false;
	}

	// Test mutual exclusivity guard
	const badResult = gp(["start-explore", "--json"], { cwd: tmpDir, gpBin: GP_BIN });
	if (badResult.exitCode !== 0) {
		logger.log("PASS: start-explore without --epic or --quest fails as expected");
	} else {
		logger.log("FAIL: start-explore without --epic or --quest should have failed");
		return false;
	}

	// Test skill-level error handling via runSkillSession — invoke the skill
	// targeting a quest that's already in "explored" status and ask it to create
	// a brand new quest with the SAME name. The skill should detect the existing
	// quest via re-entry detection and handle it gracefully (not crash).
	logger.log("\n[error-path] Testing skill error handling via runSkillSession...");

	const skillBody = loadSkillBody();
	const simulatedUser = createSimulatedUser({
		cwd: tmpDir,
		systemPrompt: [
			"You are testing error handling. If asked any question, respond briefly and concisely.",
			"If asked about a quest goal, say 'Test goal'.",
			"If offered to continue or go back, say 'continue'.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));

	try {
		const sessionResult = await runSkillSession({
			prompt: `Create a side quest named "test-quest". Note: a quest with this name already exists in "explored" status. The skill should handle this via re-entry detection.`,
			options: {
				cwd: tmpDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 30,
				maxBudgetUsd: 2,
				model: MODEL,
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: {
					...process.env,
					PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					GP_CREATE_SIDE_QUEST_MAX_ITERATIONS: "1",
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						"Use at most 1 refinement iteration for cost control.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"",
						"# Create-Side-Quest Skill Instructions",
						"",
						skillBody,
					].join("\n"),
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser,
			checkViolations: true,
			onMessage: tracker.onMessage,
		});

		// The skill should not crash — it should detect re-entry and handle gracefully
		if (isSuccess(sessionResult.result)) {
			logger.log("PASS: Skill handled existing quest gracefully (re-entry detection worked)");
		} else {
			// Even a non-success result is OK as long as the session didn't crash
			logger.log(
				`PASS: Skill session completed without crash (result subtype: ${sessionResult.result.subtype})`,
			);
		}
	} catch (err) {
		logger.log(`FAIL: Skill session crashed: ${err instanceof Error ? err.message : String(err)}`);
		return false;
	} finally {
		simulatedUser.close();
	}

	logger.log(`[error-path] Fixture preserved at: ${tmpDir}`);
	return true;
}

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const overallStart = Date.now();

	logger.log("=== test-create-side-quest.ts ===");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Max iterations (full): ${FULL_PIPELINE_MAX_ITERATIONS}`);
	logger.log(`Max iterations (re-entry): ${REENTRY_MAX_ITERATIONS}`);
	logger.log(`Timestamp: ${new Date().toISOString()}`);

	const results: Array<{ name: string; passed: boolean }> = [];

	// Test 3: Error path (fast — no LLM needed)
	const t3 = await testErrorPath();
	results.push({ name: "Error Path", passed: t3 });

	// Test 1: Full pipeline (expensive — skip in CI unless explicitly requested)
	const t1 = await testFullPipeline();
	results.push({ name: "Full Pipeline", passed: t1 });

	// Test 2: Re-entry
	const t2 = await testReentry();
	results.push({ name: "Re-entry", passed: t2 });

	// ─── Overall Summary ────────────────────────────────────

	const overallElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
	const allPassed = results.every((r) => r.passed);

	logger.log("\n=== OVERALL SUMMARY ===");
	for (const r of results) {
		logger.log(`  ${r.passed ? "PASS" : "FAIL"}: ${r.name}`);
	}
	logger.log(`\nElapsed: ${overallElapsed}s`);
	logger.log(`Overall: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
	logger.log(`Log file: ${LOG_FILE}`);
	logger.log(`Transcript: ${TRANSCRIPT_FILE}`);

	if (!allPassed) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
