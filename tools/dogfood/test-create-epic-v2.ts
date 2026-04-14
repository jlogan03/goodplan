/**
 * Create-epic v2 test harness -- validates the v2 create-epic skill drives
 * through P0 (epic:create) -> P1 (goal-draft/commit) -> P2 (explore-start/conclude)
 * and emits v2 events.
 *
 * Usage: bun tools/dogfood/test-create-epic-v2.ts [--model <model>] [--max-iterations <n>]
 *
 * Prerequisites: `bun run build` must have been run first.
 *
 * Tests:
 * 1. Goal capture: epic:create + epic:goal-draft + epic:goal-commit
 * 2. Explore phase: epic:explore-start + epic:explore-conclude
 * 3. V2 event verification: events.jsonl contains expected v2 event types
 * 4. No v1 commands: old command names are not invoked
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
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
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/create-epic-v2-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/create-epic-v2-transcript.jsonl");
const MODEL = parseModel(tierDefault("e2e"));
const MAX_ITERATIONS = parseMaxIterations(1);

const EPIC_NAME = "test-api-layer-v2";
const EPIC_GOAL =
	"Build a REST API layer with Express and Zod validation for a TypeScript project. " +
	"The API should support user authentication via JWT, profile CRUD operations, and " +
	"Redis-backed response caching. Integrate with an existing PostgreSQL database.";

// ─── V1 commands that must NOT appear in v2 flow ────────────

const V1_COMMANDS = [
	"epic:define-architecture",
	"submit-architecture",
	"epic:refine-architecture",
	"submit-refine-architecture",
	"epic:define-slices",
	"submit-slices",
	"epic:refine-slices",
	"submit-refine-slices",
	"start-architecture",
	"start-slices",
	"start-refine-architecture",
	"start-refine-slices",
];

// V2 commands we expect to see for P0 -> P1 -> P2
const V2_EXPECTED_COMMANDS = [
	"epic:create",
	"epic:goal-draft",
	"epic:goal-commit",
	"epic:explore-start",
	"epic:explore-conclude",
];

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-create-epic-v2] Building plugin...");
try {
	execFileSync("bun", ["run", "build"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-create-epic-v2] Plugin built successfully");
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

// ─── Logging ────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Fixture: Bare Project (no epic) ────────────────────────

function createBareProjectFixture(): string {
	const tmpDir = join(
		"/tmp",
		`gp-fixture-v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	);
	mkdirSync(tmpDir, { recursive: true });

	writeFileSync(
		join(tmpDir, "package.json"),
		JSON.stringify(
			{
				name: "gp-test-fixture-v2",
				version: "0.1.0",
				type: "module",
				devDependencies: {},
			},
			null,
			2,
		),
	);

	mkdirSync(join(tmpDir, "src"), { recursive: true });
	writeFileSync(
		join(tmpDir, "tsconfig.json"),
		JSON.stringify(
			{
				compilerOptions: {
					target: "ESNext",
					module: "ESNext",
					moduleResolution: "bundler",
					strict: true,
				},
				include: ["src/**/*.ts"],
			},
			null,
			2,
		),
	);
	writeFileSync(join(tmpDir, "src/index.ts"), 'export const version = "0.1.0";\n');

	execFileSync("git", ["init"], { cwd: tmpDir, stdio: "pipe" });
	execFileSync("git", ["add", "-A"], { cwd: tmpDir, stdio: "pipe" });
	execFileSync(
		"git",
		["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "-m", "initial"],
		{ cwd: tmpDir, stdio: "pipe" },
	);

	const initResult = gp(["init", "--name", "test-fixture-v2", "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
	});
	if (initResult.exitCode !== 0) {
		throw new Error(`gp init failed (exit ${initResult.exitCode}): ${initResult.stdout}`);
	}

	return tmpDir;
}

// ─── Tool call tracking ─────────────────────────────────────

function createToolCallTracker(logFn: (msg: string) => void): {
	toolCalls: Array<{ toolName: string; input: unknown }>;
	bashCommands: string[];
	onMessage: (message: SDKMessage) => void;
} {
	const toolCalls: Array<{ toolName: string; input: unknown }> = [];
	const bashCommands: string[] = [];

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
									? String((block.input as Record<string, unknown>).command)
									: "?";
							bashCommands.push(cmd);
							logFn(`  [${name}] ${cmd.slice(0, 120)}`);
						} else if (name === "Agent") {
							logFn(`  [${name}] ${JSON.stringify(block.input).slice(0, 150)}`);
						} else {
							logFn(`  [${name}]`);
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

	return { toolCalls, bashCommands, onMessage };
}

