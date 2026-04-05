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
	verifyEntityStatus,
} from "./utils";
import type { SkillSessionResult } from "./utils";

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

const COST_THRESHOLD_USD = 40;

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[validate-consolidated] Building plugin...");
try {
	execFileSync("bun", ["run", "build:plugin"], {
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

// ─── Load SKILL.md ──────────────────────────────────────────

function loadSkillBody(skillName: string): string {
	const skillMdPath = join(PLUGIN_DIR, "skills", skillName, "SKILL.md");
	if (!existsSync(skillMdPath)) {
		logger.log(`FATAL: ${skillName} SKILL.md not found in dist at ${skillMdPath}`);
		process.exit(1);
	}
	const skillContent = readFileSync(skillMdPath, "utf-8");
	// Strip frontmatter
	return skillContent.replace(/^---[\s\S]*?---\n/, "");
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
	const skillBody = loadSkillBody(opts.skillName);

	const simulatedUser = createSimulatedUser({
		cwd: opts.fixtureDir,
		systemPrompt: opts.userSystemPrompt,
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	let sessionResult: SkillSessionResult | undefined;
	let success = false;

	try {
		sessionResult = await runSkillSession({
			prompt: opts.prompt,
			options: {
				cwd: opts.fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: opts.maxTurns ?? 400,
				maxBudgetUsd: opts.maxBudgetUsd ?? 30,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: createTestEnv(PLUGIN_DIR),
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						`# ${opts.skillName} Skill Instructions`,
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

// ─── Pipeline Steps ─────────────────────────────────────────

interface PipelineContext {
	fixtureDir: string;
	allToolCalls: Array<{ toolName: string; input: unknown }>;
	allViolations: string[];
	allArtifactReadViolations: string[];
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
		maxBudgetUsd: 15,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "init", cost: result.sessionResult.totalCost });
	}

	// Verify .goodplan/ directory exists — no fallbacks
	const goodplanDir = join(ctx.fixtureDir, ".goodplan");
	if (existsSync(goodplanDir)) {
		logger.log("PASS: .goodplan/ directory created");
		return true;
	}

	logger.log("FAIL: .goodplan/ directory not created by /gp:init skill");
	return false;
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
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "create-epic", cost: result.sessionResult.totalCost });
	}

	// Verify epic reached slices-refined — the terminal state for create-epic.
	// No fallbacks or partial-success acceptance. If create-epic didn't complete
	// the full 6-phase pipeline, that's a real failure we need to see.
	const epicStatus = verifyEntityStatus("epic", EPIC_NAME, "slices-refined", {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});

	if (epicStatus.ok) {
		logger.log("PASS: Epic reached 'slices-refined' status");
		return true;
	}

	logger.log(`FAIL: Epic status is '${epicStatus.actual}' (expected 'slices-refined')`);
	logger.log("The create-epic skill did not complete the full pipeline.");
	return false;
}

/** Step 3: Activate epic — uses /gp:start-epic skill */
async function stepActivateEpic(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 3: /gp:start-epic");
	logger.log("========================================\n");

	const epicStatus = verifyEntityStatus("epic", EPIC_NAME, "activated", {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});

	if (epicStatus.actual === "activated") {
		logger.log("PASS: Epic already activated");
		return true;
	}

	// Epic should be in slices-refined (output of create-epic). Activate it via the skill.
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
		maxBudgetUsd: 10,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "start-epic", cost: result.sessionResult.totalCost });
	}

	const postStatus = verifyEntityStatus("epic", EPIC_NAME, "activated", {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});

	if (postStatus.actual === "activated") {
		logger.log("PASS: Epic activated via /gp:start-epic");
		return true;
	}

	logger.log(`FAIL: Epic at '${postStatus.actual}' after start-epic (expected 'activated')`);
	return false;
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
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "plan-slice", cost: result.sessionResult.totalCost });
	}

	// Verify plan file exists
	const planDir = join(slicesDir, sliceName);
	if (existsSync(planDir)) {
		const planFiles = readdirSync(planDir).filter((f: string) => f.includes("plan"));
		if (planFiles.length > 0) {
			logger.log(`PASS: Plan file(s) created: ${planFiles.join(", ")}`);
			return true;
		}
	}

	logger.log("FAIL: No plan file found after plan-slice");
	return false;
}

/** Step 5: /gp:implement */
async function stepImplement(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 5: /gp:implement");
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
		skillName: "implement",
		prompt: `Implement the plan for slice "${sliceName}" in epic "${EPIC_NAME}". Follow the plan phases and write the code.`,
		userSystemPrompt: [
			"You are a senior TypeScript developer implementing SM-2 spaced repetition.",
			"You care about code quality: pure functions for the SM-2 algorithm, proper TypeScript types, and comprehensive test coverage with known input/output pairs.",
			"Evaluate proposals and code review findings based on your experience. Approve good approaches, push back on questionable ones.",
			"You know the project uses Bun for runtime and testing, Biome for linting, and TypeScript strict mode.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 400,
		maxBudgetUsd: 30,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "implement", cost: result.sessionResult.totalCost });
	}

	if (result.success) {
		logger.log("PASS: Implementation skill completed");
		return true;
	}

	logger.log("FAIL: Implementation skill did not complete successfully");
	return false;
}

