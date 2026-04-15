/**
 * Side-quest skills v2 test harness -- validates create-side-quest drives
 * through S0 (create) -> S1 (goal-commit) using v2 commands and ContentRef pattern.
 * Also runs static checks on implement-side-quest, land-side-quest, and audit skills.
 *
 * Usage: bun tools/dogfood/test-side-quest-skills-v2.ts [--model <model>] [--max-iterations <n>]
 *
 * Prerequisites: `bun run build` must have been run first.
 *
 * Tests:
 * 1. Create-side-quest: side-quest:create + side-quest:goal-commit (ContentRef)
 * 2. V2 event verification: events.jsonl contains expected v2 event types
 * 3. No v1 commands: old quest:* names not invoked
 * 4. Static skill checks: all 4 skills exist with correct v2 commands
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
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/side-quest-skills-v2-test.log");
const TRANSCRIPT_FILE = join(
	GOODPLAN_DIR,
	"tools/dogfood/side-quest-skills-v2-transcript.jsonl",
);
const MODEL = parseModel(tierDefault("e2e"));
const MAX_ITERATIONS = parseMaxIterations(1);

const SQ_NAME = "test-hello-sq";
const SQ_GOAL = "Create a hello.ts utility with a greet(name: string): string function";

// ─── V1 commands that must NOT appear ───────────────────────

const V1_COMMANDS = [
	"quest:create",
	"quest:show",
	"quest:list",
	"quest:complete",
	"start-implement --quest",
	"submit-implementation --quest",
];

// V2 commands we expect
const V2_EXPECTED_COMMANDS = ["side-quest:create", "side-quest:goal-commit"];

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-side-quest-skills-v2] Building plugin...");
try {
	execFileSync("bun", ["run", "build"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-side-quest-skills-v2] Plugin built successfully");
} catch (err) {
	console.error(
		"FATAL: Plugin build failed:",
		err instanceof Error ? err.message : String(err),
	);
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

// ─── Fixture: Bare project ──────────────────────────────────

function createBareFixture(): string {
	const tmpDir = join(
		"/tmp",
		`gp-fixture-sq-v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	);
	mkdirSync(tmpDir, { recursive: true });

	writeFileSync(
		join(tmpDir, "package.json"),
		JSON.stringify(
			{
				name: "gp-test-sq-v2",
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
		[
			"-c",
			"user.name=test",
			"-c",
			"user.email=test@test.com",
			"commit",
			"-m",
			"initial",
		],
		{ cwd: tmpDir, stdio: "pipe" },
	);

	const initResult = gp(["init", "--name", "test-sq-v2", "--json"], {
		cwd: tmpDir,
		gpBin: GP_BIN,
	});
	if (initResult.exitCode !== 0) {
		throw new Error(
			`gp init failed (exit ${initResult.exitCode}): ${initResult.stdout}`,
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
						const name =
							typeof block.name === "string" ? block.name : "unknown";
						toolCalls.push({ toolName: name, input: block.input });

						if (name === "Bash") {
							const cmd =
								typeof block.input === "object" &&
								block.input &&
								"command" in (block.input as Record<string, unknown>)
									? String(
											(block.input as Record<string, unknown>).command,
										)
									: "?";
							bashCommands.push(cmd);
							logFn(`  [${name}] ${cmd.slice(0, 120)}`);
						} else if (name === "Agent") {
							logFn(
								`  [${name}] ${JSON.stringify(block.input).slice(0, 150)}`,
							);
						} else {
							logFn(`  [${name}]`);
						}
					}
				}
			}
		} else if (message.type === "system") {
			const sysMsg = message as Record<string, unknown>;
			if (sysMsg.subtype === "task_started") {
				const desc =
					typeof sysMsg.description === "string"
						? sysMsg.description
						: "unknown";
				logFn(`  [subagent] started: ${desc.slice(0, 120)}`);
			} else if (sysMsg.subtype === "task_notification") {
				const status =
					typeof sysMsg.status === "string" ? sysMsg.status : "unknown";
				const summary =
					typeof sysMsg.summary === "string" ? sysMsg.summary : "";
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

// ─── Test 1: Create-Side-Quest V2 ──────────────────────────

async function testCreateSideQuestV2(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 1: Create-Side-Quest V2 (S0 -> S1)");
	logger.log("========================================\n");

	const startTime = Date.now();
	let allPassed = true;

	logger.log("[sq-v2] Creating bare fixture...");
	const fixtureDir = createBareFixture();
	logger.log(`[sq-v2] Fixture created at: ${fixtureDir}`);

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			"You are a senior developer testing the /gp:create-side-quest skill (v2).",
			`The side-quest goal is: ${SQ_GOAL}`,
			"",
			`When asked about the side-quest name, say: "${SQ_NAME}"`,
			`When asked about the goal, say: "${SQ_GOAL}"`,
			"When asked about approach, say: single phase, create one file.",
			"When asked about phasing, say: one phase is enough.",
			"When asked about expected behavior, say: src/hello.ts should export greet().",
			"When asked about risks, say: none.",
			"Always give concrete, brief answers.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody("create-side-quest");

	logger.log(
		`\n[sq-v2] Running /gp:create-side-quest (model: ${MODEL}, max-iterations: ${MAX_ITERATIONS})...\n`,
	);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Create a side quest named "${SQ_NAME}" with goal: ${SQ_GOAL}. Follow the create-side-quest skill instructions through goal capture (S0->S1) and plan creation. Use at most ${MAX_ITERATIONS} refinement iterations.`,
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
					GP_CREATE_SIDE_QUEST_MAX_ITERATIONS: String(MAX_ITERATIONS),
				}),
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						`Use at most ${MAX_ITERATIONS} refinement iterations for cost control.`,
						"Do not ask the user to confirm -- proceed automatically through all phases.",
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
			logger.log(
				`\n--- RESULT ($${sessionResult.totalCost.toFixed(4)}) ---`,
			);
			logger.log(sessionResult.result.result.slice(0, 3000));
		} else {
			logger.log(`\n--- ERROR (${sessionResult.result.subtype}) ---`);
		}
	} catch (err) {
		logger.log(
			`\n[ERROR] ${err instanceof Error ? err.message : String(err)}`,
		);
	} finally {
		simulatedUser.close();
	}

	// ─── Post-run verification ──────────────────────────────

	logger.log("\n--- POST-RUN VERIFICATION ---\n");

	// Test 1a: V2 commands invoked
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
		const criticalMissing = v2Missing.filter(
			(c) => c === "side-quest:create",
		);
		if (criticalMissing.length > 0) {
			logger.log(
				`FAIL: Critical v2 commands missing: ${criticalMissing.join(", ")}`,
			);
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

	// Test 1c: Events log
	const sqEventsPath = join(
		fixtureDir,
		".goodplan",
		"side-quests",
		SQ_NAME,
		"events.jsonl",
	);
	if (existsSync(sqEventsPath)) {
		const eventsContent = readFileSync(sqEventsPath, "utf-8");
		const expectedEvents = ["side-quest-created"];
		const optionalEvents = [
			"side-quest-goal-committed",
			"side-quest-plan-drafted",
			"side-quest-plan-committed",
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
		logger.log("FAIL: Side-quest events.jsonl not found");
		allPassed = false;
	}

	// Test 1d: Side-quest phase
	const sqShowResult = gp(
		["side-quest:show", "--side-quest", SQ_NAME, "--json"],
		{ cwd: fixtureDir, gpBin: GP_BIN },
	);

	if (sqShowResult.exitCode === 0) {
		try {
			const sqData = JSON.parse(sqShowResult.stdout) as Record<
				string,
				unknown
			>;
			const phase = sqData.phase ?? sqData.status ?? "unknown";
			logger.log(`PASS: Side-quest exists, phase: ${String(phase)}`);
		} catch {
			logger.log(
				`WARN: Could not parse side-quest:show output: ${sqShowResult.stdout.slice(0, 200)}`,
			);
		}
	} else {
		logger.log(
			`FAIL: side-quest:show failed (exit ${sqShowResult.exitCode})`,
		);
		allPassed = false;
	}

	// Test 1e: State write violations
	if (sessionResult && sessionResult.violations.length > 0) {
		logger.log(
			`FAIL: ${sessionResult.violations.length} state write violation(s):`,
		);
		for (const v of sessionResult.violations) {
			logger.log(`  - ${v}`);
		}
		allPassed = false;
	} else {
		logger.log("PASS: No state write violations detected");
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	logger.log(
		`\n[sq-v2] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`,
	);
	logger.log(`[sq-v2] Fixture preserved at: ${fixtureDir}`);

	return allPassed;
}

// ─── Test 2: Static Skill Checks ────────────────────────────

async function testStaticSkillChecks(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 2: Static skill command references");
	logger.log("========================================\n");

	let passed = true;

	// Check create-side-quest
	const csqBody = loadSkillBody("create-side-quest");
	const csqV2 = [
		"side-quest:create",
		"side-quest:goal-commit",
		"side-quest:plan-draft",
		"refine:start",
		"refine:converge",
	];
	for (const cmd of csqV2) {
		if (csqBody.includes(cmd)) {
			logger.log(`PASS: create-side-quest references: ${cmd}`);
		} else {
			logger.log(`FAIL: create-side-quest missing: ${cmd}`);
			passed = false;
		}
	}

	// Check implement-side-quest exists
	const isqPath = join(
		PLUGIN_DIR,
		"skills",
		"implement-side-quest",
		"SKILL.md",
	);
	if (existsSync(isqPath)) {
		logger.log("PASS: implement-side-quest SKILL.md exists");
		const isqBody = readFileSync(isqPath, "utf-8");
		if (
			isqBody.includes("side-quest:chunk-start") &&
			isqBody.includes("side-quest:chunk-verify")
		) {
			logger.log("PASS: implement-side-quest references chunk commands");
		} else {
			logger.log("FAIL: implement-side-quest missing chunk commands");
			passed = false;
		}
		// No red/green
		if (
			!isqBody.includes("chunk-red-written") &&
			!isqBody.includes("chunk-red-failed")
		) {
			logger.log("PASS: implement-side-quest has no TDD red/green commands");
		} else {
			logger.log("FAIL: implement-side-quest has TDD commands (should not)");
			passed = false;
		}
	} else {
		logger.log("FAIL: implement-side-quest SKILL.md not found");
		passed = false;
	}

	// Check land-side-quest exists
	const lsqPath = join(
		PLUGIN_DIR,
		"skills",
		"land-side-quest",
		"SKILL.md",
	);
	if (existsSync(lsqPath)) {
		logger.log("PASS: land-side-quest SKILL.md exists");
		const lsqBody = readFileSync(lsqPath, "utf-8");
		if (lsqBody.includes("side-quest:land")) {
			logger.log("PASS: land-side-quest references side-quest:land");
		} else {
			logger.log("FAIL: land-side-quest missing side-quest:land");
			passed = false;
		}
		if (lsqBody.includes("learning:capture")) {
			logger.log("PASS: land-side-quest uses learning:capture");
		} else {
			logger.log("FAIL: land-side-quest missing learning:capture");
			passed = false;
		}
	} else {
		logger.log("FAIL: land-side-quest SKILL.md not found");
		passed = false;
	}

	// Check audit uses side-quest:create (not quest:create)
	const auditBody = loadSkillBody("audit");
	if (
		auditBody.includes("side-quest:create") &&
		!auditBody.includes("quest:create")
	) {
		logger.log(
			"PASS: audit uses side-quest:create (not quest:create)",
		);
	} else {
		logger.log("FAIL: audit still references quest:create");
		passed = false;
	}

	return passed;
}

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const overallStart = Date.now();

	logger.log("=== test-side-quest-skills-v2.ts ===");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Max iterations: ${MAX_ITERATIONS}`);
	logger.log(`Timestamp: ${new Date().toISOString()}`);

	const results: Array<{ name: string; passed: boolean }> = [];

	// Test 1: Create-side-quest v2 (Agent SDK session)
	const t1 = await testCreateSideQuestV2();
	results.push({ name: "Create-Side-Quest V2 (S0->S1)", passed: t1 });

	// Test 2: Static skill checks
	const t2 = await testStaticSkillChecks();
	results.push({ name: "Static Skill Command References", passed: t2 });

	// ─── Overall Summary ────────────────────────────────────

	const overallElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
	const allPassed = results.every((r) => r.passed);

	logger.log("\n=== OVERALL SUMMARY ===");
	for (const r of results) {
		logger.log(`  ${r.passed ? "PASS" : "FAIL"}: ${r.name}`);
	}
	logger.log(`\nElapsed: ${overallElapsed}s`);
	logger.log(
		`Overall: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`,
	);
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
