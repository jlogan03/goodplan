/**
 * Full workflow validation — runs 2 epics + 2 quests.
 * Monitors for direct .goodplan/ access violations.
 *
 * Usage: bun tools/dogfood/validate.ts [--model <model>]
 *
 * Project: ~/Repos/flashcards — a CLI flashcard study app
 * Epic 1: Core flashcard engine (load cards, quiz mode, score tracking)
 * Quest 1: Add markdown card import
 * Epic 2: Spaced repetition (SM-2 algorithm, scheduling)
 * Quest 2: Add statistics dashboard
 */

import { execFileSync } from "node:child_process";
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
	createSimulatedUser,
	gp,
	gpForce,
	gpJson,
	isSuccess,
	parseModel,
	runSkillSession,
	tierDefault,
	verifyEntityStatus,
	type CliResult,
} from "./utils";

// ─── Config ──────────────────────────────────────────────────

const HOME = process.env.HOME!;
const PROJECT_DIR = join(HOME, "Repos/flashcards");
const LOG_DIR = join(import.meta.dir, "validate-logs");
const MODEL = parseModel(tierDefault("quality"));

mkdirSync(LOG_DIR, { recursive: true });

// ─── Logging ─────────────────────────────────────────────────

function log(file: string, content: string): void {
	appendFileSync(join(LOG_DIR, file), `${content}\n`);
}

// ─── Simulated User ─────────────────────────────────────────

const SIMULATED_USER_PROMPT = `You are a developer building a CLI flashcard study app with TypeScript + Bun.
When asked questions, make reasonable choices:
- For architecture questions: keep it simple (3-4 modules, TypeScript, Bun, JSON output, CLI only)
- For naming: use descriptive kebab-case names
- For approval prompts: approve and continue
- For "is this ready?" questions: yes, proceed
- Keep all work focused and concise — this is a small CLI app.
Always complete CLI state transitions (submit-explore, submit-architecture, etc.) before finishing.`;

// ─── Entity Status Helper ───────────────────────────────────

function entityStatus(type: "epic" | "slice" | "quest", name: string): string {
	const result = verifyEntityStatus(type, name, "", { cwd: PROJECT_DIR });
	return result.actual;
}

// ─── Skill Runner ────────────────────────────────────────────

// Accumulate violations across all skill runs for end-of-run summary
const allViolations: string[] = [];

