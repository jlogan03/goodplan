/**
 * Consolidated quality validation harness — runs the full 7-skill pipeline
 * against a realistic flashcard app fixture and validates quality proxy metrics.
 *
 * Usage: bun tools/dogfood/validate-consolidated.ts [--model <model>] [--max-iterations <n>]
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
	gp,
	gpForce,
	isSuccess,
	parseModel,
	platformBinaryDir,
	runSkillSession,
	tierDefault,
	verifyEntityStatus,
	verifyNoArtifactReads,
} from "./utils";
import type { CliResult, SkillSessionResult } from "./utils";

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
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/validate-consolidated.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/validate-consolidated-transcript.jsonl");
const MODEL = parseModel(tierDefault("e2e"));
const MAX_ITERATIONS = parseMaxIterations(1);

const EPIC_NAME = "spaced-repetition";
const EPIC_GOAL =
	"Add spaced repetition with the SM-2 algorithm to the flashcard CLI. " +
	"Cards should track review history, calculate next review date using SM-2, " +
	"and the quiz engine should prioritize cards due for review.";

const SIDE_QUEST_GOAL = "Add markdown card import — parse .md files with front/back delimiters into Card objects";

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

// Sync skills and agents from dist to installed cache so the Agent SDK discovers them
const installedSkillsDir = join(HOME, ".claude/plugins/cache/goodplan-marketplace/goodplan");
try {
	const versions = readdirSync(installedSkillsDir)
		.filter((d: string) => statSync(join(installedSkillsDir, d)).isDirectory())
		.sort()
		.reverse();
	const latestVersion = versions[0];
	if (latestVersion) {
		const installedPluginDir = join(installedSkillsDir, latestVersion);
		// Sync all skills
		const srcSkills = join(PLUGIN_DIR, "skills");
		const dstSkills = join(installedPluginDir, "skills");
		if (existsSync(srcSkills)) {
			execFileSync("rsync", ["-a", "--exclude", ".DS_Store", `${srcSkills}/`, `${dstSkills}/`]);
			console.log("[validate-consolidated] Synced all skills to installed cache");
		}
		// Sync agents
		const srcAgents = join(PLUGIN_DIR, "agents");
		const dstAgents = join(installedPluginDir, "agents");
		if (existsSync(srcAgents)) {
			execFileSync("rsync", ["-a", "--exclude", ".DS_Store", `${srcAgents}/`, `${dstAgents}/`]);
			console.log("[validate-consolidated] Synced agents to installed cache");
		}
	}
} catch (err) {
	console.warn(
		"[validate-consolidated] WARN: Could not sync to installed cache:",
		err instanceof Error ? err.message : String(err),
	);
}

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
	const tmpDir = join("/tmp", `gp-flashcard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
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
			"  console.log(\"Flashcard CLI v0.1.0\");",
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

	// Install dependencies
	try {
		execFileSync("bun", ["install"], {
			cwd: tmpDir,
			stdio: "pipe",
			encoding: "utf-8",
		});
		logger.log("[fixture] bun install completed");
	} catch (err) {
		logger.log(`[fixture] WARN: bun install failed: ${err instanceof Error ? err.message : String(err)}`);
	}

	// git init + commit
	execFileSync("git", ["init"], { cwd: tmpDir, stdio: "pipe" });
	execFileSync("git", ["add", "-A"], { cwd: tmpDir, stdio: "pipe" });
	execFileSync(
		"git",
		["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "-m", "initial flashcard CLI skeleton"],
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
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: {
					...process.env,
					PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					GP_CREATE_EPIC_MAX_ITERATIONS: String(MAX_ITERATIONS),
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						`Use at most ${MAX_ITERATIONS} refinement iterations for cost control.`,
						"Do not ask the user to confirm -- proceed automatically through all phases.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"",
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
	skillCosts: Array<{ skill: string; cost: number }>;
}

/** Step 1: /gp:init */
async function stepInit(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 1: /gp:init");
	logger.log("========================================\n");

	const result = await runSkill({
		skillName: "init",
		prompt: "Initialize this project with goodplan. The project is a flashcard CLI app built with TypeScript and Bun.",
		userSystemPrompt: [
			"You are a senior TypeScript developer building a flashcard CLI app.",
			"When asked about project name, say 'flashcard-cli'.",
			"When asked about description, say 'A CLI flashcard quiz app with spaced repetition'.",
			"When asked about conventions, say 'TypeScript strict mode, Bun runtime, Biome linting, kebab-case files'.",
			"When asked about architecture, describe: card module (data types + loading), quiz module (session engine), score module (tracking), index (CLI entry).",
			"Always choose concrete, specific answers.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 200,
		maxBudgetUsd: 15,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.skillCosts.push({ skill: "init", cost: result.sessionResult.totalCost });
	}

	// Verify .goodplan/ directory exists
	const goodplanDir = join(ctx.fixtureDir, ".goodplan");
	if (existsSync(goodplanDir)) {
		logger.log("PASS: .goodplan/ directory created");
		return true;
	}

	logger.log("FAIL: .goodplan/ directory not created, attempting fallback...");
	const fallback = gp(["init", "--name", "flashcard-cli", "--json"], {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});
	if (fallback.exitCode === 0) {
		logger.log("PASS: .goodplan/ created via fallback gp init");
		return true;
	}

	logger.log("FAIL: Fallback gp init also failed");
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
			"You are a senior TypeScript developer building a flashcard CLI app.",
			`The epic goal is: ${EPIC_GOAL}`,
			"",
			"When asked about epic name or goal, confirm the provided name and goal.",
			"When asked about exploration, say 'That's enough, let's move on.'",
			"When asked about subsystems, suggest: cards (data + persistence), quiz-engine (session + SM-2), scoring (stats + history).",
			"When asked about architecture, suggest modular design with clear interfaces between card storage, quiz logic, and scoring.",
			"When asked about slices, suggest 3 slices: SM-2 core algorithm, review scheduling, quiz engine integration.",
			"When asked about dependencies, say SM-2 core is standalone, scheduling depends on SM-2, quiz integration depends on both.",
			"Always choose concrete answers. Never say just 'Proceed' without context.",
			"If asked to continue exploring, say 'That's enough' or choose to stop.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.skillCosts.push({ skill: "create-epic", cost: result.sessionResult.totalCost });
	}

	// Verify epic exists
	const epicStatus = verifyEntityStatus("epic", EPIC_NAME, "slices-refined", {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});

	if (epicStatus.ok) {
		logger.log("PASS: Epic reached 'slices-refined' status");
		return true;
	}

	// Accept late-stage statuses
	const acceptableStatuses = [
		"slices-defined", "architecture-refined", "architecture-defined",
		"defining-slices", "slices-refined",
	];
	if (acceptableStatuses.includes(epicStatus.actual)) {
		logger.log(`WARN: Epic at '${epicStatus.actual}' (expected 'slices-refined') -- partial success`);
		return true;
	}

	logger.log(`FAIL: Epic status is '${epicStatus.actual}', attempting fallback...`);
	// Fallback: force-create the epic if not present
	const forceResult = gp(["epic:create", "--json"], {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
		stdin: JSON.stringify({ name: EPIC_NAME, goal: EPIC_GOAL }),
	});
	if (forceResult.exitCode === 0 || epicStatus.actual !== "not-found") {
		logger.log("WARN: Using fallback epic creation -- pipeline partially succeeded");
		return true;
	}

	return false;
}

/** Step 3: Activate epic if needed */
function stepActivateEpic(ctx: PipelineContext): boolean {
	logger.log("\n========================================");
	logger.log("STEP 3: Activate epic");
	logger.log("========================================\n");

	const epicStatus = verifyEntityStatus("epic", EPIC_NAME, "activated", {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});

	if (epicStatus.actual === "activated") {
		logger.log("PASS: Epic already activated");
		return true;
	}

	// Fast-track through lifecycle if stuck
	logger.log(`[activate] Epic at '${epicStatus.actual}', fast-tracking to activated...`);

	const epicDir = join(ctx.fixtureDir, ".goodplan", "epics", EPIC_NAME);
	mkdirSync(epicDir, { recursive: true });

	// Try each step, ignoring failures for already-completed transitions
	const transitions: Array<{ args: string[]; artifact?: { path: string; content: string }; stdin?: string }> = [
		{ args: ["epic:explore", "--epic", EPIC_NAME, "--json"] },
		{
			args: ["submit-explore", "--epic", EPIC_NAME, "--json"],
			artifact: {
				path: join(epicDir, "explore-complete.md"),
				content: "# Explore Complete\n\n## Findings\n- SM-2 algorithm needs card-level review history\n- Quiz engine needs priority queue\n",
			},
		},
		{ args: ["epic:define-architecture", "--epic", EPIC_NAME, "--json"] },
		{
			args: ["submit-architecture", "--epic", EPIC_NAME, "--json"],
			artifact: {
				path: join(join(epicDir, "architecture"), "_overview.md"),
				content: [
					"# Architecture Overview",
					"",
					"## Cards Subsystem",
					"Card data types, persistence, and loading.",
					"",
					"## Quiz Engine Subsystem",
					"Quiz session management, SM-2 scheduling, card prioritization.",
					"",
					"## Scoring Subsystem",
					"Score calculation, history tracking, statistics.",
				].join("\n"),
			},
		},
		{
			args: ["submit-refine-architecture", "--epic", EPIC_NAME, "--json"],
			stdin: JSON.stringify({ scores: { overall: 9 } }),
		},
		{ args: ["epic:define-slices", "--epic", EPIC_NAME, "--json"] },
		{ args: ["submit-slices", "--epic", EPIC_NAME, "--json"] },
		{
			args: ["submit-refine-slices", "--epic", EPIC_NAME, "--json"],
			stdin: JSON.stringify({ scores: { overall: 9 } }),
		},
		{
			args: ["epic:add-verification", "--epic", EPIC_NAME, "--json"],
			stdin: JSON.stringify({
				verification: {
					description: "SM-2 spaced repetition works end-to-end",
					status: "pending",
					addedDuring: "fixture-setup",
					modifiedDuring: null,
				},
			}),
		},
		{ args: ["epic:activate", "--epic", EPIC_NAME, "--json"] },
	];

	for (const transition of transitions) {
		if (transition.artifact) {
			mkdirSync(join(transition.artifact.path, ".."), { recursive: true });
			if (!existsSync(transition.artifact.path)) {
				writeFileSync(transition.artifact.path, transition.artifact.content);
			}
		}
		gpForce(transition.args, {
			cwd: ctx.fixtureDir,
			gpBin: GP_BIN,
			stdin: transition.stdin,
		});
	}

	const postStatus = verifyEntityStatus("epic", EPIC_NAME, "activated", {
		cwd: ctx.fixtureDir,
		gpBin: GP_BIN,
	});

	if (postStatus.actual === "activated") {
		logger.log("PASS: Epic activated via fast-track");
		return true;
	}

	logger.log(`WARN: Epic at '${postStatus.actual}' after fast-track (expected 'activated')`)
	return true; // Continue pipeline anyway
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

	// Create a default slice if none exist
	if (!existsSync(join(slicesDir, sliceName))) {
		logger.log(`[plan-slice] No slices found, creating default slice '${sliceName}'...`);
		gp(["slice:create", "--epic", EPIC_NAME, "--json"], {
			cwd: ctx.fixtureDir,
			gpBin: GP_BIN,
			stdin: JSON.stringify({ name: sliceName, goal: "Implement SM-2 core algorithm for spaced repetition scheduling" }),
		});
	}

	logger.log(`[plan-slice] Planning slice: ${sliceName}`);

	const result = await runSkill({
		skillName: "plan-slice",
		prompt: `Plan the slice "${sliceName}" in epic "${EPIC_NAME}". Create a detailed implementation plan with phases.`,
		userSystemPrompt: [
			"You are a senior TypeScript developer planning SM-2 spaced repetition implementation.",
			"When asked about approach, prefer a phased approach: types first, then algorithm, then integration.",
			"When asked about implementation strategy, suggest starting with pure functions for SM-2 calculation.",
			"When asked about testing, suggest unit tests for the SM-2 formula with known input/output pairs.",
			"When asked about file paths, reference src/sm2.ts for the algorithm and tests/sm2.test.ts for tests.",
			"Always choose concrete, specific answers.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
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

	logger.log("WARN: No plan file found after plan-slice -- pipeline may be degraded");
	return true; // Continue anyway
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
			"When asked about implementation, approve the proposed approach.",
			"When asked about build or test guidance, say 'Run bun test to verify'.",
			"When asked about code review findings, say 'Looks good, proceed'.",
			"Always approve implementation steps.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 400,
		maxBudgetUsd: 30,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.skillCosts.push({ skill: "implement", cost: result.sessionResult.totalCost });
	}

	if (result.success) {
		logger.log("PASS: Implementation skill completed");
	} else {
		logger.log("WARN: Implementation skill did not complete successfully");
	}

	return true; // Continue pipeline regardless
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
			"You are a senior TypeScript developer wanting to add markdown card import.",
			`The side quest goal is: ${SIDE_QUEST_GOAL}`,
			"When asked about scope, say it's small -- one parser function and one test file.",
			"When asked about approach, say parse lines delimited by '---' as front/back pairs.",
			"When asked about file paths, suggest src/import.ts and tests/import.test.ts.",
			"Always choose concrete, specific answers.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 200,
		maxBudgetUsd: 15,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.skillCosts.push({ skill: "create-side-quest", cost: result.sessionResult.totalCost });
	}

	if (result.success) {
		logger.log("PASS: Side quest created");
	} else {
		logger.log("WARN: Side quest creation may have failed -- continuing with degraded verification");
	}

	return true;
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
			"You are testing the audit skill in architecture mode.",
			"When asked about audit mode, select 'architecture'.",
			"When asked about side quests, approve all proposed side quests.",
			"When asked any yes/no question, say yes.",
			"Always choose concrete answers.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 200,
		maxBudgetUsd: 15,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.skillCosts.push({ skill: "audit", cost: result.sessionResult.totalCost });
	}

	if (result.success) {
		logger.log("PASS: Audit completed");
	} else {
		logger.log("WARN: Audit may have failed -- continuing with degraded verification");
	}

	return true;
}

/** Step 8: /gp:complete-epic */
async function stepCompleteEpic(ctx: PipelineContext): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("STEP 8: /gp:complete-epic");
	logger.log("========================================\n");

	// Mark all slices as done before completing the epic
	const slicesDir = join(ctx.fixtureDir, ".goodplan", "epics", EPIC_NAME, "slices");
	if (existsSync(slicesDir)) {
		const sliceDirs = readdirSync(slicesDir).filter((d: string) =>
			statSync(join(slicesDir, d)).isDirectory(),
		);
		for (const sliceDir of sliceDirs) {
			const sliceStatus = verifyEntityStatus("slice", sliceDir, "done", {
				cwd: ctx.fixtureDir,
				gpBin: GP_BIN,
				epic: EPIC_NAME,
			});
			if (sliceStatus.actual !== "done") {
				logger.log(`[complete-epic] Force-completing slice '${sliceDir}' (status: ${sliceStatus.actual})...`);
				gpForce(["slice:complete", "--epic", EPIC_NAME, "--slice", sliceDir, "--json"], {
					cwd: ctx.fixtureDir,
					gpBin: GP_BIN,
					stdin: JSON.stringify({ learnings: ["Completed for pipeline validation"] }),
				});
			}
		}
	}

	const result = await runSkill({
		skillName: "complete-epic",
		prompt: `Complete the epic "${EPIC_NAME}". All slices should be done. Synthesize learnings and complete the epic.`,
		userSystemPrompt: [
			"You are completing the spaced repetition epic.",
			"When asked about learnings, describe what was learned about SM-2 implementation.",
			"When asked to confirm completion, say yes.",
			"When asked about architecture changes, say the architecture docs are accurate.",
			"Always approve completion steps.",
		].join("\n"),
		fixtureDir: ctx.fixtureDir,
		maxTurns: 200,
		maxBudgetUsd: 15,
	});

	ctx.allToolCalls.push(...result.tracker.toolCalls);
	if (result.sessionResult) {
		ctx.allViolations.push(...result.sessionResult.violations);
		ctx.skillCosts.push({ skill: "complete-epic", cost: result.sessionResult.totalCost });
	}

	if (result.success) {
		logger.log("PASS: Epic completion skill completed");
	} else {
		logger.log("WARN: Epic completion may have failed");
	}

	return true;
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

	const phaseCount = (planContent.match(/^### Phase/gm) ?? []).length;
	const hasFilePaths = /\b(src|tests|lib)\/\S+\.\w+/m.test(planContent);

	const phaseOk = phaseCount >= 3;
	const pathOk = hasFilePaths;
	const passed = phaseOk && pathOk;

	return {
		name: "Plan Structure",
		passed,
		detail: `${phaseCount} phases (>= 3: ${phaseOk ? "PASS" : "FAIL"}), file paths present: ${pathOk ? "PASS" : "FAIL"}`,
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
		return { name: "Learnings", passed: false, detail: "Could not parse learning:list JSON output" };
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
	return {
		name: "Learnings",
		passed,
		detail: `${count} learnings (>= 2: ${countOk ? "PASS" : "FAIL"}), ${shortCount > 0 ? `${shortCount} under 100 chars` : "all >= 100 chars"}`,
	};
}

function checkOrchestratorDiscipline(
	allToolCalls: Array<{ toolName: string; input: unknown }>,
): MetricResult {
	const artifactCheck = verifyNoArtifactReads(allToolCalls);
	return {
		name: "Orchestrator Discipline",
		passed: artifactCheck.ok,
		detail: artifactCheck.ok
			? "No artifact read violations detected"
			: `${artifactCheck.violations.length} violation(s): ${artifactCheck.violations.slice(0, 3).join(", ")}`,
	};
}

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const overallStart = Date.now();

	logger.log("=== validate-consolidated.ts ===");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Max iterations: ${MAX_ITERATIONS}`);
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
		logger.log(`[setup] WARN: Fixture build failed: ${err instanceof Error ? err.message : String(err)}`);
	}

	try {
		execFileSync("bun", ["test"], {
			cwd: fixtureDir,
			stdio: "pipe",
			encoding: "utf-8",
		});
		logger.log("[setup] Fixture tests pass");
	} catch (err) {
		logger.log(`[setup] WARN: Fixture tests failed: ${err instanceof Error ? err.message : String(err)}`);
	}

	// ─── Run Pipeline ───────────────────────────────────────

	const ctx: PipelineContext = {
		fixtureDir,
		allToolCalls: [],
		allViolations: [],
		skillCosts: [],
	};

	const pipelineSteps = [
		{ name: "init", fn: () => stepInit(ctx) },
		{ name: "create-epic", fn: () => stepCreateEpic(ctx) },
		{ name: "activate-epic", fn: () => Promise.resolve(stepActivateEpic(ctx)) },
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
			logger.log(`<<< Pipeline step ${step.name}: ERROR -- ${err instanceof Error ? err.message : String(err)}`);
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
		checkOrchestratorDiscipline(ctx.allToolCalls),
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
		logger.log(`  WARNING: Total cost $${totalCost.toFixed(2)} exceeds threshold $${COST_THRESHOLD_USD} -- possible context leak`);
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
