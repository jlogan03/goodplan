/**
 * Consolidated quality validation harness — runs the full 7-skill pipeline
 * against a realistic flashcard app fixture and validates quality proxy metrics.
 *
 * Usage: bun tools/dogfood/validate-consolidated.ts [--model <model>]
 *
 * Generates a realistic flashcard CLI app fixture (TypeScript, Biome, Bun),
 * then runs: init -> create-epic -> plan-slice -> implement -> create-side-quest
 * -> audit -> complete-epic. After the pipeline, validates architecture depth,
 * plan structure, review severity, build/lint/test, learnings, and orchestrator
 * discipline.
 *
 * Tests:
 * 1. Full pipeline: all 7 skills run in sequence
 * 2. Quality proxy metrics pass thresholds
 * 3. Orchestrator discipline: no direct artifact reads
 * 4. Cost tracking per skill and total
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKResultSuccess } from "@anthropic-ai/claude-agent-sdk";
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
	verifyEntityStatus,
} from "./utils";
import type { CliError, SkillSessionResult } from "./utils";

// ─── CLI Arg Parsing ────────────────────────────────────────

// MAX_ITERATIONS removed — the E2E test runs uncapped to match real user experience.
// Skills use their own built-in exit criteria (score thresholds, stagnation detection, hard caps).

// ─── Environment ────────────────────────────────────────────

const HOME = process.env.HOME;
if (!HOME) {
	console.error("FATAL: HOME environment variable is not set");
	process.exit(1);
}

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");
const GP_BIN = join(PLUGIN_DIR, "binaries", platformBinaryDir(), "gp");
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/validate-consolidated.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/validate-consolidated-transcript.jsonl");
const MODEL = parseModel(tierDefault("e2e"));
// Simulated user uses Sonnet — capable enough for domain Q&A without Opus cost.
const SIMULATED_USER_MODEL = "claude-sonnet-4-5";
// No iteration cap — the E2E test should run the full refinement loop as a real user would.
// Skills have their own built-in exit criteria (score >= 9, stagnation detection, hard cap of 10-12).
// Individual skill test harnesses (test-plan-slice.ts, etc.) may still use --max-iterations for
// focused mechanical testing, but the consolidated E2E test must be uncapped.

const EPIC_NAME = "spaced-repetition";
const EPIC_GOAL =
	"Add spaced repetition with the SM-2 algorithm to the flashcard CLI. " +
	"Cards should track review history, calculate next review date using SM-2, " +
	"and the quiz engine should prioritize cards due for review.";

const SIDE_QUEST_GOAL =
	"Add markdown card import — parse .md files with front/back delimiters into Card objects";

// V2 pipeline costs more than v1 due to higher refinement thresholds (9/10)
// and additional steps (land-slice). Budget: create-epic $60 + plan-slice $50
// + implement $30 + 5 other steps ~$10 each = ~$190 max.
const COST_THRESHOLD_USD = 200;

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[validate-consolidated] Building plugin...");
try {
	execFileSync("bun", ["run", "build"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[validate-consolidated] Plugin built successfully");
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

// Local plugin path (PLUGIN_DIR) is passed directly to Agent SDK — no cache sync needed.

// ─── Logging ────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Tool Call Tracking ─────────────────────────────────────

function createToolCallTracker(logFn: (msg: string) => void): {
	toolCalls: Array<{ toolName: string; input: unknown }>;
	onMessage: (message: SDKMessage) => void;
} {
	const toolCalls: Array<{ toolName: string; input: unknown }> = [];

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

	return { toolCalls, onMessage };
}

// ─── Skill Invocation ──────────────────────────────────────────

/**
 * The plugin namespace when loaded via --plugin-dir.
 * Matches the "name" field in .claude-plugin/plugin.json.
 * Skills are invoked as /goodplan:{skillName}.
 */
const PLUGIN_NAMESPACE = "goodplan";

/** Build a prompt that tells the LLM to invoke the skill naturally via the Skill tool. */
function skillInvocationPrompt(skillName: string, userPrompt: string): string {
	return `/${PLUGIN_NAMESPACE}:${skillName} — ${userPrompt}`;
}

// ─── Fixture: Realistic Flashcard CLI App ───────────────────