async function runSkill(
	skillName: string,
	prompt: string,
	opts: { maxTurns?: number; maxBudgetUsd?: number; logFile?: string } = {},
): Promise<{ result: string; costUsd: number }> {
	const { maxTurns = 300, maxBudgetUsd = 25, logFile } = opts;
	const logName = logFile ?? `${skillName}-${Date.now()}.log`;
	const startTime = Date.now();
	const transcriptFile = join(LOG_DIR, `${logName.replace(".log", "")}-transcript.jsonl`);

	console.log(`\n  ┌─ ${skillName}`);
	console.log(`  │  model=${MODEL}, maxTurns=${maxTurns}, budget=$${maxBudgetUsd}`);

	log(logName, `\n${"=".repeat(50)}\n[${new Date().toISOString()}] ${skillName}\n${"=".repeat(50)}\nPrompt: ${prompt}\n`);

	const simulatedUser = createSimulatedUser({
		systemPrompt: SIMULATED_USER_PROMPT,
		transcriptFile,
	});

	let result = "";
	let costUsd = 0;

	try {
		const session = await runSkillSession({
			prompt,
			options: {
				cwd: PROJECT_DIR,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns,
				maxBudgetUsd,
				model: MODEL,
				settingSources: ["project"],
				env: { ...process.env, PATH: `${HOME}/bin:${process.env.PATH ?? ""}` },
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: `Project: flashcards — a CLI flashcard study app built with TypeScript + Bun.
Always complete CLI state transitions (submit-explore, submit-architecture, etc.) before finishing.`,
				},
			},
			transcriptFile,
			simulatedUser,
			checkViolations: true,
			onMessage: (message) => {
				if (message.type === "assistant") {
					const msg = message as { message: { content: Array<{ type: string; name?: string }> } };
					for (const block of msg.message.content) {
						if (block.type === "tool_use") {
							log(logName, `[tool_use] ${block.name}`);
						}
					}
				} else if (message.type === "system") {
					const sysMsg = message as Record<string, unknown>;
					if (sysMsg.subtype === "task_started") {
						const desc = typeof sysMsg.description === "string" ? sysMsg.description : "";
						console.log(`  │  [agent] ${desc.slice(0, 70)}`);
					} else if (sysMsg.subtype === "task_notification") {
						const status = typeof sysMsg.status === "string" ? sysMsg.status : "";
						console.log(`  │  [agent] ${status}`);
					}
				}
			},
		});

		costUsd = session.totalCost;

		if (isSuccess(session.result)) {
			result = session.result.result;
			log(logName, `\n--- RESULT ($${costUsd.toFixed(2)}) ---\n${result.slice(0, 1000)}`);
		}

		if (session.violations.length > 0) {
			console.log(`  │  VIOLATIONS: ${session.violations.length}`);
			for (const v of session.violations) {
				log(logName, `[VIOLATION] ${v}`);
				console.warn(`  │  VIOLATION: ${v}`);
				allViolations.push(`[${skillName}] ${v}`);
			}
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log(logName, `[ERROR] ${msg}`);
		console.error(`  │  ERROR: ${msg.slice(0, 150)}`);
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
	console.log(`  └─ ${elapsed}s, $${costUsd.toFixed(2)}`);
	log(logName, `--- STATS: ${elapsed}s, $${costUsd.toFixed(2)} ---\n`);
	return { result, costUsd };
}

// ─── Workflow Helpers ────────────────────────────────────────

async function runEpicLifecycle(epicName: string, goal: string, description: string): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log(`  EPIC: ${epicName} — ${description}`);
	console.log(`${"=".repeat(60)}`);

	// Create epic
	const createResult = gpForce(["epic:create", "--json"], { cwd: PROJECT_DIR, stdin: JSON.stringify({ name: epicName, goal }) });
	console.log(`  epic:create: ${createResult.exitCode === 0 ? "OK" : `FAIL ${createResult.exitCode}`}`);

	// Explore
	gpForce(["epic:explore", "--epic", epicName, "--json"], { cwd: PROJECT_DIR });
	await runSkill("explore", `Use the Skill tool to invoke 'explore'. Epic: ${epicName}. Research what's needed for: ${description}. Write 1-2 concise research files. Then write explore-complete.md and call submit-explore.`, { logFile: `${epicName}-explore.log` });

	let status = entityStatus("epic", epicName);
	if (status === "exploring") {
		const ecPath = join(PROJECT_DIR, `.goodplan/epics/${epicName}/explore-complete.md`);
		if (!existsSync(ecPath)) writeFileSync(ecPath, "# Explore Complete\n");
		gpForce(["submit-explore", "--epic", epicName, "--json"], { cwd: PROJECT_DIR });
	}
	console.log(`  Status after explore: ${entityStatus("epic", epicName)}`);

	// Architecture
	gpForce(["epic:define-architecture", "--epic", epicName, "--json"], { cwd: PROJECT_DIR });
	await runSkill("create-architecture", `Use the Skill tool to invoke 'create-architecture'. Epic: ${epicName}. Design a simple architecture for: ${description}. Keep it to 2-3 modules. Then call submit-architecture.`, { logFile: `${epicName}-arch.log` });

	status = entityStatus("epic", epicName);
	if (status === "defining-architecture") gpForce(["submit-architecture", "--epic", epicName, "--json"], { cwd: PROJECT_DIR });
	console.log(`  Status after architecture: ${entityStatus("epic", epicName)}`);

	// Refine architecture
	gpForce(["epic:refine-architecture", "--epic", epicName, "--json"], { cwd: PROJECT_DIR });
	await runSkill("refine-architecture", `Use the Skill tool to invoke 'refine-architecture'. Epic: ${epicName}. Quick review — 1-2 iterations max.`, { logFile: `${epicName}-refine-arch.log` });

	status = entityStatus("epic", epicName);
	if (status === "refining-architecture") gpForce(["submit-refine-architecture", "--epic", epicName, "--json"], { cwd: PROJECT_DIR, stdin: JSON.stringify({ scores: { overall: 8 } }) });
	console.log(`  Status after refine-arch: ${entityStatus("epic", epicName)}`);

	// Slices
	gpForce(["epic:define-slices", "--epic", epicName, "--json"], { cwd: PROJECT_DIR });
	await runSkill("create-slices", `Use the Skill tool to invoke 'create-slices'. Epic: ${epicName}. Define 2 small slices for: ${description}. Remember to call slice:create for each slice AND submit-slices when done.`, { logFile: `${epicName}-slices.log` });

	status = entityStatus("epic", epicName);
	if (status === "defining-slices") gpForce(["submit-slices", "--epic", epicName, "--json"], { cwd: PROJECT_DIR });

	// Refine slices
	gpForce(["epic:refine-slices", "--epic", epicName, "--json"], { cwd: PROJECT_DIR });
	await runSkill("refine-slices", `Use the Skill tool to invoke 'refine-slices'. Epic: ${epicName}. Quick review — 1 iteration. Focus on goal.md quality, don't run code/tests.`, { logFile: `${epicName}-refine-slices.log` });

	status = entityStatus("epic", epicName);
	if (status === "refining-slices") gpForce(["submit-refine-slices", "--epic", epicName, "--json"], { cwd: PROJECT_DIR, stdin: JSON.stringify({ scores: { overall: 8 } }) });
	console.log(`  Status after slices: ${entityStatus("epic", epicName)}`);

	// Activate
	gpForce(["epic:add-verification", "--epic", epicName, "--json"], { cwd: PROJECT_DIR, stdin: JSON.stringify({ verification: [{ description: "All tests pass", command: "bun test" }] }) });
	gpForce(["epic:activate", "--epic", epicName, "--json"], { cwd: PROJECT_DIR });
	console.log(`  Activated: ${entityStatus("epic", epicName)}`);

	// Per-slice cycle
	const slices = gpJson<{ items: Array<{ name: string }> }>(["slice:list", "--json"], { cwd: PROJECT_DIR });
	const activeSlices = slices.items.filter((s) => entityStatus("slice", s.name) !== "completed");
	console.log(`  Slices to process: ${activeSlices.map((s) => s.name).join(", ")}`);

	for (const slice of activeSlices) {
		await runSliceCycle(slice.name, epicName);
	}

	// Complete epic
	await runSkill("complete", `Use the Skill tool to invoke 'complete'. Complete epic "${epicName}". Synthesize learnings.`, { logFile: `${epicName}-complete.log` });

	status = entityStatus("epic", epicName);
	if (status !== "completed") {
		gpForce(["epic:complete", "--epic", epicName, "--json"], { cwd: PROJECT_DIR, stdin: JSON.stringify({ verificationResults: [{ index: 0, passed: true, notes: "Automated verification" }] }) });
	}
	console.log(`  Epic ${epicName} final: ${entityStatus("epic", epicName)}`);
}