/** Step 6: /gp:create-side-quest */
async function stepCreateSideQuest(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 6: /gp:create-side-quest");
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
		maxBudgetUsd: 15,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "create-side-quest", cost: result.sessionResult.totalCost });
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
	logger.log("STEP 7: /gp:audit (architecture)");
	logger.log("========================================\n");

	const result = await runSkill({
		skillName: "audit",
		prompt: "Run /gp:audit architecture. Analyze the project architecture and report findings.",
		userSystemPrompt: [
			"You are a senior developer auditing the architecture of a flashcard app with spaced repetition.",
			"You want to audit the architecture specifically — you're concerned about whether the module boundaries and dependency structure are sound.",
			"For side quests proposed from findings: approve ones that address real structural gaps or missing functionality. Decline purely cosmetic improvements.",
			"Evaluate findings based on their actual impact on the codebase, not just their severity label.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 200,
		maxBudgetUsd: 15,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "audit", cost: result.sessionResult.totalCost });
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
	logger.log("STEP 8: /gp:complete-epic");
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
		maxBudgetUsd: 15,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.allArtifactReadViolations.push(...result.sessionResult.artifactReadViolations);
		ctx.skillCosts.push({ skill: "complete-epic", cost: result.sessionResult.totalCost });
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
	const overviewPath = join(fixtureDir, ".goodplan", "architecture", "_overview.md");
	if (!existsSync(overviewPath)) {
		return { name: "Architecture", passed: false, detail: "_overview.md not found" };
	}

	const content = readFileSync(overviewPath, "utf-8");
	const charCount = content.length;
	const headingCount = (content.match(/^## /gm) ?? []).length;

	const charOk = charCount >= 500;
	const headingOk = headingCount >= 3;
	const passed = charOk && headingOk;

	return {
		name: "Architecture",
		passed,
		detail: `${charCount} chars (>= 500: ${charOk ? "PASS" : "FAIL"}), ${headingCount} ## headings (>= 3: ${headingOk ? "PASS" : "FAIL"})`,
	};
}

function checkPlanMetrics(fixtureDir: string, epicName: string): MetricResult {
	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	if (!existsSync(slicesDir)) {
		return { name: "Plan Structure", passed: false, detail: "slices/ directory not found" };
	}

	// Find any plan file in any slice
	let planContent = "";
	let planFound = false;
	const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
		statSync(join(slicesDir, d)).isDirectory(),
	);

	for (const sliceDir of sliceDirs) {
		const slicePath = join(slicesDir, sliceDir);
		const candidates = ["plan-refined.md", "plan-created.md", "plan.md"];
		for (const candidate of candidates) {
			const candidatePath = join(slicePath, candidate);
			if (existsSync(candidatePath)) {
				planContent = readFileSync(candidatePath, "utf-8");
				planFound = true;
				break;
			}
		}
		if (planFound) break;
	}

	if (!planFound) {
		return { name: "Plan Structure", passed: false, detail: "No plan file found in any slice" };
	}

	// Match phase headings at any markdown level (## Phase 1, ### Phase 2, etc.)
	// Require "Phase" followed by a digit to avoid false matches like "Phased Rollout"
	const phaseCount = (planContent.match(/^#{1,6}\s+Phase\s+\d/gm) ?? []).length;
	const hasFilePaths = /\b(src|tests|lib)\/\S+\.\w+/m.test(planContent);
	const contentLength = planContent.length;
	const contentOk = contentLength >= 500;
	// Check for verification criteria (Expected Behavior, expected behavior checks, Verification, etc.)
	const hasVerification = /expected behavior|verification|before.*implementation|after.*implementation/im.test(planContent);

	const phaseOk = phaseCount >= 2;
	const pathOk = hasFilePaths;
	const passed = phaseOk && pathOk && contentOk && hasVerification;

	const details = [
		`${phaseCount} phases (>= 2: ${phaseOk ? "PASS" : "FAIL"})`,
		`file paths: ${pathOk ? "PASS" : "FAIL"}`,
		`${contentLength} chars (>= 500: ${contentOk ? "PASS" : "FAIL"})`,
		`verification criteria: ${hasVerification ? "PASS" : "FAIL"}`,
	];

	return {
		name: "Plan Structure",
		passed,
		detail: details.join(", "),
	};
}

function checkReviewMetrics(fixtureDir: string, epicName: string): MetricResult {
	const slicesDir = join(fixtureDir, ".goodplan", "epics", epicName, "slices");
	if (!existsSync(slicesDir)) {
		return { name: "Review Severity", passed: false, detail: "slices/ directory not found" };
	}

	// Check plan-refined or transcript for IMPORTANT/CRITICAL
	let foundSeverity = false;
	const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
		statSync(join(slicesDir, d)).isDirectory(),
	);

	for (const sliceDir of sliceDirs) {
		const refinedPath = join(slicesDir, sliceDir, "plan-refined.md");
		const refiningPath = join(slicesDir, sliceDir, "plan-refining.md");

		for (const path of [refinedPath, refiningPath]) {
			if (existsSync(path)) {
				const content = readFileSync(path, "utf-8");
				if (/IMPORTANT|CRITICAL/i.test(content)) {
					foundSeverity = true;
					break;
				}
			}
		}
		if (foundSeverity) break;
	}

	// Also check transcript for severity mentions
	if (!foundSeverity && existsSync(TRANSCRIPT_FILE)) {
		try {
			const transcript = readFileSync(TRANSCRIPT_FILE, "utf-8");
			foundSeverity = /IMPORTANT|CRITICAL/i.test(transcript);
		} catch {
			// Ignore transcript read failures
		}
	}

	return {
		name: "Review Severity",
		passed: foundSeverity,
		detail: foundSeverity
			? "IMPORTANT/CRITICAL severity found in plan artifacts or transcript"
			: "No IMPORTANT/CRITICAL severity found (may indicate shallow review)",
	};
}

function checkImplementationMetrics(fixtureDir: string): MetricResult {
	const results: string[] = [];
	let allPassed = true;

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

function checkLearningsMetrics(fixtureDir: string): MetricResult {
	const learningsResult = gp(["learning:list", "--json"], {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});

	if (learningsResult.exitCode !== 0) {
		return { name: "Learnings", passed: false, detail: "gp learning:list failed" };
	}

	let learnings: Array<{ summary?: string; detail?: string; file?: string }>;
	try {
		const parsed = JSON.parse(learningsResult.stdout) as
			| { items: Array<{ summary?: string; detail?: string; file?: string }> }
			| Array<{ summary?: string; detail?: string; file?: string }>;
		learnings = Array.isArray(parsed) ? parsed : (parsed.items ?? []);
	} catch {
		return {
			name: "Learnings",
			passed: false,
			detail: "Could not parse learning:list JSON output",
		};
	}

	const count = learnings.length;
	const countOk = count >= 2;

	let allLong = true;
	let shortCount = 0;
	for (const learning of learnings) {
		const text = learning.detail ?? learning.summary ?? "";
		if (text.length < 100) {
			allLong = false;
			shortCount++;
		}
	}

	const passed = countOk && allLong;
	const detail = `${count} learnings (>= 2: ${countOk ? "PASS" : "FAIL"}), ${shortCount > 0 ? `${shortCount} under 100 chars` : "all >= 100 chars"}`;

	// Diagnostic: warn if 0 learnings after epic completion (may indicate epic:complete didn't roll up)
	if (count === 0) {
		console.warn(
			"  WARNING: 0 learnings found after epic:complete — learnings rollup may not be working",
		);
	}

	return {
		name: "Learnings",
		passed,
		detail,
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
		skillCosts: [],
	};

	const pipelineSteps = [
		{ name: "init", fn: () => stepInit(ctx) },
		{ name: "create-epic", fn: () => stepCreateEpic(ctx) },
		{ name: "activate-epic", fn: () => stepActivateEpic(ctx) },
		{ name: "plan-slice", fn: () => stepPlanSlice(ctx) },
		{ name: "implement", fn: () => stepImplement(ctx) },
		{ name: "create-side-quest", fn: () => stepCreateSideQuest(ctx) },
		{ name: "audit", fn: () => stepAudit(ctx) },
		{ name: "complete-epic", fn: () => stepCompleteEpic(ctx) },
	];

	const pipelineResults: Array<{ name: string; passed: boolean }> = [];

	for (const step of pipelineSteps) {
		logger.log(`\n>>> Starting pipeline step: ${step.name}`);
		try {
			const passed = await step.fn();
			pipelineResults.push({ name: step.name, passed });
			logger.log(`<<< Pipeline step ${step.name}: ${passed ? "PASS" : "FAIL"}`);
		} catch (err) {
			logger.log(
				`<<< Pipeline step ${step.name}: ERROR -- ${err instanceof Error ? err.message : String(err)}`,
			);
			pipelineResults.push({ name: step.name, passed: false });
		}
	}

	// ─── Quality Metrics ────────────────────────────────────

	logger.log("\n========================================");
	logger.log("QUALITY PROXY METRICS");
	logger.log("========================================\n");

	const metrics: MetricResult[] = [
		checkArchitectureMetrics(fixtureDir),
		checkPlanMetrics(fixtureDir, EPIC_NAME),
		checkReviewMetrics(fixtureDir, EPIC_NAME),
		checkImplementationMetrics(fixtureDir),
		checkLearningsMetrics(fixtureDir),
		checkOrchestratorDiscipline(ctx.allArtifactReadViolations),
	];

	for (const metric of metrics) {
		logger.log(`  ${metric.passed ? "PASS" : "FAIL"}: ${metric.name} -- ${metric.detail}`);
	}

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

	logger.log(`\nElapsed: ${overallElapsed}s`);
	logger.log(`Total cost: $${totalCost.toFixed(4)}`);
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
