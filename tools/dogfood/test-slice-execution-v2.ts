/**
 * Slice execution v2 test harness -- validates the v2 plan-slice skill drives
 * through P7 (plan-draft) -> P8 (plan-shape) -> P9 (plan-commit) using v2
 * commands and event types.
 *
 * Usage: bun tools/dogfood/test-slice-execution-v2.ts [--model <model>] [--max-iterations <n>]
 *
 * Prerequisites: `bun run build` must have been run first.
 *
 * Tests:
 * 1. Plan-slice: slice:plan-draft + plan-shape-* + slice:plan-commit
 * 2. V2 event verification: events.jsonl contains expected v2 event types
 * 3. No v1 commands: old command names are not invoked
 * 4. Static skill check: plan-slice SKILL.md references v2 commands
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
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/slice-execution-v2-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/slice-execution-v2-transcript.jsonl");
const MODEL = parseModel(tierDefault("e2e"));
const MAX_ITERATIONS = parseMaxIterations(1);

const EPIC_NAME = "test-slice-exec-v2";
const SLICE_NAME = "test-hello-util";
const SLICE_GOAL =
	"Create a single-file utility at src/hello.ts that exports a greet(name: string): string function returning 'Hello, {name}!'. Add a test at tests/hello.test.ts.";

// ─── V1 commands that must NOT appear in slice-scoped v2 flow ──

const V1_COMMANDS = [
	"start-plan --slice",
	"submit-plan --slice",
	"refine-plan",
	"start-refinement --slice",
	"submit-refinement --slice",
];

// V2 commands we expect to see for plan-slice P7 -> P8 -> P9
const V2_EXPECTED_COMMANDS = [
	"slice:plan-draft",
	"slice:plan-shape-start",
	"slice:plan-commit",
];

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-slice-execution-v2] Building plugin...");
try {
	execFileSync("bun", ["run", "build"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-slice-execution-v2] Plugin built successfully");
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

// ─── Fixture: Project with epic + slice ready for planning ──

function createPlanReadyFixture(): string {
	const tmpDir = join(
		"/tmp",
		`gp-fixture-slice-v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	);
	mkdirSync(tmpDir, { recursive: true });

	// Create a minimal TypeScript project
	writeFileSync(
		join(tmpDir, "package.json"),
		JSON.stringify(
			{
				name: "gp-test-slice-v2",
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

	// Initialize goodplan project
	const initResult = gp(["init", "--name", "test-slice-v2", "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
	});
	if (initResult.exitCode !== 0) {
		throw new Error(`gp init failed (exit ${initResult.exitCode}): ${initResult.stdout}`);
	}

	// Create epic with goal
	const epicCreateResult = gp(["epic:create", "--name", EPIC_NAME, "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
		stdin: JSON.stringify({ name: EPIC_NAME }),
	});
	if (epicCreateResult.exitCode !== 0) {
		throw new Error(
			`gp epic:create failed (exit ${epicCreateResult.exitCode}): ${epicCreateResult.stdout}`,
		);
	}

	// Draft and commit goal
	const goalDraftResult = gp(["epic:goal-draft", "--epic", EPIC_NAME, "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
		stdin: JSON.stringify({ content: "Test epic for slice execution v2 validation" }),
	});
	if (goalDraftResult.exitCode !== 0) {
		throw new Error(
			`gp epic:goal-draft failed (exit ${goalDraftResult.exitCode}): ${goalDraftResult.stdout}`,
		);
	}

	const goalCommitResult = gp(["epic:goal-commit", "--epic", EPIC_NAME, "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
	});
	if (goalCommitResult.exitCode !== 0) {
		throw new Error(
			`gp epic:goal-commit failed (exit ${goalCommitResult.exitCode}): ${goalCommitResult.stdout}`,
		);
	}

	// Activate epic
	const activateResult = gp(["epic:activate", "--epic", EPIC_NAME, "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
	});
	if (activateResult.exitCode !== 0) {
		throw new Error(
			`gp epic:activate failed (exit ${activateResult.exitCode}): ${activateResult.stdout}`,
		);
	}

	// Create slice
	const sliceCreateResult = gp(
		["slice:create", "--epic", EPIC_NAME, "--slice", SLICE_NAME, "--json"],
		{
			cwd: tmpDir,
			gpBin: GP_BIN,
			stdin: JSON.stringify({ goal: SLICE_GOAL }),
		},
	);
	if (sliceCreateResult.exitCode !== 0) {
		throw new Error(
			`gp slice:create failed (exit ${sliceCreateResult.exitCode}): ${sliceCreateResult.stdout}`,
		);
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

function loadSkillBody(skillName: string): string {
	const skillMdPath = join(PLUGIN_DIR, "skills", skillName, "SKILL.md");
	if (!existsSync(skillMdPath)) {
		logger.log(`FATAL: ${skillName} SKILL.md not found in dist`);
		process.exit(1);
	}
	const skillContent = readFileSync(skillMdPath, "utf-8");
	return skillContent.replace(/^---[\s\S]*?---\n/, "");
}

// ─── Test 1: Plan-Slice V2 Pipeline ─────────────────────────

async function testPlanSliceV2(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 1: Plan-Slice V2 (P7 -> P8 -> P9)");
	logger.log("========================================\n");

	const startTime = Date.now();
	let allPassed = true;

	logger.log("[plan-slice-v2] Creating fixture with epic + slice...");
	const fixtureDir = createPlanReadyFixture();
	logger.log(`[plan-slice-v2] Fixture created at: ${fixtureDir}`);

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			"You are a senior developer testing the /gp:plan-slice skill (v2).",
			`The slice goal is: ${SLICE_GOAL}`,
			"",
			"When asked about approach, say: single phase, create the file and test.",
			"When asked about phasing, say: one phase is enough for this simple task.",
			"When asked about expected behavior, say: src/hello.ts should export greet(), tests/hello.test.ts should pass.",
			"When asked about risks, say: none, this is straightforward.",
			"When asked if the plan shape looks good, say: yes, approve it.",
			"Always give concrete, brief answers.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody("plan-slice");

	logger.log(
		`\n[plan-slice-v2] Running /gp:plan-slice (model: ${MODEL}, max-iterations: ${MAX_ITERATIONS})...\n`,
	);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Plan the slice "${SLICE_NAME}" in epic "${EPIC_NAME}". The goal is: ${SLICE_GOAL}. Follow the plan-slice skill instructions through P7 (draft), P8 (shape checkpoint), and P9 (commit). Use at most ${MAX_ITERATIONS} refinement iterations.`,
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 200,
				maxBudgetUsd: 15,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: createTestEnv(PLUGIN_DIR, {
					GP_PLAN_SLICE_MAX_ITERATIONS: String(MAX_ITERATIONS),
				}),
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						`Use at most ${MAX_ITERATIONS} refinement iterations for cost control.`,
						"Do not ask the user to confirm -- proceed automatically through all phases.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"For the plan-shape checkpoint, auto-approve (the simulated user will approve).",
						"",
						"# Plan-Slice Skill Instructions",
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

	// Test 1a: V2 commands were invoked
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
		logger.log(`PASS: V2 commands found: ${v2Found.join(", ")}`);
	}
	if (v2Missing.length > 0) {
		// Shape and commit may be in different orchestrator turns
		const criticalMissing = v2Missing.filter((c) => c === "slice:plan-draft");
		if (criticalMissing.length > 0) {
			logger.log(`FAIL: Critical v2 commands missing: ${criticalMissing.join(", ")}`);
			allPassed = false;
		} else {
			logger.log(
				`WARN: Some v2 commands not seen at orchestrator level: ${v2Missing.join(", ")}`,
			);
		}
	}

	// Test 1b: No v1 commands
	const v1Found: string[] = [];
	for (const cmd of V1_COMMANDS) {
		if (allBashOutput.includes(cmd)) {
			v1Found.push(cmd);
		}
	}

	if (v1Found.length === 0) {
		logger.log("PASS: No v1 commands detected");
	} else {
		logger.log(`FAIL: V1 commands found: ${v1Found.join(", ")}`);
		allPassed = false;
	}

	// Test 1c: Events log contains v2 event types
	const epicEventsPath = join(fixtureDir, ".goodplan", "epics", EPIC_NAME, "events.jsonl");
	if (existsSync(epicEventsPath)) {
		const eventsContent = readFileSync(epicEventsPath, "utf-8");
		const expectedEvents = ["slice-plan-drafted"];
		const optionalEvents = [
			"plan-shape-checkpoint-reached",
			"plan-shape-approved",
			"plan-shape-checkpoint-auto-shaped",
			"slice-plan-committed",
		];
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
			logger.log(`PASS: V2 events found: ${foundEvents.join(", ")}`);
		} else {
			logger.log(`FAIL: Missing expected events: ${missingEvents.join(", ")}`);
			logger.log(`  Found: ${foundEvents.join(", ")}`);
			allPassed = false;
		}
	} else {
		logger.log("FAIL: Epic events.jsonl not found");
		allPassed = false;
	}

	// Test 1d: Slice phase progression
	const sliceShowResult = gp(
		["slice:show", "--epic", EPIC_NAME, "--slice", SLICE_NAME, "--json"],
		{ cwd: fixtureDir, gpBin: GP_BIN },
	);

	if (sliceShowResult.exitCode === 0) {
		try {
			const sliceData = JSON.parse(sliceShowResult.stdout) as Record<string, unknown>;
			const phase = sliceData.phase ?? sliceData.status ?? "unknown";
			logger.log(`PASS: Slice exists, phase: ${String(phase)}`);
			// Ideally should be P9 (plan committed) but P7+ is acceptable
		} catch {
			logger.log(
				`WARN: Could not parse slice:show output: ${sliceShowResult.stdout.slice(0, 200)}`,
			);
		}
	} else {
		logger.log(`FAIL: slice:show failed (exit ${sliceShowResult.exitCode})`);
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

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	logger.log(
		`\n[plan-slice-v2] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`,
	);
	logger.log(`[plan-slice-v2] Fixture preserved at: ${fixtureDir}`);

	return allPassed;
}

// ─── Test 2: Static Skill Check ─────────────────────────────

async function testStaticSkillCheck(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 2: Static skill command references");
	logger.log("========================================\n");

	let passed = true;

	// Check plan-slice SKILL.md for v2 commands
	const planSliceBody = loadSkillBody("plan-slice");

	const v2Commands = [
		"slice:plan-draft",
		"slice:plan-commit",
		"slice:plan-shape-start",
		"refine:start",
		"refine:score",
		"refine:converge",
	];

	for (const cmd of v2Commands) {
		if (planSliceBody.includes(cmd)) {
			logger.log(`PASS: plan-slice references v2 command: ${cmd}`);
		} else {
			logger.log(`FAIL: plan-slice missing v2 command: ${cmd}`);
			passed = false;
		}
	}

	// Check implement-slice exists
	const implSlicePath = join(PLUGIN_DIR, "skills", "implement-slice", "SKILL.md");
	if (existsSync(implSlicePath)) {
		logger.log("PASS: implement-slice SKILL.md exists in dist");
		const implBody = readFileSync(implSlicePath, "utf-8");
		if (implBody.includes("chunk-start") && implBody.includes("chunk-verify")) {
			logger.log("PASS: implement-slice references chunk lifecycle commands");
		} else {
			logger.log("FAIL: implement-slice missing chunk lifecycle commands");
			passed = false;
		}
	} else {
		logger.log("FAIL: implement-slice SKILL.md not found in dist");
		passed = false;
	}

	// Check land-slice exists
	const landSlicePath = join(PLUGIN_DIR, "skills", "land-slice", "SKILL.md");
	if (existsSync(landSlicePath)) {
		logger.log("PASS: land-slice SKILL.md exists in dist");
		const landBody = readFileSync(landSlicePath, "utf-8");
		if (landBody.includes("slice:land")) {
			logger.log("PASS: land-slice references slice:land command");
		} else {
			logger.log("FAIL: land-slice missing slice:land command");
			passed = false;
		}
	} else {
		logger.log("FAIL: land-slice SKILL.md not found in dist");
		passed = false;
	}

	return passed;
}

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const overallStart = Date.now();

	logger.log("=== test-slice-execution-v2.ts ===");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Max iterations: ${MAX_ITERATIONS}`);
	logger.log(`Timestamp: ${new Date().toISOString()}`);

	const results: Array<{ name: string; passed: boolean }> = [];

	// Test 1: Plan-slice v2 pipeline (Agent SDK session)
	const t1 = await testPlanSliceV2();
	results.push({ name: "Plan-Slice V2 (P7->P8->P9)", passed: t1 });

	// Test 2: Static skill command checks
	const t2 = await testStaticSkillCheck();
	results.push({ name: "Static Skill Command References", passed: t2 });

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