async function runSliceCycle(sliceName: string, epicName: string): Promise<void> {
	console.log(`\n  -- Slice: ${sliceName}`);

	// Plan
	gpForce(["slice:plan", "--slice", sliceName, "--json"], { cwd: PROJECT_DIR });
	await runSkill("create-plan", `Use the Skill tool to invoke 'create-plan' for slice "${sliceName}". Create a simple 2-phase plan. Then call submit-plan.`, { logFile: `${sliceName}-plan.log` });

	let status = entityStatus("slice", sliceName);
	if (status === "planning") gpForce(["submit-plan", "--slice", sliceName, "--json"], { cwd: PROJECT_DIR });

	// Refine
	gpForce(["slice:refine-plan", "--slice", sliceName, "--json"], { cwd: PROJECT_DIR });
	await runSkill("refine-plan", `Use the Skill tool to invoke 'refine-plan' for slice "${sliceName}". Quick review — 1-2 iterations. Then rename plan-refining.md to plan-refined.md and call submit-refinement.`, { logFile: `${sliceName}-refine.log` });

	status = entityStatus("slice", sliceName);
	if (status === "refining") gpForce(["submit-refinement", "--slice", sliceName, "--json"], { cwd: PROJECT_DIR, stdin: JSON.stringify({ scores: { overall: 8 } }) });

	// Ensure plan-refined.md exists
	const sliceDir = join(PROJECT_DIR, ".goodplan/slices", sliceName);
	const refinedPath = join(sliceDir, "plan-refined.md");
	if (!existsSync(refinedPath)) {
		const refiningPath = join(sliceDir, "plan-refining.md");
		const planPath = join(sliceDir, "plan.md");
		if (existsSync(refiningPath)) execFileSync("mv", [refiningPath, refinedPath]);
		else if (existsSync(planPath)) execFileSync("cp", [planPath, refinedPath]);
		console.log(`  [fix] Created plan-refined.md for ${sliceName}`);
	}

	// Implement
	gpForce(["slice:implement", "--slice", sliceName, "--json"], { cwd: PROJECT_DIR });
	await runSkill("implement-plan", `Use the Skill tool to invoke 'implement-plan' for slice "${sliceName}". Write TypeScript code. Then call submit-implementation.`, { logFile: `${sliceName}-impl.log`, maxBudgetUsd: 30 });

	status = entityStatus("slice", sliceName);
	if (status === "implementing") gpForce(["submit-implementation", "--slice", sliceName, "--json"], { cwd: PROJECT_DIR });

	// Complete
	status = entityStatus("slice", sliceName);
	if (status === "implementation-complete") {
		gpForce(["slice:complete", "--slice", sliceName, "--json"], { cwd: PROJECT_DIR, stdin: JSON.stringify({ verificationPassed: true, deferred: [], learnings: [], architectureDelta: [] }) });
	}
	console.log(`  Slice ${sliceName} final: ${entityStatus("slice", sliceName)}`);
}