function createFlashcardFixture(): string {
	const tmpDir = join(
		"/tmp",
		`gp-flashcard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	);
	mkdirSync(tmpDir, { recursive: true });

	// package.json
	writeFileSync(
		join(tmpDir, "package.json"),
		JSON.stringify(
			{
				name: "flashcard-cli",
				version: "0.1.0",
				type: "module",
				scripts: {
					build: "bun build src/index.ts --outdir dist",
					lint: "biome check .",
					test: "bun test",
				},
				dependencies: {
					typescript: "^5.4.0",
				},
				devDependencies: {
					"@biomejs/biome": "^1.9.4",
				},
			},
			null,
			2,
		),
	);

	// tsconfig.json
	writeFileSync(
		join(tmpDir, "tsconfig.json"),
		JSON.stringify(
			{
				compilerOptions: {
					target: "ESNext",
					module: "ESNext",
					moduleResolution: "bundler",
					strict: true,
					outDir: "dist",
					rootDir: "src",
					declaration: true,
					esModuleInterop: true,
					skipLibCheck: true,
				},
				include: ["src/**/*.ts"],
			},
			null,
			2,
		),
	);

	// biome.json
	writeFileSync(
		join(tmpDir, "biome.json"),
		JSON.stringify(
			{
				$schema: "https://biomejs.dev/schemas/1.9.4/schema.json",
				files: {
					ignore: [".goodplan/", "dist/"],
				},
				formatter: {
					indentStyle: "space",
					indentWidth: 2,
				},
				linter: {
					enabled: true,
					rules: {
						recommended: true,
					},
				},
				organizeImports: {
					enabled: true,
				},
			},
			null,
			2,
		),
	);

	// Source files
	mkdirSync(join(tmpDir, "src"), { recursive: true });

	// src/card.ts — Card type + loader
	writeFileSync(
		join(tmpDir, "src/card.ts"),
		[
			"/** Represents a single flashcard with a front (question) and back (answer). */",
			"export interface Card {",
			"  readonly id: string;",
			"  readonly front: string;",
			"  readonly back: string;",
			"  readonly tags: readonly string[];",
			"  readonly createdAt: string;",
			"}",
			"",
			"/** Load cards from a JSON file. */",
			"export function loadCards(filePath: string): Card[] {",
			"  const raw = Bun.file(filePath);",
			"  // In a real app we'd validate, but this is the initial skeleton",
			"  return [] as Card[];",
			"}",
			"",
			"/** Create a new card with a generated ID. */",
			"export function createCard(front: string, back: string, tags: string[] = []): Card {",
			"  return {",
			"    id: crypto.randomUUID(),",
			"    front,",
			"    back,",
			"    tags,",
			"    createdAt: new Date().toISOString(),",
			"  };",
			"}",
			"",
		].join("\n"),
	);

	// src/quiz.ts — Quiz engine
	writeFileSync(
		join(tmpDir, "src/quiz.ts"),
		[
			'import type { Card } from "./card";',
			"",
			"/** Quiz session state. */",
			"export interface QuizSession {",
			"  readonly cards: readonly Card[];",
			"  currentIndex: number;",
			"  readonly answers: Map<string, boolean>;",
			"}",
			"",
			"/** Start a new quiz session with the given cards. */",
			"export function startQuiz(cards: Card[]): QuizSession {",
			"  return {",
			"    cards,",
			"    currentIndex: 0,",
			"    answers: new Map(),",
			"  };",
			"}",
			"",
			"/** Get the current card in the quiz, or undefined if done. */",
			"export function currentCard(session: QuizSession): Card | undefined {",
			"  return session.cards[session.currentIndex];",
			"}",
			"",
			"/** Record an answer and advance to the next card. */",
			"export function answerCard(session: QuizSession, correct: boolean): void {",
			"  const card = currentCard(session);",
			"  if (card) {",
			"    session.answers.set(card.id, correct);",
			"    session.currentIndex++;",
			"  }",
			"}",
			"",
			"/** Check if the quiz is complete. */",
			"export function isQuizComplete(session: QuizSession): boolean {",
			"  return session.currentIndex >= session.cards.length;",
			"}",
			"",
		].join("\n"),
	);

	// src/score.ts — Score tracker
	writeFileSync(
		join(tmpDir, "src/score.ts"),
		[
			"/** Score summary for a completed quiz session. */",
			"export interface ScoreSummary {",
			"  readonly total: number;",
			"  readonly correct: number;",
			"  readonly incorrect: number;",
			"  readonly percentage: number;",
			"}",
			"",
			"/** Calculate score from a map of card ID -> correct/incorrect. */",
			"export function calculateScore(answers: Map<string, boolean>): ScoreSummary {",
			"  let correct = 0;",
			"  let incorrect = 0;",
			"  for (const [, isCorrect] of answers) {",
			"    if (isCorrect) {",
			"      correct++;",
			"    } else {",
			"      incorrect++;",
			"    }",
			"  }",
			"  const total = correct + incorrect;",
			"  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;",
			"  return { total, correct, incorrect, percentage };",
			"}",
			"",
			"/** Format a score summary as a human-readable string. */",
			"export function formatScore(summary: ScoreSummary): string {",
			"  return `Score: ${summary.correct}/${summary.total} (${summary.percentage}%)`;",
			"}",
			"",
		].join("\n"),
	);

	// src/index.ts — CLI entry
	writeFileSync(
		join(tmpDir, "src/index.ts"),
		[
			'import { createCard } from "./card";',
			'import { answerCard, currentCard, isQuizComplete, startQuiz } from "./quiz";',
			'import { calculateScore, formatScore } from "./score";',
			"",
			"/** Main CLI entry point. */",
			"function main(): void {",
			'  console.log("Flashcard CLI v0.1.0");',
			"",
			"  // Demo: create some cards and run a quick quiz",
			"  const cards = [",
			'    createCard("What is TypeScript?", "A typed superset of JavaScript"),',
			'    createCard("What is Bun?", "A fast JavaScript runtime"),',
			'    createCard("What is SM-2?", "A spaced repetition algorithm"),',
			"  ];",
			"",
			"  const session = startQuiz(cards);",
			"",
			"  // Simulate answering all cards correctly",
			"  while (!isQuizComplete(session)) {",
			"    const card = currentCard(session);",
			"    if (card) {",
			"      console.log(`Q: ${card.front}`);",
			"      console.log(`A: ${card.back}`);",
			"      answerCard(session, true);",
			"    }",
			"  }",
			"",
			"  const score = calculateScore(session.answers);",
			"  console.log(formatScore(score));",
			"}",
			"",
			"main();",
			"",
		].join("\n"),
	);

	// Tests
	mkdirSync(join(tmpDir, "tests"), { recursive: true });

	writeFileSync(
		join(tmpDir, "tests/card.test.ts"),
		[
			'import { describe, expect, it } from "bun:test";',
			'import { createCard } from "../src/card";',
			"",
			'describe("createCard", () => {',
			'  it("should create a card with front and back", () => {',
			'    const card = createCard("Q", "A");',
			'    expect(card.front).toBe("Q");',
			'    expect(card.back).toBe("A");',
			"    expect(card.id).toBeDefined();",
			"    expect(card.tags).toEqual([]);",
			"    expect(card.createdAt).toBeDefined();",
			"  });",
			"",
			'  it("should accept tags", () => {',
			'    const card = createCard("Q", "A", ["math", "algebra"]);',
			'    expect(card.tags).toEqual(["math", "algebra"]);',
			"  });",
			"});",
			"",
		].join("\n"),
	);

	// Install dependencies — fail hard if this doesn't work
	execFileSync("bun", ["install"], {
		cwd: tmpDir,
		stdio: "pipe",
		encoding: "utf-8",
	});
	logger.log("[fixture] bun install completed");

	// git init + commit
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
			"initial flashcard CLI skeleton",
		],
		{ cwd: tmpDir, stdio: "pipe" },
	);

	return tmpDir;
}

// ─── Skill Runner Helper ────────────────────────────────────

interface SkillRunResult {
	sessionResult: SkillSessionResult | undefined;
	tracker: ReturnType<typeof createToolCallTracker>;
	success: boolean;
}

async function runSkill(opts: {
	skillName: string;
	prompt: string;
	userSystemPrompt: string;
	fixtureDir: string;
	maxTurns?: number;
	maxBudgetUsd?: number;
}): Promise<SkillRunResult> {
	const tracker = createToolCallTracker(logger.log.bind(logger));

	const simulatedUser = createSimulatedUser({
		cwd: opts.fixtureDir,
		systemPrompt: opts.userSystemPrompt,
		transcriptFile: TRANSCRIPT_FILE,
		model: SIMULATED_USER_MODEL,
	});

	let sessionResult: SkillSessionResult | undefined;
	let success = false;

	try {
		sessionResult = await runSkillSession({
			prompt: skillInvocationPrompt(opts.skillName, opts.prompt),
			options: {
				cwd: opts.fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: opts.maxTurns ?? 400,
				maxBudgetUsd: opts.maxBudgetUsd ?? 500,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: createTestEnv(PLUGIN_DIR),
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser,
			checkViolations: true,
			onMessage: tracker.onMessage,
		});

		if (isSuccess(sessionResult.result)) {
			logger.log(`\n--- RESULT ($${sessionResult.totalCost.toFixed(4)}) ---`);
			logger.log(sessionResult.result.result.slice(0, 2000));
			success = true;
		} else {
			logger.log(`\n--- ERROR (${sessionResult.result.subtype}) ---`);
		}
	} catch (err) {
		logger.log(`\n[ERROR] ${err instanceof Error ? err.message : String(err)}`);
	} finally {
		simulatedUser.close();
	}

	return { sessionResult, tracker, success };
}

// ─── Pipeline Verification Helpers ─────────────────────────

/** Check that an event log contains all required event types. */
function verifyEvents(
	fixtureDir: string,
	scope: "project" | "epic",
	scopeRef: string | null,
	requiredEvents: string[],
): { ok: boolean; missing: string[]; found: string[] } {
	let eventsPath: string;
	if (scope === "project") {
		eventsPath = join(fixtureDir, ".goodplan", "events.jsonl");
	} else {
		eventsPath = join(fixtureDir, ".goodplan", "epics", scopeRef ?? "", "events.jsonl");
	}

	if (!existsSync(eventsPath)) {
		return { ok: false, missing: requiredEvents, found: [] };
	}

	const content = readFileSync(eventsPath, "utf-8");
	const found: string[] = [];
	const missing: string[] = [];

	for (const evt of requiredEvents) {
		if (content.includes(`"${evt}"`)) {
			found.push(evt);
		} else {
			missing.push(evt);
		}
	}

	return { ok: missing.length === 0, missing, found };
}

/** Get a slice's current phase via CLI. Returns phase string or "unknown". */
function getSlicePhase(fixtureDir: string, epicName: string, sliceName: string): string {
	const result = gp(["slice:show", "--epic", epicName, "--slice", sliceName, "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});
	if (result.exitCode !== 0) return "unknown";
	try {
		const data = JSON.parse(result.stdout) as { phase?: string };
		return data.phase ?? "unknown";
	} catch {
		return "unknown";
	}
}

/** Parse phase number from phase string (e.g., "P9" → 9, "S3" → 3). */
function phaseNum(phase: string): number {
	const match = phase.match(/^[PS](\d+)$/);
	return match?.[1] !== undefined ? Number.parseInt(match[1], 10) : -1;
}

/** Find the first slice directory name in an epic. */
function findFirstSlice(fixtureDir: string, epicName: string): string | null {
	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	if (!existsSync(slicesDir)) return null;
	const dirs = readdirSync(slicesDir).filter((d: string) =>
		statSync(join(slicesDir, d)).isDirectory(),
	);
	return dirs[0] ?? null;
}

// ─── Pipeline Steps ─────────────────────────────────────────

interface PipelineContext {
	fixtureDir: string;
	allToolCalls: Array<{ toolName: string; input: unknown }>;
	allViolations: string[];
	allArtifactReadViolations: string[];
	allCliErrors: Array<{ skill: string; error: CliError }>;
	skillCosts: Array<{ skill: string; cost: number }>;
}

/** Step 1: /gp:init */
async function stepInit(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 1: /gp:init");
	logger.log("========================================\n");

	const result = await runSkill({
		skillName: "init",
		prompt:
			"Initialize this project with goodplan. The project is a flashcard CLI app built with TypeScript and Bun.",
		userSystemPrompt: [
			"You are a senior TypeScript developer who built this flashcard CLI app.",
			"The project is called 'flashcard-cli' — a CLI flashcard quiz app with spaced repetition, built with TypeScript strict mode, Bun runtime, and Biome for linting.",
			"The codebase has four modules: card (data types + loading), quiz (session engine), score (tracking), and index (CLI entry point). Files use kebab-case naming.",
			"Answer questions based on your knowledge of the project. Give concrete, specific answers with reasoning.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 200,
		maxBudgetUsd: 500,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "init", cost: result.sessionResult.totalCost });
		for (const e of result.sessionResult.cliErrors) ctx.allCliErrors.push({ skill: "init", error: e });
	}

	// Verify .goodplan/ directory exists and project-initialized event emitted
	const goodplanDir = join(ctx.fixtureDir, ".goodplan");
	if (!existsSync(goodplanDir)) {
		logger.log("FAIL: .goodplan/ directory not created by /gp:init skill");
		return false;
	}

	const events = verifyEvents(ctx.fixtureDir, "project", null, ["project-initialized"]);
	if (!events.ok) {
		logger.log(`FAIL: Missing project events: ${events.missing.join(", ")}`);
		return false;
	}

	logger.log("PASS: .goodplan/ created + project-initialized event emitted");
	return true;
}

/** Step 2: /gp:create-epic */
async function stepCreateEpic(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 2: /gp:create-epic");
	logger.log("========================================\n");

	const result = await runSkill({
		skillName: "create-epic",
		prompt: `Create an epic named "${EPIC_NAME}" with the goal: ${EPIC_GOAL}. Follow the create-epic skill instructions completely through all phases.`,
		userSystemPrompt: [
			"You are a senior TypeScript developer who built this flashcard CLI app.",
			`The epic goal is: ${EPIC_GOAL}`,
			"",
			"You know the project well. It has four modules: cards (data types + persistence), quiz-engine (session management + SM-2 scheduling), scoring (stats + history tracking), and a CLI entry point.",
			"The SM-2 algorithm is the core of spaced repetition — it calculates when to show a card next based on ease factor, interval, and repetition count.",
			"You prefer modular architecture with clear interfaces. Dependencies flow: SM-2 core is standalone, review scheduling depends on SM-2, quiz engine integration depends on both.",
			"During exploration, engage with findings substantively — ask follow-up questions if something is unclear, and share your domain knowledge about spaced repetition when relevant.",
			"Give concrete, specific answers with reasoning. Draw on your knowledge of the codebase and spaced repetition domain.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		// create-epic runs 6+ phases including architecture and slice-set refinement loops.
		// Each refinement round at Opus rates costs $3-5, so $30 is insufficient.
		maxTurns: 600,
		maxBudgetUsd: 500,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "create-epic", cost: result.sessionResult.totalCost });
		for (const e of result.sessionResult.cliErrors) ctx.allCliErrors.push({ skill: "create-epic", error: e });
	}

	// Verify epic reached P5 (slice set committed) — the terminal phase for create-epic.
	const epicStatus = verifyEntityStatus("epic", EPIC_NAME, "P5", {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});

	if (!epicStatus.ok) {
		logger.log(`FAIL: Epic phase is '${epicStatus.actual}' (expected 'P5')`);
		return false;
	}

	// Verify key events were emitted (proves the pipeline actually ran, not just phase-skipped)
	const events = verifyEvents(ctx.fixtureDir, "epic", EPIC_NAME, [
		"epic-created",
		"epic-goal-committed",
		"exploration-concluded",
		"architecture-target-committed",
		"pressure-test-committed",
		"slice-set-committed",
	]);

	if (!events.ok) {
		logger.log(`FAIL: Missing epic events: ${events.missing.join(", ")}`);
		return false;
	}

	// Verify at least one slice was created
	const firstSlice = findFirstSlice(ctx.fixtureDir, EPIC_NAME);
	if (firstSlice === null) {
		logger.log("FAIL: No slices created by create-epic");
		return false;
	}

	logger.log(`PASS: Epic at P5, ${events.found.length} events verified, slice '${firstSlice}' exists`);
	return true;
}

/** Step 3: Activate epic — uses /gp:start-epic skill */
async function stepActivateEpic(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 3: /gp:start-epic");
	logger.log("========================================\n");

	// Pre-check: epic should be exactly at P5 (output of create-epic).
	// If it's already at P6, that's unexpected and we should flag it rather than skip.
	const preStatus = verifyEntityStatus("epic", EPIC_NAME, "P5", {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});

	if (!preStatus.ok) {
		logger.log(`WARNING: Epic at '${preStatus.actual}' before start-epic (expected P5)`);
	}

	const result = await runSkill({
		skillName: "start-epic",
		prompt: `Activate the epic "${EPIC_NAME}". Review the architecture proposal and approve it.`,
		userSystemPrompt: [
			"You are a senior TypeScript developer reviewing the architecture for a flashcard app with spaced repetition.",
			"You expect a well-structured architecture to cover card data management, quiz engine logic, SM-2 scheduling, and scoring/statistics as distinct concerns.",
			"Evaluate proposals based on your experience: clean module boundaries, appropriate dependency direction, and testability matter to you.",
			"If the architecture is solid, approve it. If it has gaps or poor structure, identify the specific issues.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 100,
		maxBudgetUsd: 500,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "start-epic", cost: result.sessionResult.totalCost });
		for (const e of result.sessionResult.cliErrors) ctx.allCliErrors.push({ skill: "start-epic", error: e });
	}

	const postStatus = verifyEntityStatus("epic", EPIC_NAME, "P6", {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});

	if (!postStatus.ok) {
		logger.log(`FAIL: Epic at '${postStatus.actual}' after start-epic (expected 'P6')`);
		return false;
	}

	const events = verifyEvents(ctx.fixtureDir, "epic", EPIC_NAME, ["epic-activated"]);
	if (!events.ok) {
		logger.log(`FAIL: Missing epic-activated event`);
		return false;
	}

	logger.log("PASS: Epic activated (phase P6, epic-activated event verified)");
	return true;
}

/** Step 4: /gp:plan-slice */
async function stepPlanSlice(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 4: /gp:plan-slice");
	logger.log("========================================\n");

	// Find first slice
	const slicesDir = join(ctx.fixtureDir, ".goodplan", "epics", EPIC_NAME, "slices");
	let sliceName = "01-sm2-core";
	if (existsSync(slicesDir)) {
		const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
			statSync(join(slicesDir, d)).isDirectory(),
		);
		if (sliceDirs.length > 0 && sliceDirs[0]) {
			sliceName = sliceDirs[0];
		}
	}

	// No fallback slice creation — if create-epic didn't produce slices, that's a failure
	if (!existsSync(join(slicesDir, sliceName))) {
		logger.log("FAIL: No slices found — create-epic should have produced them");
		return false;
	}

	logger.log(`[plan-slice] Planning slice: ${sliceName}`);

	const result = await runSkill({
		skillName: "plan-slice",
		prompt: `Plan the slice "${sliceName}" in epic "${EPIC_NAME}". Create a detailed implementation plan with phases.`,
		userSystemPrompt: [
			"You are a senior TypeScript developer planning SM-2 spaced repetition implementation.",
			"You prefer a phased approach: define types and interfaces first, then implement the core algorithm as pure functions, then integrate with the quiz engine.",
			"The SM-2 algorithm should live in src/sm2.ts with tests in tests/sm2.test.ts. It takes ease factor, interval, and repetitions as input and returns the next review date.",
			"For testing, you want unit tests with known SM-2 input/output pairs — e.g., a card with ease 2.5 and quality 4 should produce a specific next interval.",
			"For phasing: phase 1 should produce compilable types, phase 2 should produce passing SM-2 unit tests, phase 3 should produce an integrated quiz flow where answering a card updates its review schedule.",
			"Give concrete, specific answers with reasoning.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		// plan-slice runs Q&A + shape checkpoint + refinement loop with v2 thresholds (9/10).
		maxTurns: 500,
		maxBudgetUsd: 500,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "plan-slice", cost: result.sessionResult.totalCost });
		for (const e of result.sessionResult.cliErrors) ctx.allCliErrors.push({ skill: "plan-slice", error: e });
	}

	// Verify slice reached P9 (plan committed) and plan ContentRef exists
	const slicePhase = getSlicePhase(ctx.fixtureDir, EPIC_NAME, sliceName);
	if (phaseNum(slicePhase) < 9) {
		logger.log(`FAIL: Slice at ${slicePhase} after plan-slice (expected >= P9)`);
		return false;
	}

	// Verify planning events were emitted
	const events = verifyEvents(ctx.fixtureDir, "epic", EPIC_NAME, [
		"slice-plan-drafted",
		"slice-plan-committed",
	]);
	if (!events.ok) {
		logger.log(`FAIL: Missing plan events: ${events.missing.join(", ")}`);
		return false;
	}

	logger.log(`PASS: Slice '${sliceName}' at ${slicePhase}, plan events verified`);
	return true;
}

/** Step 5: /gp:implement-slice */
async function stepImplement(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 5: /gp:implement-slice");
	logger.log("========================================\n");

	// Find the slice name
	const slicesDir = join(ctx.fixtureDir, ".goodplan", "epics", EPIC_NAME, "slices");
	let sliceName = "01-sm2-core";
	if (existsSync(slicesDir)) {
		const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
			statSync(join(slicesDir, d)).isDirectory(),
		);
		if (sliceDirs.length > 0 && sliceDirs[0]) {
			sliceName = sliceDirs[0];
		}
	}

	const result = await runSkill({
		skillName: "implement-slice",
		prompt: `Implement the plan for slice "${sliceName}" in epic "${EPIC_NAME}". Follow the plan phases and write the code.`,
		userSystemPrompt: [
			"You are a senior TypeScript developer implementing SM-2 spaced repetition.",
			"You care about code quality: pure functions for the SM-2 algorithm, proper TypeScript types, and comprehensive test coverage with known input/output pairs.",
			"Evaluate proposals and code review findings based on your experience. Approve good approaches, push back on questionable ones.",
			"You know the project uses Bun for runtime and testing, Biome for linting, and TypeScript strict mode.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 400,
		maxBudgetUsd: 500,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "implement-slice", cost: result.sessionResult.totalCost });
		for (const e of result.sessionResult.cliErrors) ctx.allCliErrors.push({ skill: "implement-slice", error: e });
	}

	if (!result.success) {
		logger.log("FAIL: Implementation skill did not complete successfully");
		return false;
	}

	// Verify slice reached at least P10 (implementation started) and events emitted
	const slicePhase = getSlicePhase(ctx.fixtureDir, EPIC_NAME, sliceName);
	if (phaseNum(slicePhase) < 10) {
		logger.log(`FAIL: Slice at ${slicePhase} after implement-slice (expected >= P10)`);
		return false;
	}

	const events = verifyEvents(ctx.fixtureDir, "epic", EPIC_NAME, [
		"slice-implementation-started",
	]);
	if (!events.ok) {
		logger.log(`FAIL: Missing implementation events: ${events.missing.join(", ")}`);
		return false;
	}

	logger.log(`PASS: Slice '${sliceName}' at ${slicePhase}, implementation events verified`);
	return true;
}

/** Step 6: /gp:land-slice */
async function stepLandSlice(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 6: /gp:land-slice");
	logger.log("========================================\n");

	// Find the slice name
	const slicesDir = join(ctx.fixtureDir, ".goodplan", "epics", EPIC_NAME, "slices");
	let sliceName = "01-sm2-core";
	if (existsSync(slicesDir)) {
		const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
			statSync(join(slicesDir, d)).isDirectory(),
		);
		if (sliceDirs.length > 0 && sliceDirs[0]) {
			sliceName = sliceDirs[0];
		}
	}

	const result = await runSkill({
		skillName: "land-slice",
		prompt: `Land the slice "${sliceName}" in epic "${EPIC_NAME}". Complete the slice and capture any learnings.`,
		userSystemPrompt: [
			"You are a senior TypeScript developer landing the SM-2 spaced repetition implementation.",
			"The implementation is complete and tested. Review the changes, capture any learnings about the implementation experience, and land the slice.",
			"For learnings, reflect on what worked well and what you'd do differently.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 100,
		maxBudgetUsd: 500,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "land-slice", cost: result.sessionResult.totalCost });
		for (const e of result.sessionResult.cliErrors) ctx.allCliErrors.push({ skill: "land-slice", error: e });
	}

	if (!result.success) {
		logger.log("FAIL: Land-slice did not complete successfully");
		return false;
	}

	// Verify slice reached P12 (landed) and slice-landed event emitted
	const slicePhase = getSlicePhase(ctx.fixtureDir, EPIC_NAME, sliceName);
	if (slicePhase !== "P12") {
		logger.log(`FAIL: Slice at ${slicePhase} after land-slice (expected P12)`);
		return false;
	}

	const events = verifyEvents(ctx.fixtureDir, "epic", EPIC_NAME, ["slice-landed"]);
	if (!events.ok) {
		logger.log("FAIL: Missing slice-landed event");
		return false;
	}

	logger.log(`PASS: Slice '${sliceName}' at P12, slice-landed event verified`);
	return true;
}

/** Step 7: /gp:create-side-quest */
async function stepCreateSideQuest(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 7: /gp:create-side-quest");
	logger.log("========================================\n");

	const result = await runSkill({
		skillName: "create-side-quest",
		prompt: `Create a side quest: "${SIDE_QUEST_GOAL}". This is a small addition to support importing cards from markdown files.`,
		userSystemPrompt: [
			"You are a senior TypeScript developer who wants to add markdown card import to this flashcard app.",
			`The side quest goal is: ${SIDE_QUEST_GOAL}`,
			"You envision a simple markdown format where cards are separated by '---' delimiters, with the front on the first line and the back on the second line.",
			"The implementation should be small: a parser function in src/import.ts and tests in tests/import.test.ts.",
			"For phasing: phase 1 = parser function that reads a markdown file and returns Card objects, phase 2 = test coverage including edge cases (empty files, malformed delimiters, multi-line content).",
			"Give concrete answers with reasoning. If asked about risks, mention encoding issues and delimiter ambiguity.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 200,
		maxBudgetUsd: 500,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "create-side-quest", cost: result.sessionResult.totalCost });
		for (const e of result.sessionResult.cliErrors) ctx.allCliErrors.push({ skill: "create-side-quest", error: e });
	}

	if (result.success) {
		logger.log("PASS: Side quest created");
		return true;
	}

	logger.log("FAIL: Side quest creation did not complete successfully");
	return false;
}

/** Step 7: /gp:audit */
async function stepAudit(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 8: /gp:audit (architecture)");
	logger.log("========================================\n");

	const result = await runSkill({
		skillName: "audit",
		prompt: "Audit the project architecture and report findings.",
		userSystemPrompt: [
			"You are a senior developer auditing the architecture of a flashcard app with spaced repetition.",
			"You want to audit the architecture specifically — you're concerned about whether the module boundaries and dependency structure are sound.",
			"For side quests proposed from findings: approve ones that address real structural gaps or missing functionality. Decline purely cosmetic improvements.",
			"Evaluate findings based on their actual impact on the codebase, not just their severity label.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 200,
		maxBudgetUsd: 500,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "audit", cost: result.sessionResult.totalCost });
		for (const e of result.sessionResult.cliErrors) ctx.allCliErrors.push({ skill: "audit", error: e });
	}

	if (result.success) {
		logger.log("PASS: Audit completed");
		return true;
	}

	logger.log("FAIL: Audit did not complete successfully");
	return false;
}

/** Step 8: /gp:complete-epic */
async function stepCompleteEpic(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 9: /gp:complete-epic");
	logger.log("========================================\n");

	// No auto-abandon. The complete-epic skill should handle non-terminal slices
	// by telling the user which slices need attention. If slices are still in
	// non-terminal states, that's a real issue the skill should surface.

	const result = await runSkill({
		skillName: "complete-epic",
		prompt: `Complete the epic "${EPIC_NAME}". Synthesize learnings and complete the epic. If any slices are not in a terminal state, abandon them with a reason before completing.`,
		userSystemPrompt: [
			"You are a senior developer completing the spaced repetition epic.",
			"You implemented the SM-2 algorithm and integrated it with the quiz engine. You have direct experience with the codebase.",
			"For learnings, reflect substantively on what you actually experienced: algorithm implementation details, design patterns that worked well, integration challenges, testing strategies.",
			"For architecture changes, evaluate whether they accurately describe the system as built. Approve accurate descriptions, reject ones that misrepresent the implementation.",
			"For artifact promotion, consider whether each artifact would genuinely help future work or is too project-specific to promote.",
			"For unfinished slices, decide based on whether they're critical to the epic's goal or can reasonably be deferred.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 200,
		maxBudgetUsd: 500,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "complete-epic", cost: result.sessionResult.totalCost });
		for (const e of result.sessionResult.cliErrors) ctx.allCliErrors.push({ skill: "complete-epic", error: e });
	}

	if (result.success) {
		logger.log("PASS: Epic completion skill completed");
		return true;
	}

	logger.log("FAIL: Epic completion did not complete successfully");
	return false;
}

// ─── Quality Proxy Metrics ──────────────────────────────────

interface MetricResult {
	name: string;
	passed: boolean;
	detail: string;
}

function checkArchitectureMetrics(fixtureDir: string): MetricResult {
	// Tests whether the create-epic pipeline produced a well-formed architecture:
	// 1. _overview.md exists at project level (created by init/onboard)
	// 2. Epic architecture directory exists with _overview.md (created by create-epic)
	// 3. CLI reports architecture files via status (proves CLI can discover them)
	// 4. Multiple architecture files produced (not just a single stub)

	const projectOverview = join(fixtureDir, ".goodplan", "architecture", "_overview.md");
	const projectOverviewOk = existsSync(projectOverview);

	// Check epic architecture directly (don't rely on activeEpic — it's null after complete-epic)
	const epicOverview = join(
		fixtureDir,
		".goodplan",
		"epics",
		EPIC_NAME,
		"architecture",
		"_overview.md",
	);
	const epicArchOk = existsSync(epicOverview);

	// CLI architecture file count from status
	const statusResult = gp(["status", "--json"], { cwd: fixtureDir, gpBin: GP_BIN });
	let cliFileCount = 0;
	if (statusResult.exitCode === 0) {
		try {
			const status = JSON.parse(statusResult.stdout) as {
				artifacts?: { architecture?: { count?: number } };
			};
			cliFileCount = status.artifacts?.architecture?.count ?? 0;
		} catch {
			// Parse failure handled by cliFileCount staying 0
		}
	}

	const multiFileOk = cliFileCount >= 2;
	const passed = projectOverviewOk && epicArchOk && multiFileOk;

	const checks = [
		`project _overview.md: ${projectOverviewOk ? "PASS" : "FAIL"}`,
		`epic _overview.md: ${epicArchOk ? "PASS" : "FAIL"}`,
		`CLI discovers ${cliFileCount} files (>= 2: ${multiFileOk ? "PASS" : "FAIL"})`,
	];

	return {
		name: "Architecture",
		passed,
		detail: checks.join(", "),
	};
}

function checkPlanMetrics(fixtureDir: string, epicName: string): MetricResult {
	// V2: plans are stored as ContentRef blobs, not files on disk.
	// Verify via CLI: slice:show --json returns a `plan` field with ContentRef
	// when the plan has been committed. Also check that the slice reached at
	// least P9 (plan committed), which proves plan-slice ran to completion.

	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	if (!existsSync(slicesDir)) {
		return { name: "Plan Structure", passed: false, detail: "slices/ directory not found" };
	}

	const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
		statSync(join(slicesDir, d)).isDirectory(),
	);

	if (sliceDirs.length === 0) {
		return { name: "Plan Structure", passed: false, detail: "No slice directories found" };
	}

	let planContentRefFound = false;
	let slicePhaseOk = false;
	let planContent = "";

	for (const sliceDir of sliceDirs) {
		const showResult = gp(["slice:show", "--epic", epicName, "--slice", sliceDir, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
		});
		if (showResult.exitCode !== 0) continue;

		try {
			const slice = JSON.parse(showResult.stdout) as {
				phase?: string;
				plan?: { sha?: string; path?: string };
			};

			// Plan ContentRef exists (proves plan was committed via CLI)
			if (slice.plan?.sha) {
				planContentRefFound = true;

				// Try to read plan content from the file path (skill may have left it on disk)
				const planPath = slice.plan.path
					? join(fixtureDir, ".goodplan", slice.plan.path)
					: null;
				if (planPath && existsSync(planPath)) {
					planContent = readFileSync(planPath, "utf-8");
				}
			}

			// Phase at or past P9 (plan committed) proves plan-slice completed
			const phaseNum = slice.phase ? Number.parseInt(slice.phase.replace(/^P/, ""), 10) : 0;
			if (phaseNum >= 9) {
				slicePhaseOk = true;
			}
		} catch {
			// Parse failure — continue checking other slices
		}

		if (planContentRefFound) break;
	}

	// File path check: if we got plan content, verify it references actual code
	const hasFilePaths = planContent.length > 0 && /\b(src|tests|lib)\/\S+\.\w+/m.test(planContent);

	const passed = planContentRefFound && slicePhaseOk;

	const details = [
		`plan ContentRef: ${planContentRefFound ? "PASS" : "FAIL"}`,
		`slice phase >= P9: ${slicePhaseOk ? "PASS" : "FAIL"}`,
		...(planContent.length > 0
			? [`references codebase paths: ${hasFilePaths ? "PASS" : "FAIL"}`]
			: []),
	];

	return {
		name: "Plan Structure",
		passed,
		detail: details.join(", "),
	};
}

function checkReviewMetrics(fixtureDir: string, epicName: string): MetricResult {
	// V2: Tests whether the review/refinement loop infrastructure worked.
	// 1. Slice reached at least P9 (plan committed after refinement) via CLI phase check
	// 2. Refinement events exist in the event log (reviewer-scored, refinement-converged)
	// We don't check for specific severity levels — a plan with no CRITICAL/IMPORTANT
	// issues is a good plan, not a failed review.

	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	if (!existsSync(slicesDir)) {
		return { name: "Review Loop", passed: false, detail: "slices/ directory not found" };
	}

	const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
		statSync(join(slicesDir, d)).isDirectory(),
	);

	// Check slice phase via CLI — any phase >= P9 proves plan refinement completed
	let slicePhaseOk = false;
	for (const sliceDir of sliceDirs) {
		const showResult = gp(["slice:show", "--epic", epicName, "--slice", sliceDir, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
		});
		if (showResult.exitCode === 0) {
			try {
				const slice = JSON.parse(showResult.stdout) as { phase?: string };
				const phaseNum = slice.phase ? Number.parseInt(slice.phase.replace(/^P/, ""), 10) : 0;
				if (phaseNum >= 9) {
					slicePhaseOk = true;
					break;
				}
			} catch {
				// Parse failure — continue checking other slices
			}
		}
	}

	// Check for refinement events in the epic event log
	let hasRefinementEvents = false;
	const eventsPath = join(fixtureDir, ".goodplan", "epics", epicName, "events.jsonl");
	if (existsSync(eventsPath)) {
		const eventsContent = readFileSync(eventsPath, "utf-8");
		// reviewer-scored proves reviewers ran; refinement-converged or convergence-overridden proves the loop completed
		hasRefinementEvents =
			eventsContent.includes("reviewer-scored") &&
			(eventsContent.includes("refinement-converged") || eventsContent.includes("convergence-overridden"));
	}

	const passed = slicePhaseOk && hasRefinementEvents;

	return {
		name: "Review Loop",
		passed,
		detail: `slice phase >= P9: ${slicePhaseOk ? "PASS" : "FAIL"}, refinement events: ${hasRefinementEvents ? "PASS" : "FAIL"}`,
	};
}

function checkImplementationMetrics(fixtureDir: string, epicName: string): MetricResult {
	const results: string[] = [];
	let allPassed = true;

	// Guard: verify a slice actually reached P10+ (implementation started).
	// Without this, the fixture's pre-existing code would make build/test pass
	// even if implement-slice didn't run or crashed.
	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	let implementationStarted = false;
	if (existsSync(slicesDir)) {
		for (const dir of readdirSync(slicesDir)) {
			if (!statSync(join(slicesDir, dir)).isDirectory()) continue;
			const phase = getSlicePhase(fixtureDir, epicName, dir);
			if (phaseNum(phase) >= 10) {
				implementationStarted = true;
				break;
			}
		}
	}

	if (!implementationStarted) {
		return {
			name: "Implementation",
			passed: false,
			detail: "No slice reached P10 (implementation-started) — build/test would be vacuous",
		};
	}
	results.push("phase >= P10: PASS");

	// bun build
	try {
		execFileSync("bun", ["build", "src/index.ts", "--outdir", "dist"], {
			cwd: fixtureDir,
			stdio: "pipe",
			encoding: "utf-8",
		});
		results.push("build: PASS");
	} catch {
		results.push("build: FAIL");
		allPassed = false;
	}

	// bun lint (biome)
	try {
		execFileSync("bun", ["run", "lint"], {
			cwd: fixtureDir,
			stdio: "pipe",
			encoding: "utf-8",
		});
		results.push("lint: PASS");
	} catch {
		results.push("lint: FAIL");
		allPassed = false;
	}

	// bun test
	try {
		execFileSync("bun", ["test"], {
			cwd: fixtureDir,
			stdio: "pipe",
			encoding: "utf-8",
		});
		results.push("test: PASS");
	} catch {
		results.push("test: FAIL");
		allPassed = false;
	}

	return {
		name: "Implementation",
		passed: allPassed,
		detail: results.join(", "),
	};
}

function checkLearningsMetrics(fixtureDir: string, epicName: string): MetricResult {
	// V2: Learnings are stored in two places:
	// 1. `learning-captured` events in project-scope events.jsonl (from gp learning:capture)
	// 2. `learnings` array in `slice-landed` event payloads in epic-scope events.jsonl
	// The v1 `learning:list` command reads learnings.jsonl which v2 skills don't write to.
	// So we read directly from event logs.

	const checks: string[] = [];
	let totalLearnings = 0;
	const sources = new Set<string>();

	// Check project-scope learning-captured events
	const projectEventsPath = join(fixtureDir, ".goodplan", "events.jsonl");
	if (existsSync(projectEventsPath)) {
		const lines = readFileSync(projectEventsPath, "utf-8")
			.split("\n")
			.filter((l) => l.trim().length > 0);
		for (const line of lines) {
			try {
				const event = JSON.parse(line) as { type: string; payload?: { summary?: string } };
				if (event.type === "learning-captured") {
					totalLearnings++;
					sources.add("project");
				}
			} catch {
				// Skip malformed lines
			}
		}
	}

	// Check epic-scope events for learnings in slice-landed payloads
	const epicEventsPath = join(fixtureDir, ".goodplan", "epics", epicName, "events.jsonl");
	if (existsSync(epicEventsPath)) {
		const lines = readFileSync(epicEventsPath, "utf-8")
			.split("\n")
			.filter((l) => l.trim().length > 0);
		for (const line of lines) {
			try {
				const event = JSON.parse(line) as {
					type: string;
					payload?: { learnings?: Array<{ summary?: string }> };
				};
				if (event.type === "slice-landed" && event.payload?.learnings) {
					const sliceLearnings = event.payload.learnings.length;
					totalLearnings += sliceLearnings;
					if (sliceLearnings > 0) sources.add("slice-landed");
				}
				if (event.type === "learning-captured") {
					totalLearnings++;
					sources.add("epic");
				}
			} catch {
				// Skip malformed lines
			}
		}
	}

	// Also check for completion/learnings.md files (written by completion-slice agent)
	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	if (existsSync(slicesDir)) {
		for (const dir of readdirSync(slicesDir)) {
			const learningsFile = join(slicesDir, dir, "completion", "learnings.md");
			if (existsSync(learningsFile)) {
				sources.add("completion-file");
				// Count learnings in the file (each ## heading is roughly one learning)
				const content = readFileSync(learningsFile, "utf-8");
				const headingCount = (content.match(/^##\s/gm) ?? []).length;
				if (headingCount > 0 && totalLearnings === 0) {
					totalLearnings += headingCount; // Only add if we didn't already count from events
				}
			}
		}
	}

	const countOk = totalLearnings >= 1;
	checks.push(`${totalLearnings} learnings found (>= 1: ${countOk ? "PASS" : "FAIL"})`);
	checks.push(`sources: ${sources.size > 0 ? [...sources].join(", ") : "none"}`);

	const passed = countOk;

	return {
		name: "Learnings",
		passed,
		detail: checks.join(", "),
	};
}

function checkCliErrorMetrics(
	cliErrors: Array<{ skill: string; error: CliError }>,
): MetricResult {
	// Tests whether skills are correctly sequencing CLI commands.
	// State machine errors (exit 3) indicate invalid transitions — the skill
	// tried to advance to a state the CLI didn't expect. These are the strongest
	// signal of skill/CLI misalignment. Validation errors (exit 2) indicate
	// malformed payloads. Both should be zero in a well-functioning pipeline.
	//
	// Internal errors (exit 1) may be environmental and are not penalized.
	const stateMachineErrors = cliErrors.filter((e) => e.error.exitCode === 3);
	const validationErrors = cliErrors.filter((e) => e.error.exitCode === 2);
	const actionableErrors = [...stateMachineErrors, ...validationErrors];

	const passed = actionableErrors.length === 0;

	const checks = [
		`total CLI errors: ${cliErrors.length}`,
		`state machine errors (exit 3): ${stateMachineErrors.length}`,
		`validation errors (exit 2): ${validationErrors.length}`,
	];

	return {
		name: "CLI Correctness",
		passed,
		detail: checks.join(", "),
	};
}

function checkOrchestratorDiscipline(artifactReadViolations: string[]): MetricResult {
	const ok = artifactReadViolations.length === 0;
	return {
		name: "Orchestrator Discipline",
		passed: ok,
		detail: ok
			? "No artifact read violations detected"
			: `${artifactReadViolations.length} violation(s): ${artifactReadViolations.slice(0, 3).join(", ")}`,
	};
}

// ─── LLM-Evaluated Quality Metrics ─────────────────────────
//
// These metrics use a single-turn Sonnet call to evaluate LLM output quality.
// They test whether the workflow produced meaningful artifacts, not just whether
// the pipeline ran. Each evaluates one link in the artifact chain:
//   Goal → Architecture → Plan → Implementation → Learnings

/** Read a git blob by SHA. Returns content or null if not found. */
function readBlob(cwd: string, sha: string): string | null {
	try {
		return execFileSync("git", ["cat-file", "-p", sha], {
			cwd,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {
		return null;
	}
}

/** Run a single-turn LLM evaluation and parse the JSON response. */
async function llmEvaluate<T>(prompt: string): Promise<T> {
	const session = query({
		prompt,
		options: {
			model: "claude-sonnet-4-5",
			maxTurns: 1,
			permissionMode: "bypassPermissions",
			allowDangerouslySkipPermissions: true,
			systemPrompt: "You are a code review evaluator. Respond only with the requested JSON. No markdown fences.",
		},
	});

	let resultText = "";
	for await (const message of session) {
		// The result message IS the SDKResultSuccess — message.result is the text string directly.
		if (message.type === "result" && message.subtype === "success") {
			resultText = (message as SDKResultSuccess).result;
		}
	}

	if (!resultText) {
		throw new Error("LLM evaluation returned empty result");
	}

	const jsonText = resultText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
	return JSON.parse(jsonText) as T;
}

/** Get epic data (goal, architecture, sliceSet SHAs) from CLI. */
function getEpicData(
	fixtureDir: string,
	epicName: string,
): { goal?: string; architectureTarget?: string; sliceSet?: string; pressureTest?: string } | null {
	const result = gp(["epic:show", "--epic", epicName, "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});
	if (result.exitCode !== 0) return null;
	try {
		const data = JSON.parse(result.stdout) as {
			goal?: { sha?: string };
			architectureTarget?: { sha?: string };
			sliceSet?: { sha?: string };
			pressureTest?: { sha?: string };
		};
		return {
			goal: data.goal?.sha,
			architectureTarget: data.architectureTarget?.sha,
			sliceSet: data.sliceSet?.sha,
			pressureTest: data.pressureTest?.sha,
		};
	} catch {
		return null;
	}
}

/**
 * LLM-evaluated: does the architecture address the epic goal?
 *
 * Tests create-epic's architecture phase. A good architecture should decompose
 * the goal into subsystems that cover the required functionality. A bad one
 * might be generic boilerplate or miss key requirements.
 */
async function checkArchitectureGoalAlignment(
	fixtureDir: string,
	epicName: string,
): Promise<MetricResult> {
	const epic = getEpicData(fixtureDir, epicName);
	if (!epic?.goal || !epic.architectureTarget) {
		return {
			name: "Architecture-Goal Alignment",
			passed: false,
			detail: `Missing artifacts: goal=${!!epic?.goal}, architecture=${!!epic?.architectureTarget}`,
		};
	}

	const goalContent = readBlob(fixtureDir, epic.goal);
	const archContent = readBlob(fixtureDir, epic.architectureTarget);
	if (!goalContent || !archContent) {
		return { name: "Architecture-Goal Alignment", passed: false, detail: "Failed to read blobs" };
	}

	try {
		logger.log("  [alignment] Running LLM evaluation...");
		const verdict = await llmEvaluate<{
			pass: boolean;
			reason: string;
			goal_requirements_covered: string[];
			goal_requirements_missed: string[];
		}>([
			"Evaluate whether an architecture document addresses an epic's goal.",
			"",
			"## Epic Goal",
			"```markdown",
			goalContent.slice(0, 4000),
			"```",
			"",
			"## Architecture",
			"```markdown",
			archContent.slice(0, 8000),
			"```",
			"",
			"## Task",
			"Does the architecture identify subsystems/modules that would address the goal's requirements?",
			"You are NOT judging architecture quality — only whether it addresses what the goal asks for.",
			"",
			"Respond with JSON:",
			'{ "pass": true/false, "reason": "one sentence", "goal_requirements_covered": ["req1", ...], "goal_requirements_missed": ["req2", ...] }',
			"",
			"Pass: architecture identifies components relevant to the goal's core requirements.",
			"Fail: architecture is generic boilerplate or misses the goal's key requirements entirely.",
		].join("\n"));

		const covered = verdict.goal_requirements_covered?.length ?? 0;
		const missed = verdict.goal_requirements_missed?.length ?? 0;
		return {
			name: "Architecture-Goal Alignment",
			passed: verdict.pass,
			detail: `${verdict.reason} (${covered} covered, ${missed} missed)`,
		};
	} catch (err) {
		return {
			name: "Architecture-Goal Alignment",
			passed: false,
			detail: `LLM error: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`,
		};
	}
}