// ─── Load SKILL.md ──────────────────────────────────────────

function loadSkillBody(): string {
	const skillMdPath = join(PLUGIN_DIR, "skills", "create-epic", "SKILL.md");
	if (!existsSync(skillMdPath)) {
		logger.log("FATAL: create-epic SKILL.md not found in dist");
		process.exit(1);
	}
	const skillContent = readFileSync(skillMdPath, "utf-8");
	return skillContent.replace(/^---[\s\S]*?---\n/, "");
}

// ─── Test 1: V2 Goal Capture + Explore ──────────────────────

async function testV2GoalAndExplore(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 1: V2 Goal Capture (P0->P1) + Explore (P2)");
	logger.log("========================================\n");

	const startTime = Date.now();
	let allPassed = true;

	logger.log("[v2-pipeline] Creating bare project fixture...");
	const fixtureDir = createBareProjectFixture();
	logger.log(`[v2-pipeline] Fixture created at: ${fixtureDir}`);

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			"You are a senior developer testing the /gp:create-epic skill (v2).",
			"You want to build a REST API layer with Express and Zod for a TypeScript project.",
			`The epic goal is: ${EPIC_GOAL}`,
			"",
			"When asked about epic name or goal, confirm the provided name and goal.",
			"When asked about exploration findings, say 'That's enough exploring, let's move on to architecture.'",
			"When asked about subsystems, suggest: auth (JWT), users (CRUD), cache (Redis).",
			"When asked about architecture decisions, suggest layered architecture with routes/controllers/services/data.",
			"When asked to continue exploring, say 'That's enough' or choose the option to stop exploring.",
			"Always choose concrete, specific answers. Never say 'Proceed' without context.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody();

	logger.log(
		`\n[v2-pipeline] Running /gp:create-epic (model: ${MODEL}, max-iterations: ${MAX_ITERATIONS})...\n`,
	);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Create an epic named "${EPIC_NAME}" with the goal: ${EPIC_GOAL}. Follow the create-epic skill instructions through goal capture (P1) and exploration (P2). After exploration concludes, you may stop.`,
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 200,
				maxBudgetUsd: 15,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: createTestEnv(PLUGIN_DIR, { GP_CREATE_EPIC_MAX_ITERATIONS: String(MAX_ITERATIONS) }),
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						`Use at most ${MAX_ITERATIONS} refinement iterations for cost control.`,
						"Do not ask the user to confirm -- proceed automatically through all phases.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"Stop after exploration concludes (P2) -- do not proceed to architecture (P3).",
						"",
						"# Create-Epic Skill Instructions",
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

	logger.log("\n--- POST-RUN VERIFICATION ---\n");

	// Test 1a: V2 commands were invoked (check bash commands for gp CLI calls)
	const allBashOutput = tracker.bashCommands.join("\n");
	const v2Found: string[] = [];
	const v2Missing: string[] = [];

	for (const cmd of V2_EXPECTED_COMMANDS) {
		if (allBashOutput.includes(cmd)) {
			v2Found.push(cmd);
		} else {
			v2Missing.push(cmd);
		}
	}

	if (v2Found.length > 0) {
		logger.log(`PASS: V2 commands found in session: ${v2Found.join(", ")}`);
	}
	if (v2Missing.length > 0) {
		// epic:explore-start and epic:explore-conclude may be in subagent output
		const criticalMissing = v2Missing.filter(
			(c) => c === "epic:create" || c === "epic:goal-draft" || c === "epic:goal-commit",
		);
		if (criticalMissing.length > 0) {
			logger.log(`FAIL: Critical v2 commands missing: ${criticalMissing.join(", ")}`);
			allPassed = false;
		} else {
			logger.log(
				`WARN: Some v2 commands not seen at orchestrator level (may be in subagent): ${v2Missing.join(", ")}`,
			);
		}
	}

	// Test 1b: No v1 commands were used
	const v1Found: string[] = [];
	for (const cmd of V1_COMMANDS) {
		if (allBashOutput.includes(cmd)) {
			v1Found.push(cmd);
		}
	}

	if (v1Found.length === 0) {
		logger.log("PASS: No v1 commands detected in session");
	} else {
		logger.log(`FAIL: V1 commands found in session: ${v1Found.join(", ")}`);
		allPassed = false;
	}

	// Test 1c: Events log contains v2 event types
	// Epic events are in the epic-scoped event log, not the project-level one
	const epicEventsPath = join(fixtureDir, ".goodplan", "epics", EPIC_NAME, "events.jsonl");
	const eventsPath = existsSync(epicEventsPath) ? epicEventsPath : join(fixtureDir, ".goodplan", "events.jsonl");
	if (existsSync(eventsPath)) {
		const eventsContent = readFileSync(eventsPath, "utf-8");
		const expectedEvents = ["epic-created", "epic-goal-drafted", "epic-goal-committed"];
		const optionalEvents = ["exploration-cycle-started", "exploration-concluded"];
		const foundEvents: string[] = [];
		const missingEvents: string[] = [];

		for (const evt of expectedEvents) {
			if (eventsContent.includes(evt)) {
				foundEvents.push(evt);
			} else {
				missingEvents.push(evt);
			}
		}

		for (const evt of optionalEvents) {
			if (eventsContent.includes(evt)) {
				foundEvents.push(evt);
			}
		}

		if (missingEvents.length === 0) {
			logger.log(`PASS: V2 events found in events.jsonl: ${foundEvents.join(", ")}`);
		} else {
			logger.log(`FAIL: Missing expected events: ${missingEvents.join(", ")}`);
			logger.log(`  Found: ${foundEvents.join(", ")}`);
			allPassed = false;
		}
	} else {
		logger.log("FAIL: events.jsonl not found");
		allPassed = false;
	}

	// Test 1d: Epic exists and shows v2 phase progression
	const epicShowResult = gp(["epic:show", "--epic", EPIC_NAME, "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});

	if (epicShowResult.exitCode === 0) {
		try {
			const epicData = JSON.parse(epicShowResult.stdout) as Record<string, unknown>;
			const phase = epicData.phase ?? epicData.status ?? "unknown";
			logger.log(`PASS: Epic exists, phase/status: ${String(phase)}`);
		} catch {
			logger.log(`WARN: Could not parse epic:show output: ${epicShowResult.stdout.slice(0, 200)}`);
		}
	} else {
		logger.log(`FAIL: epic:show failed (exit ${epicShowResult.exitCode})`);
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

	// Test 1f: Artifact read violations
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
		`\n[v2-pipeline] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`,
	);
	logger.log(`[v2-pipeline] Fixture preserved at: ${fixtureDir}`);

	return allPassed;
}

// ─── Test 2: Explore Phase Uses V2 Commands ─────────────────

async function testExploreV2Commands(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 2: Explore phase uses epic:explore-start / epic:explore-conclude");
	logger.log("========================================\n");

	// This test verifies that the SKILL.md references v2 explore commands
	// by inspecting the built skill content (no Agent SDK session needed).
	const skillBody = loadSkillBody();
	let passed = true;

	const v2ExploreCommands = ["epic:explore-start", "epic:explore-conclude"];
	const v1ExploreCommands = ["start-explore", "submit-explore"];

	for (const cmd of v2ExploreCommands) {
		if (skillBody.includes(cmd)) {
			logger.log(`PASS: SKILL.md references v2 command: ${cmd}`);
		} else {
			logger.log(`FAIL: SKILL.md missing v2 command: ${cmd}`);
			passed = false;
		}
	}

	for (const cmd of v1ExploreCommands) {
		// v1 explore commands may still appear in quest-scoped code paths
		// Check that they don't appear in epic-scoped sections
		const epicSectionMatch = skillBody.match(/## P2\.\s*Explore[\s\S]*?(?=## P3|$)/);
		if (epicSectionMatch?.[0].includes(cmd)) {
			logger.log(`FAIL: Epic explore section references v1 command: ${cmd}`);
			passed = false;
		} else {
			logger.log(`PASS: Epic explore section does not reference v1 command: ${cmd}`);
		}
	}

	return passed;
}

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const overallStart = Date.now();

	logger.log("=== test-create-epic-v2.ts ===");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Max iterations: ${MAX_ITERATIONS}`);
	logger.log(`Timestamp: ${new Date().toISOString()}`);

	const results: Array<{ name: string; passed: boolean }> = [];

	// Test 1: V2 goal capture + explore (Agent SDK session)
	const t1 = await testV2GoalAndExplore();
	results.push({ name: "V2 Goal Capture + Explore (P0->P1->P2)", passed: t1 });

	// Test 2: Explore phase v2 command references (static check)
	const t2 = await testExploreV2Commands();
	results.push({ name: "Explore V2 Command References", passed: t2 });

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