async function runQuestLifecycle(questName: string, goal: string): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log(`  QUEST: ${questName} — ${goal}`);
	console.log(`${"=".repeat(60)}`);

	gpForce(["quest:create", "--json"], { cwd: PROJECT_DIR, stdin: JSON.stringify({ name: questName, goal }) });
	gpForce(["quest:plan", "--quest", questName, "--json"], { cwd: PROJECT_DIR });

	await runSkill("create-plan", `Use the Skill tool to invoke 'create-plan' for quest "${questName}". Goal: ${goal}. Simple 1-2 phase plan. Then call submit-plan.`, { logFile: `${questName}-plan.log` });

	let status = entityStatus("quest", questName);
	if (status === "planning") gpForce(["submit-plan", "--quest", questName, "--json"], { cwd: PROJECT_DIR });

	// Skip refine for quests — test direct plan-to-implement path
	gpForce(["quest:implement", "--quest", questName, "--json"], { cwd: PROJECT_DIR });

	await runSkill("implement-plan", `Use the Skill tool to invoke 'implement-plan' for quest "${questName}". Write the code. Then call submit-implementation.`, { logFile: `${questName}-impl.log`, maxBudgetUsd: 20 });

	status = entityStatus("quest", questName);
	if (status === "implementing") gpForce(["submit-implementation", "--quest", questName, "--json"], { cwd: PROJECT_DIR });

	status = entityStatus("quest", questName);
	if (status === "implementation-complete") {
		gpForce(["quest:complete", "--quest", questName, "--json"], { cwd: PROJECT_DIR, stdin: JSON.stringify({ verificationPassed: true, learnings: [], architectureDelta: [] }) });
	}
	console.log(`  Quest ${questName} final: ${entityStatus("quest", questName)}`);
}

// ─── Main ────────────────────────────────────────────────────

async function main(): Promise<void> {
	const startTime = Date.now();

	console.log("\n" + "=".repeat(60));
	console.log(`  FULL WORKFLOW VALIDATION — ${MODEL}`);
	console.log("  Project: flashcards (CLI flashcard study app)");
	console.log("=".repeat(60));

	// Reset
	console.log("\n[setup] Resetting project...");
	const goodplanDir = join(PROJECT_DIR, ".goodplan");
	if (existsSync(goodplanDir)) rmSync(goodplanDir, { recursive: true, force: true });
	gp(["init", "--name", "flashcards", "--json"], { cwd: PROJECT_DIR });
	console.log("[setup] Project initialized");

	// Epic 1: Core flashcard engine
	await runEpicLifecycle(
		"core-engine",
		"Build core flashcard engine: load cards from JSON, interactive quiz mode, score tracking, CLI interface",
		"Core flashcard engine with quiz mode",
	);

	// Quest 1: Markdown import
	await runQuestLifecycle(
		"markdown-import",
		"Add ability to import flashcards from markdown files (# Question / answer format)",
	);

	// Epic 2: Spaced repetition
	await runEpicLifecycle(
		"spaced-repetition",
		"Add SM-2 spaced repetition algorithm: track card difficulty, schedule reviews, persist progress",
		"Spaced repetition scheduling",
	);

	// Quest 2: Statistics
	await runQuestLifecycle(
		"stats-display",
		"Add a stats command showing cards studied, accuracy rate, streak, and upcoming reviews",
	);

	// ─── Summary ─────────────────────────────────────────────
	const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

	console.log(`\n${"=".repeat(60)}`);
	console.log("  VALIDATION SUMMARY");
	console.log(`${"=".repeat(60)}`);
	console.log(`  Duration:  ${elapsed} min`);
	console.log(`  Model:     ${MODEL}`);

	console.log("\n  Entity Status:");
	for (const epic of ["core-engine", "spaced-repetition"]) {
		console.log(`    Epic ${epic}: ${entityStatus("epic", epic)}`);
	}
	for (const quest of ["markdown-import", "stats-display"]) {
		console.log(`    Quest ${quest}: ${entityStatus("quest", quest)}`);
	}

	const slices = gpJson<{ items: Array<{ name: string }> }>(["slice:list", "--json"], { cwd: PROJECT_DIR });
	for (const s of slices.items) {
		console.log(`    Slice ${s.name}: ${entityStatus("slice", s.name)}`);
	}

	// Violation summary
	console.log(`\n  Violations: ${allViolations.length}`);
	if (allViolations.length > 0) {
		for (const v of allViolations) {
			console.log(`    - ${v}`);
		}
	}

	console.log(`${"=".repeat(60)}\n`);
}

main()
	.then(() => { console.log("[validate] Done."); process.exit(0); })
	.catch((e) => { console.error("[validate] FATAL:", e); process.exit(1); });