/**
 * LLM-evaluated: are plan chunks concrete and verifiable?
 *
 * Tests plan-slice's drafting + refinement quality. A good plan has chunks with
 * specific file paths, concrete expected behaviors, and falsifiable verification
 * steps. A bad plan has vague chunks like "implement the feature".
 */
async function checkPlanSpecificity(
	fixtureDir: string,
	epicName: string,
): Promise<MetricResult> {
	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	if (!existsSync(slicesDir)) {
		return { name: "Plan Specificity", passed: false, detail: "No slices directory" };
	}

	const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
		statSync(join(slicesDir, d)).isDirectory(),
	);
	if (sliceDirs.length === 0) {
		return { name: "Plan Specificity", passed: false, detail: "No slice dirs" };
	}

	const sliceName = sliceDirs[0]!;
	const showResult = gp(["slice:show", "--epic", epicName, "--slice", sliceName, "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});
	if (showResult.exitCode !== 0) {
		return { name: "Plan Specificity", passed: false, detail: "slice:show failed" };
	}

	let planSha: string | undefined;
	try {
		const slice = JSON.parse(showResult.stdout) as { plan?: { sha?: string } };
		planSha = slice.plan?.sha;
	} catch {
		return { name: "Plan Specificity", passed: false, detail: "Failed to parse slice:show" };
	}

	if (!planSha) {
		return { name: "Plan Specificity", passed: false, detail: "No plan ContentRef" };
	}

	const planContent = readBlob(fixtureDir, planSha);
	if (!planContent) {
		return { name: "Plan Specificity", passed: false, detail: "Failed to read plan blob" };
	}

	try {
		logger.log("  [specificity] Running LLM evaluation...");
		const verdict = await llmEvaluate<{
			pass: boolean;
			reason: string;
			concrete_chunks: number;
			vague_chunks: number;
			has_file_paths: boolean;
			has_verification_steps: boolean;
		}>([
			"Evaluate whether an implementation plan has concrete, actionable chunks.",
			"",
			"## Plan",
			"```markdown",
			planContent.slice(0, 8000),
			"```",
			"",
			"## Task",
			"Judge whether the plan's chunks are specific enough to implement without guessing.",
			"",
			"Respond with JSON:",
			'{ "pass": true/false, "reason": "one sentence", "concrete_chunks": N, "vague_chunks": N, "has_file_paths": true/false, "has_verification_steps": true/false }',
			"",
			"A chunk is concrete if it names specific files/modules AND has a testable expected behavior.",
			"A chunk is vague if it says things like 'implement the feature' without specifics.",
			"",
			"Pass: majority of chunks are concrete, plan references specific file paths, and has verification steps.",
			"Fail: majority of chunks are vague, or plan lacks file paths and verification details.",
		].join("\n"));

		return {
			name: "Plan Specificity",
			passed: verdict.pass,
			detail: `${verdict.reason} (${verdict.concrete_chunks} concrete, ${verdict.vague_chunks} vague, paths=${verdict.has_file_paths}, verification=${verdict.has_verification_steps})`,
		};
	} catch (err) {
		return {
			name: "Plan Specificity",
			passed: false,
			detail: `LLM error: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`,
		};
	}
}

/**
 * LLM-evaluated: are learnings substantive and project-specific?
 *
 * Tests complete-epic's synthesis quality. Good learnings reference specific
 * implementation decisions, algorithms, or patterns from this project. Bad
 * learnings are generic ("testing is important", "plan before coding").
 */
async function checkLearningsSubstance(fixtureDir: string, epicName: string): Promise<MetricResult> {
	// V2: Collect learning texts from event payloads and completion files.
	const learningTexts: string[] = [];

	// 1. Read learnings from slice-landed event payloads
	const epicEventsPath = join(fixtureDir, ".goodplan", "epics", epicName, "events.jsonl");
	if (existsSync(epicEventsPath)) {
		const lines = readFileSync(epicEventsPath, "utf-8").split("\n").filter((l) => l.trim().length > 0);
		for (const line of lines) {
			try {
				const event = JSON.parse(line) as {
					type: string;
					payload?: { learnings?: Array<{ summary?: string }>; summary?: string };
				};
				if (event.type === "slice-landed" && event.payload?.learnings) {
					for (const l of event.payload.learnings) {
						if (l.summary) learningTexts.push(l.summary);
					}
				}
				if (event.type === "learning-captured" && event.payload?.summary) {
					learningTexts.push(event.payload.summary);
				}
			} catch {
				// Skip malformed
			}
		}
	}

	// 2. Read from completion/learnings.md files (written by completion-slice agent)
	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	if (existsSync(slicesDir)) {
		for (const dir of readdirSync(slicesDir)) {
			const learningsFile = join(slicesDir, dir, "completion", "learnings.md");
			if (existsSync(learningsFile)) {
				learningTexts.push(readFileSync(learningsFile, "utf-8").slice(0, 3000));
			}
		}
	}

	// 3. Read from epic-level completion/consolidated-learnings.md
	const consolidatedPath = join(fixtureDir, ".goodplan", "epics", epicName, "completion", "consolidated-learnings.md");
	if (existsSync(consolidatedPath)) {
		learningTexts.push(readFileSync(consolidatedPath, "utf-8").slice(0, 3000));
	}

	if (learningTexts.length === 0) {
		return { name: "Learnings Substance", passed: false, detail: "No learning content found in events or files" };
	}

	try {
		logger.log("  [substance] Running LLM evaluation...");
		const verdict = await llmEvaluate<{
			pass: boolean;
			reason: string;
			specific_count: number;
			generic_count: number;
			example_specific: string;
			example_generic: string;
		}>([
			"Evaluate whether project learnings are substantive and project-specific.",
			"",
			"## Context",
			"These learnings were captured after implementing SM-2 spaced repetition for a flashcard CLI app.",
			"",
			"## Learnings",
			learningTexts.map((t, i) => `### Learning ${i + 1}\n${t}`).join("\n\n"),
			"",
			"## Task",
			"Judge whether the learnings reflect actual implementation experience.",
			"",
			"Respond with JSON:",
			'{ "pass": true/false, "reason": "one sentence", "specific_count": N, "generic_count": N, "example_specific": "quote or paraphrase", "example_generic": "quote or paraphrase (empty string if none)" }',
			"",
			'A learning is specific if it references concrete decisions, algorithms, patterns, or files from this project (e.g., "SM-2 ease factor clamp at 1.3 prevents runaway difficulty").',
			'A learning is generic if it could apply to any project (e.g., "writing tests early catches bugs", "good architecture matters").',
			"",
			"Pass: at least half of learnings are project-specific.",
			"Fail: majority are generic boilerplate.",
		].join("\n"));

		return {
			name: "Learnings Substance",
			passed: verdict.pass,
			detail: `${verdict.reason} (${verdict.specific_count} specific, ${verdict.generic_count} generic)`,
		};
	} catch (err) {
		return {
			name: "Learnings Substance",
			passed: false,
			detail: `LLM error: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`,
		};
	}
}

/**
 * LLM-evaluated metric: does the implementation match the plan?
 *
 * Retrieves the plan content (via ContentRef SHA) and the git diff of source
 * files, then asks an LLM to judge whether the implementation addresses the
 * plan's chunks. The LLM returns structured JSON with a pass/fail verdict.
 *
 * This catches cases where implement-slice runs but produces code unrelated
 * to the plan — something deterministic metrics can't detect.
 */
async function checkPlanImplementationCoherence(
	fixtureDir: string,
	epicName: string,
): Promise<MetricResult> {
	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	if (!existsSync(slicesDir)) {
		return { name: "Plan-Implementation Coherence", passed: false, detail: "No slices directory" };
	}

	const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
		statSync(join(slicesDir, d)).isDirectory(),
	);
	if (sliceDirs.length === 0) {
		return { name: "Plan-Implementation Coherence", passed: false, detail: "No slice dirs found" };
	}

	// Get plan content from the first slice's ContentRef
	const sliceName = sliceDirs[0]!;
	const showResult = gp(["slice:show", "--epic", epicName, "--slice", sliceName, "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});

	if (showResult.exitCode !== 0) {
		return { name: "Plan-Implementation Coherence", passed: false, detail: "slice:show failed" };
	}

	let planSha: string | undefined;
	try {
		const slice = JSON.parse(showResult.stdout) as { plan?: { sha?: string } };
		planSha = slice.plan?.sha;
	} catch {
		return { name: "Plan-Implementation Coherence", passed: false, detail: "Failed to parse slice:show" };
	}

	if (!planSha) {
		return { name: "Plan-Implementation Coherence", passed: false, detail: "No plan ContentRef" };
	}

	// Read plan content from git blob
	let planContent: string;
	try {
		planContent = execFileSync("git", ["cat-file", "-p", planSha], {
			cwd: fixtureDir,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {
		return { name: "Plan-Implementation Coherence", passed: false, detail: "Failed to read plan blob" };
	}

	// Get the git diff of source files (what implement-slice actually changed).
	// Diff between the first commit (fixture skeleton) and current working tree.
	// This catches both committed and uncommitted changes from implement-slice.
	let diff: string;
	try {
		// Get the root commit (first commit = fixture skeleton)
		const rootCommit = execFileSync(
			"git",
			["rev-list", "--max-parents=0", "HEAD"],
			{ cwd: fixtureDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		).trim();

		diff = execFileSync(
			"git",
			["diff", "--stat", rootCommit, "--", "src/", "tests/"],
			{ cwd: fixtureDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
	} catch {
		diff = "(unable to get diff)";
	}

	// Also list all source files for context
	let sourceFiles: string;
	try {
		sourceFiles = execFileSync("find", ["src", "tests", "-name", "*.ts", "-type", "f"], {
			cwd: fixtureDir,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {
		sourceFiles = "(unable to list files)";
	}

	// Use a single-turn LLM call to evaluate coherence
	const evaluationPrompt = [
		"You are evaluating whether a code implementation matches its plan.",
		"",
		"## Plan",
		"```markdown",
		planContent.slice(0, 8000), // Cap to avoid excessive context
		"```",
		"",
		"## Source files after implementation",
		"```",
		sourceFiles.slice(0, 2000),
		"```",
		"",
		"## Git diff summary",
		"```",
		diff.slice(0, 3000),
		"```",
		"",
		"## Task",
		"Evaluate whether the implementation addresses the plan's chunks/phases.",
		"You are NOT checking code quality — only whether the implementation matches what the plan described.",
		"",
		"Respond with ONLY a JSON object (no markdown fences):",
		'{ "pass": true/false, "reason": "one sentence explanation", "chunks_addressed": ["chunk-id-1", ...], "chunks_missing": ["chunk-id-2", ...] }',
		"",
		"Pass criteria: at least one plan chunk has corresponding implementation files.",
		"Fail criteria: the implementation appears completely unrelated to the plan.",
	].join("\n");

	try {
		logger.log("  [coherence] Running LLM evaluation...");
		const verdict = await llmEvaluate<{
			pass: boolean;
			reason: string;
			chunks_addressed?: string[];
			chunks_missing?: string[];
		}>(evaluationPrompt);

		const addressed = verdict.chunks_addressed?.length ?? 0;
		const missing = verdict.chunks_missing?.length ?? 0;
		const detail = `${verdict.reason} (${addressed} chunks addressed, ${missing} missing)`;

		return {
			name: "Plan-Implementation Coherence",
			passed: verdict.pass,
			detail,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.log(`  [coherence] LLM evaluation failed: ${msg}`);
		return {
			name: "Plan-Implementation Coherence",
			passed: false,
			detail: `LLM evaluation error: ${msg.slice(0, 200)}`,
		};
	}
}

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const overallStart = Date.now();

	logger.log("=== validate-consolidated.ts ===");
	logger.log(`Model: ${MODEL}`);
	logger.log("Max iterations: uncapped (skills use built-in exit criteria)");
	logger.log(`Timestamp: ${new Date().toISOString()}`);

	// ─── Create Fixture ─────────────────────────────────────

	logger.log("\n[setup] Creating flashcard app fixture...");
	const fixtureDir = createFlashcardFixture();
	logger.log(`[setup] Fixture created at: ${fixtureDir}`);

	// Verify fixture builds before pipeline
	try {
		execFileSync("bun", ["build", "src/index.ts", "--outdir", "dist"], {
			cwd: fixtureDir,
			stdio: "pipe",
			encoding: "utf-8",
		});
		logger.log("[setup] Fixture builds successfully");
	} catch (err) {
		logger.log(
			`[setup] WARN: Fixture build failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	try {
		execFileSync("bun", ["test"], {
			cwd: fixtureDir,
			stdio: "pipe",
			encoding: "utf-8",
		});
		logger.log("[setup] Fixture tests pass");
	} catch (err) {
		logger.log(
			`[setup] WARN: Fixture tests failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	// ─── Run Pipeline ───────────────────────────────────────

	const ctx: PipelineContext = {
		fixtureDir,
		allToolCalls: [],
		allViolations: [],
		allArtifactReadViolations: [],
		allCliErrors: [],
		skillCosts: [],
	};

	const pipelineSteps = [
		{ name: "init", fn: () => stepInit(ctx) },
		{ name: "create-epic", fn: () => stepCreateEpic(ctx) },
		{ name: "activate-epic", fn: () => stepActivateEpic(ctx) },
		{ name: "plan-slice", fn: () => stepPlanSlice(ctx) },
		{ name: "implement-slice", fn: () => stepImplement(ctx) },
		{ name: "land-slice", fn: () => stepLandSlice(ctx) },
		{ name: "create-side-quest", fn: () => stepCreateSideQuest(ctx) },
		{ name: "audit", fn: () => stepAudit(ctx) },
		{ name: "complete-epic", fn: () => stepCompleteEpic(ctx) },
	];

	const pipelineResults: Array<{ name: string; passed: boolean }> = [];

	// Steps where failure means all downstream steps are invalid and would waste money.
	// If any of these fail, we stop the pipeline immediately.
	const CRITICAL_STEPS = new Set(["init", "create-epic", "activate-epic", "plan-slice", "implement-slice"]);

	for (const step of pipelineSteps) {
		logger.log(`\n>>> Starting pipeline step: ${step.name}`);
		try {
			const passed = await step.fn();
			pipelineResults.push({ name: step.name, passed });
			logger.log(`<<< Pipeline step ${step.name}: ${passed ? "PASS" : "FAIL"}`);

			if (!passed && CRITICAL_STEPS.has(step.name)) {
				logger.log(`\n!!! PIPELINE HALTED: ${step.name} is a critical dependency for all downstream steps`);
				break;
			}
		} catch (err) {
			logger.log(
				`<<< Pipeline step ${step.name}: ERROR -- ${err instanceof Error ? err.message : String(err)}`,
			);
			pipelineResults.push({ name: step.name, passed: false });

			if (CRITICAL_STEPS.has(step.name)) {
				logger.log(`\n!!! PIPELINE HALTED: ${step.name} errored and is a critical dependency`);
				break;
			}
		}
	}

	// ─── Quality Metrics ────────────────────────────────────

	logger.log("\n========================================");
	logger.log("QUALITY PROXY METRICS");
	logger.log("========================================\n");

	// Event log integrity check — catches corruption that individual metrics miss
	const verifyIntegrity = (): MetricResult => {
		const verifyResult = gp(["verify", "--json"], { cwd: fixtureDir, gpBin: GP_BIN });
		if (verifyResult.exitCode === 0) {
			try {
				const parsed = JSON.parse(verifyResult.stdout) as {
					status: string;
					eventsChecked: number;
					scopesChecked: number;
					issues: unknown[];
				};
				return {
					name: "Event Log Integrity",
					passed: parsed.status === "pass",
					detail: `${parsed.eventsChecked} events, ${parsed.scopesChecked} scopes, ${parsed.issues.length} issues`,
				};
			} catch {
				return { name: "Event Log Integrity", passed: false, detail: "Failed to parse verify output" };
			}
		}
		return { name: "Event Log Integrity", passed: false, detail: `gp verify exited ${verifyResult.exitCode}` };
	};

	// Deterministic metrics (pipeline correctness)
	const deterministicMetrics: MetricResult[] = [
		verifyIntegrity(),
		checkArchitectureMetrics(fixtureDir),
		checkPlanMetrics(fixtureDir, EPIC_NAME),
		checkReviewMetrics(fixtureDir, EPIC_NAME),
		checkImplementationMetrics(fixtureDir, EPIC_NAME),
		checkLearningsMetrics(fixtureDir, EPIC_NAME),
		checkOrchestratorDiscipline(ctx.allArtifactReadViolations),
		checkCliErrorMetrics(ctx.allCliErrors),
	];

	logger.log("  --- Deterministic (pipeline correctness) ---");
	for (const metric of deterministicMetrics) {
		logger.log(`  ${metric.passed ? "PASS" : "FAIL"}: ${metric.name} -- ${metric.detail}`);
	}

	// LLM-evaluated metrics (output quality)
	// These use Sonnet to evaluate whether the LLM produced meaningful artifacts.
	// Run sequentially to avoid concurrent API rate limits.
	logger.log("\n  --- LLM-Evaluated (output quality) ---");
	const llmMetrics: MetricResult[] = [];

	for (const check of [
		() => checkArchitectureGoalAlignment(fixtureDir, EPIC_NAME),
		() => checkPlanSpecificity(fixtureDir, EPIC_NAME),
		() => checkPlanImplementationCoherence(fixtureDir, EPIC_NAME),
		() => checkLearningsSubstance(fixtureDir, EPIC_NAME),
	]) {
		const result = await check();
		llmMetrics.push(result);
		logger.log(`  ${result.passed ? "PASS" : "FAIL"}: ${result.name} -- ${result.detail}`);
	}

	const metrics = [...deterministicMetrics, ...llmMetrics];

	// ─── Cost Summary ───────────────────────────────────────

	logger.log("\n========================================");
	logger.log("COST SUMMARY");
	logger.log("========================================\n");

	let totalCost = 0;
	for (const entry of ctx.skillCosts) {
		logger.log(`  ${entry.skill}: $${entry.cost.toFixed(4)}`);
		totalCost += entry.cost;
	}
	logger.log(`  ────────────`);
	logger.log(`  TOTAL: $${totalCost.toFixed(4)}`);

	if (totalCost > COST_THRESHOLD_USD) {
		logger.log(
			`  WARNING: Total cost $${totalCost.toFixed(2)} exceeds threshold $${COST_THRESHOLD_USD} -- possible context leak`,
		);
	}

	// ─── CLI Error Summary ──────────────────────────────────

	logger.log("\n========================================");
	logger.log("CLI ERRORS");
	logger.log("========================================\n");

	if (ctx.allCliErrors.length === 0) {
		logger.log("  No CLI errors detected");
	} else {
		// Group by skill
		const errorsBySkill = new Map<string, Array<CliError>>();
		for (const { skill, error } of ctx.allCliErrors) {
			const existing = errorsBySkill.get(skill) ?? [];
			existing.push(error);
			errorsBySkill.set(skill, existing);
		}

		for (const [skill, errors] of errorsBySkill) {
			logger.log(`  ${skill} (${errors.length} error${errors.length > 1 ? "s" : ""}):`);
			for (const e of errors) {
				const code = e.errorCode ? ` [${e.errorCode}]` : "";
				logger.log(`    exit ${e.exitCode}${code}: ${e.command.slice(0, 100)}`);
				if (e.errorMessage) {
					logger.log(`      ${e.errorMessage.slice(0, 150)}`);
				}
			}
		}

		// Breakdown by error type
		const stateMachineErrors = ctx.allCliErrors.filter((e) => e.error.exitCode === 3);
		const validationErrors = ctx.allCliErrors.filter((e) => e.error.exitCode === 2);
		const internalErrors = ctx.allCliErrors.filter((e) => e.error.exitCode === 1);
		const otherErrors = ctx.allCliErrors.filter(
			(e) => e.error.exitCode !== 1 && e.error.exitCode !== 2 && e.error.exitCode !== 3,
		);

		logger.log(`\n  Summary: ${ctx.allCliErrors.length} total`);
		if (stateMachineErrors.length > 0) logger.log(`    State machine errors (exit 3): ${stateMachineErrors.length}`);
		if (validationErrors.length > 0) logger.log(`    Validation errors (exit 2): ${validationErrors.length}`);
		if (internalErrors.length > 0) logger.log(`    Internal errors (exit 1): ${internalErrors.length}`);
		if (otherErrors.length > 0) logger.log(`    Other errors: ${otherErrors.length}`);
	}

	// ─── Violation Summary ──────────────────────────────────

	if (ctx.allViolations.length > 0) {
		logger.log("\n========================================");
		logger.log("STATE WRITE VIOLATIONS");
		logger.log("========================================\n");
		for (const v of ctx.allViolations) {
			logger.log(`  - ${v}`);
		}
	}

	// ─── Overall Summary ────────────────────────────────────

	const overallElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
	const allPipelinePassed = pipelineResults.every((r) => r.passed);
	const allMetricsPassed = metrics.every((m) => m.passed);

	logger.log("\n========================================");
	logger.log("OVERALL SUMMARY");
	logger.log("========================================\n");

	logger.log("Pipeline steps:");
	for (const r of pipelineResults) {
		logger.log(`  ${r.passed ? "PASS" : "FAIL"}: ${r.name}`);
	}

	logger.log("\nQuality metrics:");
	for (const m of metrics) {
		logger.log(`  ${m.passed ? "PASS" : "FAIL"}: ${m.name}`);
	}

	logger.log("\nCost per skill:");
	for (const entry of ctx.skillCosts) {
		const errors = ctx.allCliErrors.filter((e) => e.skill === entry.skill);
		const errorSuffix = errors.length > 0 ? ` (${errors.length} CLI error${errors.length > 1 ? "s" : ""})` : "";
		logger.log(`  ${entry.skill}: $${entry.cost.toFixed(4)}${errorSuffix}`);
	}

	logger.log(`\nElapsed: ${overallElapsed}s`);
	logger.log(`Total cost: $${totalCost.toFixed(4)}`);
	logger.log(`CLI errors: ${ctx.allCliErrors.length} (${ctx.allCliErrors.filter((e) => e.error.exitCode === 3).length} state machine, ${ctx.allCliErrors.filter((e) => e.error.exitCode === 2).length} validation)`);
	logger.log(`Pipeline: ${allPipelinePassed ? "ALL PASSED" : "SOME FAILED"}`);
	logger.log(`Metrics: ${allMetricsPassed ? "ALL PASSED" : "SOME FAILED"}`);
	logger.log(`Overall: ${allPipelinePassed && allMetricsPassed ? "SUCCESS" : "NEEDS ATTENTION"}`);
	logger.log(`\nLog file: ${LOG_FILE}`);
	logger.log(`Transcript: ${TRANSCRIPT_FILE}`);
	logger.log(`Fixture preserved at: ${fixtureDir}`);

	if (!allPipelinePassed || !allMetricsPassed) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
