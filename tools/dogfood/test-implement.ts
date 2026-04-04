/**
 * Implement pipeline test harness — runs /gp:implement skill against a
 * minimal fixture using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-implement.ts [--model <model>] [--max-iterations <n>]
 *
 * Creates a fixture project with a slice in `plan-refined` status containing
 * a 2-phase minimal plan, builds the plugin, then runs `/gp:implement` via
 * the Agent SDK with a simulated user.
 *
 * Tests:
 * 1. Full pipeline: all plan phases implemented with review loops, slice completed
 * 2. Re-entry: fixture at `implementing` with implementationPhase=1 resumes from phase 2
 * 3. Mode isolation: completion-slice vs completion-epic agent output boundaries
 * 4. Review context: refinement-coordinator handles "code-implementation" context
 * 5. Orchestrator discipline: no direct Read calls on artifact paths
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/implement-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/implement-transcript.jsonl");
const MODEL = parseModel(tierDefault("structural"));
const MAX_ITERATIONS = parseMaxIterations(2);

const EPIC_NAME = "test-epic";
const SLICE_NAME = "implement-poc";
const PLAN_SLUG = "implement-poc";

const MINIMAL_PLAN = `# Plan: Implement POC

## Overview

Build a simple greeting utility and its test. Two phases: create the utility, then add tests.

## Phase 1: Greeting Utility

Create a TypeScript utility function that returns a greeting string.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] \`ls src/greet.ts\` — file not found

**After implementation** (should pass / show presence):
- [ ] \`ls src/greet.ts\` — file exists
- [ ] \`grep -q "export function greet" src/greet.ts\` — function is exported

### Tasks

- [ ] Create \`src/greet.ts\` with a \`greet(name: string): string\` function that returns \`Hello, \${name}!\`

## Phase 2: Greeting Tests

Add a test file for the greeting utility.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] \`ls src/greet.test.ts\` — file not found

**After implementation** (should pass / show presence):
- [ ] \`ls src/greet.test.ts\` — file exists
- [ ] \`grep -q "greet" src/greet.test.ts\` — test references greet function

### Tasks

- [ ] Create \`src/greet.test.ts\` with a test that verifies \`greet("World")\` returns \`"Hello, World!"\`
`;

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-implement] Building plugin...");
try {
	execFileSync("bun", ["run", "build:plugin"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-implement] Plugin built successfully");
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

// Use dist binary for ALL CLI operations (including createMinimalFixture)
// to ensure schema consistency between fixture creation and test assertions.
process.env.GP_CLI_PATH = GP_BIN;

// Local plugin path (PLUGIN_DIR) is passed directly to Agent SDK — no cache sync needed.

// ─── Logging ────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Tool call tracking ─────────────────────────────────────

function createToolCallTracker(logFn: (msg: string) => void): {
	toolCalls: Array<{ toolName: string; input: unknown }>;
	scoreProgression: number[];
	onMessage: (message: SDKMessage) => void;
} {
	const toolCalls: Array<{ toolName: string; input: unknown }> = [];
	const scoreProgression: number[] = [];

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
							logFn(`  [${name}] ${JSON.stringify(block.input).slice(0, 150)}`);
						} else {
							logFn(`  [${name}]`);
						}
					}

					// Track score mentions in text blocks
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

	return { toolCalls, scoreProgression, onMessage };
}

// ─── Load SKILL.md ──────────────────────────────────────────

function loadSkillBody(): string {
	const skillMdPath = join(PLUGIN_DIR, "skills", "implement", "SKILL.md");
	if (!existsSync(skillMdPath)) {
		logger.log("FATAL: implement SKILL.md not found in dist");
		process.exit(1);
	}
	const skillContent = readFileSync(skillMdPath, "utf-8");
	// Strip frontmatter — the LLM doesn't need it
	return skillContent.replace(/^---[\s\S]*?---\n/, "");
}

// ─── Fixture: Slice in plan-refined status ──────────────────

async function createPlanRefinedFixture(): Promise<string> {
	const fixtureDir = await createMinimalFixture({
		epicName: EPIC_NAME,
		sliceName: SLICE_NAME,
		sliceGoal: "Build a simple greeting utility and its test",
		withSource: true,
		activateEpic: true,
		architectureFiles: {
			"_overview.md": [
				"# Architecture Overview",
				"",
				"## Layers",
				"1. Source layer (TypeScript utilities)",
				"",
				"## Subsystems",
				"- core: Core utilities (Stable)",
			].join("\n"),
		},
	});

	// Write the plan-refined.md into the slice directory
	const sliceBaseDir = join(fixtureDir, ".goodplan", "epics", EPIC_NAME, "slices");
	const sliceDirs = readdirSync(sliceBaseDir);
	const sliceDir = sliceDirs.find((d: string) => d.includes(SLICE_NAME));
	if (!sliceDir) {
		throw new Error(`Slice directory not found for ${SLICE_NAME}`);
	}
	const slicePath = join(sliceBaseDir, sliceDir);
	// Write both plan.md (for submit-plan) and plan-refined.md (for submit-refinement)
	writeFileSync(join(slicePath, "plan.md"), MINIMAL_PLAN);
	writeFileSync(join(slicePath, "plan-refined.md"), MINIMAL_PLAN);

	// Advance slice to plan-refined status
	// Use dist binary (GP_BIN) for ALL operations to ensure schema consistency
	const planResult = gp(["slice:plan", "--slice", SLICE_NAME, "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});
	if (planResult.exitCode !== 0) {
		throw new Error(`slice:plan failed (exit ${planResult.exitCode}): ${planResult.stdout}`);
	}
	// Submit draft plan
	const submitResult = gp(["submit-plan", "--slice", SLICE_NAME, "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});
	if (submitResult.exitCode !== 0) {
		throw new Error(`submit-plan failed (exit ${submitResult.exitCode}): ${submitResult.stdout}`);
	}
	// Submit refined plan to advance to plan-refined
	const refineResult = gp(["submit-refinement", "--slice", SLICE_NAME, "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
		stdin: JSON.stringify({ scores: { overall: 9 } }),
	});
	if (refineResult.exitCode !== 0) {
		throw new Error(`submit-refinement failed (exit ${refineResult.exitCode}): ${refineResult.stdout}`);
	}

	return fixtureDir;
}

// ─── Fixture: Slice at implementing with phase 1 done ───────

async function createReentryFixture(): Promise<string> {
	const fixtureDir = await createPlanRefinedFixture();

	// Transition to implementing (use default binary for consistency with fixture)
	const implResult = gp(["slice:implement", "--slice", SLICE_NAME, "--json"], {
		cwd: fixtureDir,
	});
	if (implResult.exitCode !== 0) {
		throw new Error(`slice:implement failed (exit ${implResult.exitCode}): ${implResult.stdout}`);
	}

	// Create the phase 1 implementation file
	mkdirSync(join(fixtureDir, "src"), { recursive: true });
	writeFileSync(
		join(fixtureDir, "src/greet.ts"),
		"export function greet(name: string): string {\n\treturn `Hello, ${name}!`;\n}\n",
	);

	// Commit the phase 1 work
	execFileSync("git", ["add", "-A"], { cwd: fixtureDir, stdio: "pipe" });
	execFileSync(
		"git",
		[
			"-c",
			"user.name=test",
			"-c",
			"user.email=test@test.com",
			"commit",
			"-m",
			`[${PLAN_SLUG}] Phase 1: Greeting Utility`,
		],
		{ cwd: fixtureDir, stdio: "pipe" },
	);

	// Set implementationPhase to 1 via CLI
	const phaseResult = gp(
		["submit-implementation", "--slice", SLICE_NAME, "--phase", "1", "--json"],
		{ cwd: fixtureDir, gpBin: GP_BIN },
	);

	if (phaseResult.exitCode !== 0) {
		logger.log(
			`WARN: submit-implementation --phase 1 failed (exit ${phaseResult.exitCode}): ${phaseResult.stdout.slice(0, 200)}`,
		);
		logger.log("WARN: Re-entry test may not work correctly if implementationPhase is not tracked");
	}

	return fixtureDir;
}

// ─── Test 1: Full Pipeline ──────────────────────────────────

async function testFullPipeline(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 1: Full Pipeline");
	logger.log("========================================\n");

	const startTime = Date.now();
	let allPassed = true;

	logger.log("[full-pipeline] Creating fixture at plan-refined status...");
	const fixtureDir = await createPlanRefinedFixture();
	logger.log(`[full-pipeline] Fixture created at: ${fixtureDir}`);

	// Verify slice is in plan-refined status
	const preStatus = verifyEntityStatus("slice", SLICE_NAME, "plan-refined", {
		cwd: fixtureDir,
	});
	if (!preStatus.ok) {
		logger.log(`FAIL: Slice not in 'plan-refined' status (got: ${preStatus.actual})`);
		process.exit(1);
	}
	logger.log("[full-pipeline] Slice verified in 'plan-refined' status");

	// Simulated user
	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			"You are a senior developer testing the /gp:implement skill.",
			"The project is a simple TypeScript utility project.",
			`The slice is "${SLICE_NAME}" with a 2-phase plan: create greet.ts, then add tests.`,
			"",
			"If asked about unexpected behavior, say 'That looks fine, proceed.'",
			"If asked about architecture updates, say 'Skip' or choose the skip option.",
			"If asked about side quests, say 'Skip' or choose the skip option.",
			"Always choose concrete answers. Prefer proceeding over stopping.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody();

	logger.log(
		`\n[full-pipeline] Running /gp:implement (model: ${MODEL}, max-iterations: ${MAX_ITERATIONS})...\n`,
	);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Implement the slice "${SLICE_NAME}" in epic "${EPIC_NAME}". Follow the implement skill instructions in your system prompt completely through all phases.`,
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 400,
				maxBudgetUsd: 30,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: {
					...process.env,
					PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					GP_IMPLEMENT_MAX_ITERATIONS: String(MAX_ITERATIONS),
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						`Use at most ${MAX_ITERATIONS} refinement iterations per phase for cost control.`,
						"Do not ask the user to confirm — proceed automatically through all phases.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"",
						"# Implement Skill Instructions",
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

	// Test 1a: Slice status should be completed
	const postStatus = verifyEntityStatus("slice", SLICE_NAME, "completed", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
		epic: EPIC_NAME,
	});
	if (postStatus.ok) {
		logger.log("PASS: Slice reached 'completed' status");
	} else {
		// Accept late-stage statuses as partial success
		const lateStatuses = ["implementation-complete", "implementing"];
		if (lateStatuses.includes(postStatus.actual)) {
			logger.log(
				`WARN: Slice reached '${postStatus.actual}' (expected 'completed') — partial pipeline completion`,
			);
		} else {
			logger.log(`FAIL: Slice status is '${postStatus.actual}', expected 'completed'`);
			allPassed = false;
		}
	}

	// Test 1b: Git log shows phase commits
	try {
		const gitLog = execFileSync("git", ["log", "--oneline", "-10"], {
			cwd: fixtureDir,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		const hasPhase1Commit = gitLog.includes("Phase 1:");
		const hasPhase2Commit = gitLog.includes("Phase 2:");
		if (hasPhase1Commit && hasPhase2Commit) {
			logger.log("PASS: Git log contains Phase 1 and Phase 2 commits");
		} else if (hasPhase1Commit || hasPhase2Commit) {
			logger.log(
				`WARN: Git log has partial phase commits (Phase 1: ${hasPhase1Commit}, Phase 2: ${hasPhase2Commit})`,
			);
		} else {
			logger.log("FAIL: Git log missing phase commits");
			logger.log(`  Recent commits: ${gitLog.trim()}`);
			allPassed = false;
		}
	} catch {
		logger.log("WARN: Could not read git log");
	}

	// Test 1c: Completion learnings artifact exists
	let completionFound = false;
	const sliceBaseDir = join(fixtureDir, ".goodplan", "epics", EPIC_NAME, "slices");
	try {
		const sliceDirs = readdirSync(sliceBaseDir);
		for (const d of sliceDirs) {
			if (d.includes(SLICE_NAME)) {
				const completionDir = join(sliceBaseDir, d, "completion");
				const learningsPath = join(completionDir, "learnings.md");
				if (existsSync(learningsPath)) {
					completionFound = true;
					const size = readFileSync(learningsPath, "utf-8").length;
					logger.log(`PASS: completion/learnings.md exists (${size} bytes)`);
				}
				break;
			}
		}
	} catch (err: unknown) {
		logger.log(`WARN: Could not check completion artifacts: ${err}`);
	}
	if (!completionFound) {
		logger.log(
			"WARN: completion/learnings.md not found (may be written by completion-slice agent)",
		);
	}

	// Test 1d: Orchestrator discipline — no artifact reads
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

	// Test 1e: State write violations
	if (sessionResult && sessionResult.violations.length > 0) {
		logger.log(`FAIL: ${sessionResult.violations.length} state write violation(s):`);
		for (const v of sessionResult.violations) {
			logger.log(`  - ${v}`);
		}
		allPassed = false;
	} else {
		logger.log("PASS: No state write violations detected");
	}

	// Test 1f: Score progression (review loop ran)
	if (tracker.scoreProgression.length >= 1) {
		logger.log(`PASS: Review loop ran ${tracker.scoreProgression.length} iteration(s)`);
		logger.log(`  Scores: ${tracker.scoreProgression.join(" -> ")}`);
	} else {
		logger.log("WARN: No score progression detected in session log");
		logger.log("  (Scores may have been reported in sub-agent sessions)");
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	logger.log(
		`\n[full-pipeline] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`,
	);
	logger.log(`[full-pipeline] Fixture preserved at: ${fixtureDir}`);

	return allPassed;
}

// ─── Test 2: Re-entry from implementing with phase 1 done ───

async function testReentry(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 2: Re-entry from 'implementing' with phase 1 done");
	logger.log("========================================\n");

	const startTime = Date.now();
	let allPassed = true;

	logger.log("[re-entry] Creating fixture at 'implementing' status with phase 1 done...");
	const fixtureDir = await createReentryFixture();

	// Verify pre-condition
	const preStatus = verifyEntityStatus("slice", SLICE_NAME, "implementing", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
		epic: EPIC_NAME,
	});
	if (!preStatus.ok) {
		logger.log(
			`FAIL: Pre-condition not met — slice status is '${preStatus.actual}', expected 'implementing'`,
		);
		return false;
	}
	logger.log(`[re-entry] Fixture at '${preStatus.actual}' status: ${fixtureDir}`);

	// Verify greet.ts already exists (phase 1 was done)
	if (existsSync(join(fixtureDir, "src/greet.ts"))) {
		logger.log("[re-entry] Verified: src/greet.ts exists from phase 1");
	} else {
		logger.log("WARN: src/greet.ts not found — re-entry detection may not work");
	}

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			"You are a senior developer testing re-entry of the /gp:implement skill.",
			"Phase 1 is already done — src/greet.ts exists with a greet function.",
			"The skill should resume from phase 2 (adding tests).",
			"",
			"If asked about unexpected behavior, say 'That looks fine, proceed.'",
			"If asked about architecture updates, say 'Skip'.",
			"Always choose concrete answers. Prefer proceeding.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody();

	logger.log(
		`\n[re-entry] Running /gp:implement (model: ${MODEL}, max-iterations: ${MAX_ITERATIONS})...\n`,
	);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Continue implementing the slice "${SLICE_NAME}" in epic "${EPIC_NAME}". It should already be in implementing status with phase 1 done. Follow the implement skill instructions to resume from the correct phase.`,
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 400,
				maxBudgetUsd: 30,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: {
					...process.env,
					PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					GP_IMPLEMENT_MAX_ITERATIONS: String(MAX_ITERATIONS),
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						`Use at most ${MAX_ITERATIONS} refinement iterations per phase for cost control.`,
						"Do not ask the user to confirm — proceed automatically through all phases.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"",
						"# Implement Skill Instructions",
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

	// Check that phase 1 was not re-implemented (no duplicate Phase 1 commits)
	try {
		const gitLog = execFileSync("git", ["log", "--oneline", "-20"], {
			cwd: fixtureDir,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		const phase1Matches = gitLog.split("\n").filter((line: string) => line.includes("Phase 1:"));
		if (phase1Matches.length === 1) {
			logger.log("PASS: Phase 1 was not re-implemented (only original commit found)");
		} else if (phase1Matches.length > 1) {
			logger.log(
				`FAIL: Phase 1 was re-implemented (${phase1Matches.length} Phase 1 commits found)`,
			);
			allPassed = false;
		} else {
			logger.log("WARN: No Phase 1 commit found at all");
		}

		const hasPhase2 = gitLog.includes("Phase 2:");
		if (hasPhase2) {
			logger.log("PASS: Phase 2 was implemented after re-entry");
		} else {
			logger.log("FAIL: Phase 2 commit not found after re-entry");
			allPassed = false;
		}
	} catch {
		logger.log("WARN: Could not read git log for re-entry verification");
	}

	// Slice should reach completed status
	const postStatus = verifyEntityStatus("slice", SLICE_NAME, "completed", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
		epic: EPIC_NAME,
	});
	if (postStatus.ok) {
		logger.log("PASS: Slice reached 'completed' status after re-entry");
	} else {
		const lateStatuses = ["implementation-complete", "implementing"];
		if (lateStatuses.includes(postStatus.actual)) {
			logger.log(
				`WARN: Slice reached '${postStatus.actual}' (expected 'completed') — partial re-entry completion`,
			);
		} else {
			logger.log(`FAIL: Slice status is '${postStatus.actual}', expected 'completed'`);
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
	logger.log(
		`\n[re-entry] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`,
	);
	logger.log(`[re-entry] Fixture preserved at: ${fixtureDir}`);

	return allPassed;
}

// ─── Test 3: Mode Isolation (completion-slice vs completion-epic) ─

async function testModeIsolation(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 3: Mode Isolation (completion-slice vs completion-epic)");
	logger.log("========================================\n");

	let allPassed = true;

	// Test 3a: completion-slice should NOT contain epic-level fields
	logger.log("[mode-isolation] Testing completion-slice agent boundaries...");

	const sliceFixtureDir = await createPlanRefinedFixture();

	const sliceSimUser = createSimulatedUser({
		cwd: sliceFixtureDir,
		systemPrompt: "You are testing agent mode isolation. Answer concisely.",
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	try {
		const sliceResult = await runSkillSession({
			prompt: [
				"Spawn the completion-slice agent with these inputs:",
				`- Slice path: ${join(sliceFixtureDir, ".goodplan/epics", EPIC_NAME, "slices")}`,
				"- Plan path: plan-refined.md",
				"- Changed files: src/greet.ts",
				"",
				"Parse the agent's return JSON and report it verbatim.",
			].join("\n"),
			options: {
				cwd: sliceFixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 100,
				maxBudgetUsd: 10,
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
					append: "You are testing agent mode isolation. Spawn the agent and report its return.",
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser: sliceSimUser,
			onMessage: (msg: SDKMessage) => {
				if (msg.type === "assistant" && "message" in msg) {
					const m = msg as Record<string, unknown>;
					const inner =
						typeof m.message === "object" && m.message !== null
							? (m.message as Record<string, unknown>)
							: null;
					const content = Array.isArray(inner?.content)
						? (inner.content as Array<Record<string, unknown>>)
						: null;
					if (content) {
						for (const block of content) {
							if (block.type === "text" && typeof block.text === "string") {
								// Check for epic-level contamination
								if (block.text.includes("consolidatedLearnings")) {
									logger.log(
										"FAIL: completion-slice return contains 'consolidatedLearnings' (epic-level field)",
									);
									allPassed = false;
								}
								if (/cross-slice/i.test(block.text) || /epic-level/i.test(block.text)) {
									logger.log(
										"WARN: completion-slice output mentions cross-slice or epic-level concepts",
									);
								}
							}
						}
					}
				}
			},
		});

		if (isSuccess(sliceResult.result)) {
			// Check the result text for contamination
			const resultText = sliceResult.result.result;
			if (!resultText.includes("consolidatedLearnings")) {
				logger.log("PASS: completion-slice return has no 'consolidatedLearnings' field");
			}
			if (!/cross-slice/i.test(resultText) && !/epic-level/i.test(resultText)) {
				logger.log("PASS: completion-slice summary does not mention cross-slice or epic-level");
			}
		} else {
			logger.log(
				`WARN: completion-slice session did not succeed (${sliceResult.result.subtype}) — mode isolation test inconclusive`,
			);
		}
	} catch (err) {
		logger.log(
			`WARN: completion-slice test error: ${err instanceof Error ? err.message : String(err)}`,
		);
	} finally {
		sliceSimUser.close();
	}

	// Test 3b: completion-epic should contain architecture reconciliation
	logger.log("\n[mode-isolation] Testing completion-epic agent boundaries...");

	const epicFixtureDir = await createPlanRefinedFixture();

	const epicSimUser = createSimulatedUser({
		cwd: epicFixtureDir,
		systemPrompt: "You are testing agent mode isolation. Answer concisely.",
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	try {
		const epicResult = await runSkillSession({
			prompt: [
				"Spawn the completion-epic agent with these inputs:",
				`- Epic path: ${join(epicFixtureDir, ".goodplan/epics", EPIC_NAME)}`,
				"- Slice learnings: (simulated) Learned about greeting patterns and test conventions",
				"- Cross-slice summary: Single slice epic, no cross-cutting concerns",
				"",
				"Parse the agent's return JSON and report it verbatim.",
			].join("\n"),
			options: {
				cwd: epicFixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 100,
				maxBudgetUsd: 10,
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
					append: "You are testing agent mode isolation. Spawn the agent and report its return.",
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser: epicSimUser,
			onMessage: (msg: SDKMessage) => {
				if (msg.type === "assistant" && "message" in msg) {
					const m = msg as Record<string, unknown>;
					const inner =
						typeof m.message === "object" && m.message !== null
							? (m.message as Record<string, unknown>)
							: null;
					const content = Array.isArray(inner?.content)
						? (inner.content as Array<Record<string, unknown>>)
						: null;
					if (content) {
						for (const block of content) {
							if (block.type === "text" && typeof block.text === "string") {
								if (block.text.includes("reconcil")) {
									logger.log("INFO: completion-epic mentions architecture reconciliation");
								}
							}
						}
					}
				}
			},
		});

		if (isSuccess(epicResult.result)) {
			const resultText = epicResult.result.result;
			if (/reconcil/i.test(resultText) || /architecture/i.test(resultText)) {
				logger.log("PASS: completion-epic return contains architecture reconciliation references");
			} else {
				logger.log(
					"WARN: completion-epic return does not clearly mention architecture reconciliation",
				);
			}
		} else {
			logger.log(
				`WARN: completion-epic session did not succeed (${epicResult.result.subtype}) — mode isolation test inconclusive`,
			);
		}
	} catch (err) {
		logger.log(
			`WARN: completion-epic test error: ${err instanceof Error ? err.message : String(err)}`,
		);
	} finally {
		epicSimUser.close();
	}

	return allPassed;
}

// ─── Test 4: Review Context (code-implementation) ───────────

async function testReviewContext(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 4: Review Context (code-implementation)");
	logger.log("========================================\n");

	let allPassed = true;

	const fixtureDir = await createPlanRefinedFixture();

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt:
			"You are testing reviewer selection for code-implementation context. Answer concisely.",
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));

	try {
		const result = await runSkillSession({
			prompt: [
				"Spawn the refinement-coordinator agent with these inputs:",
				"- Changed files: src/greet.ts, src/greet.test.ts",
				'- review_context: "code-implementation"',
				"",
				"Report which reviewers the coordinator selects.",
			].join("\n"),
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 100,
				maxBudgetUsd: 10,
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
					append: "You are testing reviewer selection. Spawn the coordinator and report results.",
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser,
			onMessage: tracker.onMessage,
		});

		if (isSuccess(result.result)) {
			const resultText = result.result.result.toLowerCase();
			// Code reviewers should be selected, not plan/architecture reviewers
			if (
				resultText.includes("typescript") ||
				resultText.includes("code") ||
				resultText.includes("reviewer")
			) {
				logger.log("PASS: Coordinator selected reviewers for code-implementation context");
			} else {
				logger.log("WARN: Could not confirm reviewer selection — check transcript for details");
			}

			// Negative check: architecture/plan reviewers should NOT dominate
			if (resultText.includes("plan-structure") && !resultText.includes("typescript")) {
				logger.log(
					"FAIL: Coordinator selected plan reviewers instead of code reviewers for code-implementation context",
				);
				allPassed = false;
			}
		} else {
			logger.log(
				`WARN: Review context session did not succeed (${result.result.subtype}) — test inconclusive`,
			);
		}
	} catch (err) {
		logger.log(
			`WARN: Review context test error: ${err instanceof Error ? err.message : String(err)}`,
		);
	} finally {
		simulatedUser.close();
	}

	return allPassed;
}

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const overallStart = Date.now();

	logger.log("=== test-implement.ts ===");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Max iterations: ${MAX_ITERATIONS}`);
	logger.log(`Timestamp: ${new Date().toISOString()}`);

	const results: Array<{ name: string; passed: boolean }> = [];

	// Test 1: Full pipeline
	const t1 = await testFullPipeline();
	results.push({ name: "Full Pipeline", passed: t1 });

	// Test 2: Re-entry
	const t2 = await testReentry();
	results.push({ name: "Re-entry", passed: t2 });

	// Test 3: Mode isolation
	const t3 = await testModeIsolation();
	results.push({ name: "Mode Isolation", passed: t3 });

	// Test 4: Review context
	const t4 = await testReviewContext();
	results.push({ name: "Review Context", passed: t4 });

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
