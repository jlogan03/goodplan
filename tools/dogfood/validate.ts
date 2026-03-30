/**
 * Full workflow validation — runs 2 epics + 2 quests with Opus 4.6.
 * Monitors for direct .project/ access violations.
 *
 * Usage: bun tools/dogfood/validate.ts
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
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AskUserQuestionInput } from "@anthropic-ai/claude-agent-sdk/sdk-tools";

// ─── Config ──────────────────────────────────────────────────

const HOME = process.env.HOME!;
const PROJECT_DIR = join(HOME, "Repos/flashcards");
const GOODPLAN_BIN = join(HOME, "bin/goodplan");
const LOG_DIR = join(import.meta.dir, "validate-logs");
const MODEL = "claude-opus-4-6";

mkdirSync(LOG_DIR, { recursive: true });

// ─── Violation Tracking ──────────────────────────────────────

const violations: Array<{ skill: string; tool: string; path: string; detail: string }> = [];
let currentSkill = "";

function checkViolation(toolName: string, input: Record<string, unknown>, logName: string): void {
	const filePath = typeof input.file_path === "string" ? input.file_path : "";
	const command = typeof input.command === "string" ? input.command : "";

	// Check Read/Write/Edit on .project/ structured state files
	if (filePath && filePath.includes(".project/")) {
		const isStructuredState =
			filePath.endsWith(".json") ||
			filePath.endsWith(".jsonl") ||
			filePath.endsWith("/state.md");

		if (isStructuredState && ["Read", "Write", "Edit"].includes(toolName)) {
			const v = { skill: currentSkill, tool: toolName, path: filePath, detail: "Direct structured state access" };
			violations.push(v);
			log(logName, `[VIOLATION] ${toolName} on ${filePath}`);
			console.warn(`  │  ⚠ VIOLATION: ${toolName} on ${filePath.split(".project/")[1]}`);
		}
	}

	// Check Bash for direct .project/ file manipulation
	if (toolName === "Bash" && command) {
		const patterns = [
			{ re: /cat\s+[^|]*\.project\/.*\.json/, desc: "cat on .project/ JSON" },
			{ re: /echo\s+.*>>\s*.*\.project\/.*\.jsonl/, desc: "append to .project/ JSONL" },
			{ re: /echo\s+.*>\s*.*\.project\/.*\.json/, desc: "write to .project/ JSON" },
			{ re: /mv\s+.*\.project\/.*~~archived~~/, desc: "mv with ~~archived~~ rename" },
			{ re: /mv\s+.*\.project\/.*__active__/, desc: "mv with __active__ rename" },
		];
		for (const { re, desc } of patterns) {
			if (re.test(command)) {
				const v = { skill: currentSkill, tool: "Bash", path: command.slice(0, 120), detail: desc };
				violations.push(v);
				log(logName, `[VIOLATION] Bash: ${desc} — ${command.slice(0, 120)}`);
				console.warn(`  │  ⚠ VIOLATION: ${desc}`);
				break;
			}
		}
	}
}

// ─── CLI Helper ──────────────────────────────────────────────

interface CliResult {
	ok: boolean;
	stdout: string;
	exitCode: number;
}

function gp(args: string[], opts: { stdin?: string } = {}): CliResult {
	try {
		const stdout = execFileSync(GOODPLAN_BIN, args, {
			cwd: PROJECT_DIR,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			input: opts.stdin ?? "",
		});
		return { ok: true, stdout, exitCode: 0 };
	} catch (e: unknown) {
		const err = e as { stdout?: string; stderr?: string; status?: number };
		return { ok: false, stdout: String(err.stdout ?? err.stderr ?? ""), exitCode: err.status ?? 1 };
	}
}

function gpJson<T>(args: string[], opts?: { stdin?: string }): T {
	const r = gp(args, opts);
	if (!r.ok) throw new Error(`goodplan ${args.join(" ")} failed (exit ${r.exitCode}): ${r.stdout.slice(0, 200)}`);
	return JSON.parse(r.stdout) as T;
}

function gpForce(args: string[], opts: { stdin?: string } = {}): CliResult {
	const r = gp(args, opts);
	if (!r.ok && r.stdout.includes("CONCURRENT_MODIFICATION")) {
		console.log("  [--force recovery]");
		return gp([...args, "--force"], opts);
	}
	return r;
}

function entityStatus(type: "epic" | "slice" | "quest", name: string): string {
	try {
		const data = gpJson<{ status: string }>([`${type}:show`, `--${type}`, name, "--json"]);
		return data.status;
	} catch {
		return "not-found";
	}
}

// ─── Logging ─────────────────────────────────────────────────

function log(file: string, content: string): void {
	appendFileSync(join(LOG_DIR, file), `${content}\n`);
}

// ─── Skill Runner ────────────────────────────────────────────

async function runSkill(
	skillName: string,
	prompt: string,
	opts: { maxTurns?: number; maxBudgetUsd?: number; logFile?: string } = {},
): Promise<{ result: string; costUsd: number }> {
	const { maxTurns = 300, maxBudgetUsd = 25, logFile } = opts;
	const logName = logFile ?? `${skillName}-${Date.now()}.log`;
	const startTime = Date.now();
	currentSkill = skillName;

	console.log(`\n  ┌─ ${skillName}`);
	console.log(`  │  model=${MODEL}, maxTurns=${maxTurns}, budget=$${maxBudgetUsd}`);

	log(logName, `\n${"=".repeat(50)}\n[${new Date().toISOString()}] ${skillName}\n${"=".repeat(50)}\nPrompt: ${prompt}\n`);

	let result = "";
	let msgs = 0;
	let tools = 0;
	let costUsd = 0;

	try {
		for await (const message of query({
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
					append: SYSTEM_APPEND,
				},
				canUseTool: async (toolName: string, input: Record<string, unknown>) => {
					// AskUserQuestion auto-responder
					if (toolName === "AskUserQuestion") {
						if ("questions" in input && Array.isArray(input.questions)) {
							const typed = input as unknown as AskUserQuestionInput;
							const answers: Record<string, string> = {};
							for (const q of typed.questions) {
								answers[q.question] = q.options[0]?.label ?? "Proceed";
							}
							log(logName, `[AskUserQuestion] ${typed.questions.map((q) => q.question).join("; ")}`);
							console.log(`  │  [Q] ${typed.questions.map((q) => q.question).join("; ").slice(0, 80)}`);
							return { behavior: "allow" as const, updatedInput: { questions: typed.questions, answers } };
						}
					}
					// Violation detection
					checkViolation(toolName, input, logName);
					return { behavior: "allow" as const, updatedInput: input };
				},
			},
		})) {
			msgs++;
			if (message.type === "result" && message.subtype === "success") {
				result = message.result;
				costUsd = message.total_cost_usd;
				log(logName, `\n--- RESULT ($${costUsd.toFixed(2)}) ---\n${result.slice(0, 1000)}`);
			} else if (message.type === "assistant") {
				for (const block of message.message.content) {
					if (block.type === "tool_use") tools++;
				}
			} else if (message.type === "system") {
				if (message.subtype === "task_started") {
					const desc = "description" in message ? String(message.description) : "";
					console.log(`  │  [agent] ${desc.slice(0, 70)}`);
				} else if (message.subtype === "task_notification") {
					const status = "status" in message ? String(message.status) : "";
					console.log(`  │  [agent] ${status}`);
				}
			}
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log(logName, `[ERROR] ${msg}`);
		console.error(`  │  ERROR: ${msg.slice(0, 150)}`);
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
	console.log(`  └─ ${msgs} msgs, ${tools} tools, ${elapsed}s, $${costUsd.toFixed(2)}`);
	log(logName, `--- STATS: ${msgs} msgs, ${tools} tools, ${elapsed}s, $${costUsd.toFixed(2)} ---\n`);
	return { result, costUsd };
}

const SYSTEM_APPEND = `
AUTONOMOUS MODE — You are running in a test harness. Do NOT use AskUserQuestion.
Make all decisions autonomously. Keep work focused and concise.
Project: flashcards — a CLI flashcard study app built with TypeScript + Bun.
Always complete CLI state transitions (submit-explore, submit-architecture, etc.) before finishing.
`;

// ─── Workflow Helpers ────────────────────────────────────────

async function runEpicLifecycle(epicName: string, goal: string, description: string): Promise<void> {
	console.log(`\n${"═".repeat(60)}`);
	console.log(`  EPIC: ${epicName} — ${description}`);
	console.log(`${"═".repeat(60)}`);

	// Create epic
	const createResult = gpForce(["epic:create", "--json"], { stdin: JSON.stringify({ name: epicName, goal }) });
	console.log(`  epic:create: ${createResult.ok ? "OK" : `FAIL ${createResult.exitCode}`}`);

	// Explore
	gpForce(["epic:explore", "--epic", epicName, "--json"]);
	await runSkill("explore", `Use the Skill tool to invoke 'explore'. Epic: ${epicName}. Research what's needed for: ${description}. Write 1-2 concise research files. Then write explore-complete.md and call submit-explore.`, { logFile: `${epicName}-explore.log` });

	let status = entityStatus("epic", epicName);
	if (status === "exploring") {
		const ecPath = join(PROJECT_DIR, `.project/epics/${epicName}/explore-complete.md`);
		if (!existsSync(ecPath)) writeFileSync(ecPath, "# Explore Complete\n");
		gpForce(["submit-explore", "--epic", epicName, "--json"]);
	}
	console.log(`  Status after explore: ${entityStatus("epic", epicName)}`);

	// Architecture
	gpForce(["epic:define-architecture", "--epic", epicName, "--json"]);
	await runSkill("create-architecture", `Use the Skill tool to invoke 'create-architecture'. Epic: ${epicName}. Design a simple architecture for: ${description}. Keep it to 2-3 modules. Then call submit-architecture.`, { logFile: `${epicName}-arch.log` });

	status = entityStatus("epic", epicName);
	if (status === "defining-architecture") gpForce(["submit-architecture", "--epic", epicName, "--json"]);
	console.log(`  Status after architecture: ${entityStatus("epic", epicName)}`);

	// Refine architecture
	gpForce(["epic:refine-architecture", "--epic", epicName, "--json"]);
	await runSkill("refine-architecture", `Use the Skill tool to invoke 'refine-architecture'. Epic: ${epicName}. Quick review — 1-2 iterations max.`, { logFile: `${epicName}-refine-arch.log` });

	status = entityStatus("epic", epicName);
	if (status === "refining-architecture") gpForce(["submit-refine-architecture", "--epic", epicName, "--json"], { stdin: '{"scores":{"overall":8}}' });
	console.log(`  Status after refine-arch: ${entityStatus("epic", epicName)}`);

	// Slices
	gpForce(["epic:define-slices", "--epic", epicName, "--json"]);
	await runSkill("create-slices", `Use the Skill tool to invoke 'create-slices'. Epic: ${epicName}. Define 2 small slices for: ${description}. Remember to call slice:create for each slice AND submit-slices when done.`, { logFile: `${epicName}-slices.log` });

	status = entityStatus("epic", epicName);
	if (status === "defining-slices") gpForce(["submit-slices", "--epic", epicName, "--json"]);

	// Refine slices
	gpForce(["epic:refine-slices", "--epic", epicName, "--json"]);
	await runSkill("refine-slices", `Use the Skill tool to invoke 'refine-slices'. Epic: ${epicName}. Quick review — 1 iteration. Focus on goal.md quality, don't run code/tests.`, { logFile: `${epicName}-refine-slices.log` });

	status = entityStatus("epic", epicName);
	if (status === "refining-slices") gpForce(["submit-refine-slices", "--epic", epicName, "--json"], { stdin: '{"scores":{"overall":8}}' });
	console.log(`  Status after slices: ${entityStatus("epic", epicName)}`);

	// Activate
	gpForce(["epic:add-verification", "--epic", epicName, "--json"], {
		stdin: JSON.stringify({ verification: { description: "All slices pass bun tsc --noEmit", status: "pending", addedDuring: "slices", modifiedDuring: null } }),
	});
	gpForce(["epic:activate", "--epic", epicName, "--json"]);
	console.log(`  Activated: ${entityStatus("epic", epicName)}`);

	// Per-slice cycle
	const slices = gpJson<{ items: Array<{ name: string }> }>(["slice:list", "--json"]);
	const activeSlices = slices.items.filter((s) => entityStatus("slice", s.name) !== "completed");
	console.log(`  Slices to process: ${activeSlices.map((s) => s.name).join(", ")}`);

	for (const slice of activeSlices) {
		await runSliceCycle(slice.name, epicName);
	}

	// Complete epic
	await runSkill("complete", `Use the Skill tool to invoke 'complete'. Complete epic "${epicName}". Synthesize learnings.`, { logFile: `${epicName}-complete.log` });

	status = entityStatus("epic", epicName);
	if (status !== "completed") {
		gpForce(["epic:complete", "--epic", epicName, "--json"], {
			stdin: JSON.stringify({ verificationResults: [{ index: 0, passed: true, notes: "Automated" }] }),
		});
	}
	console.log(`  Epic ${epicName} final: ${entityStatus("epic", epicName)}`);
}

async function runSliceCycle(sliceName: string, epicName: string): Promise<void> {
	console.log(`\n  ── Slice: ${sliceName}`);

	// Plan
	gpForce(["slice:plan", "--slice", sliceName, "--json"]);
	await runSkill("create-plan", `Use the Skill tool to invoke 'create-plan' for slice "${sliceName}". Create a simple 2-phase plan. Then call submit-plan.`, { logFile: `${sliceName}-plan.log` });

	let status = entityStatus("slice", sliceName);
	if (status === "planning") gpForce(["submit-plan", "--slice", sliceName, "--json"]);

	// Refine
	gpForce(["slice:refine-plan", "--slice", sliceName, "--json"]);
	await runSkill("refine-plan", `Use the Skill tool to invoke 'refine-plan' for slice "${sliceName}". Quick review — 1-2 iterations. Then rename plan-refining.md to plan-refined.md and call submit-refinement.`, { logFile: `${sliceName}-refine.log` });

	status = entityStatus("slice", sliceName);
	if (status === "refining") gpForce(["submit-refinement", "--slice", sliceName, "--json"], { stdin: '{"scores":{"overall":8}}' });

	// Ensure plan-refined.md exists
	const sliceDir = join(PROJECT_DIR, ".project/slices", sliceName);
	const refinedPath = join(sliceDir, "plan-refined.md");
	if (!existsSync(refinedPath)) {
		const refiningPath = join(sliceDir, "plan-refining.md");
		const planPath = join(sliceDir, "plan.md");
		if (existsSync(refiningPath)) execFileSync("mv", [refiningPath, refinedPath]);
		else if (existsSync(planPath)) execFileSync("cp", [planPath, refinedPath]);
		console.log(`  [fix] Created plan-refined.md for ${sliceName}`);
	}

	// Implement
	gpForce(["slice:implement", "--slice", sliceName, "--json"]);
	await runSkill("implement-plan", `Use the Skill tool to invoke 'implement-plan' for slice "${sliceName}". Write TypeScript code. Then call submit-implementation.`, { logFile: `${sliceName}-impl.log`, maxBudgetUsd: 30 });

	status = entityStatus("slice", sliceName);
	if (status === "implementing") gpForce(["submit-implementation", "--slice", sliceName, "--json"]);

	// Complete
	status = entityStatus("slice", sliceName);
	if (status === "implementation-complete") {
		gpForce(["slice:complete", "--slice", sliceName, "--json"], {
			stdin: JSON.stringify({ verificationPassed: true, deferred: [], learnings: [], architectureDelta: [] }),
		});
	}
	console.log(`  Slice ${sliceName} final: ${entityStatus("slice", sliceName)}`);
}

async function runQuestLifecycle(questName: string, goal: string): Promise<void> {
	console.log(`\n${"═".repeat(60)}`);
	console.log(`  QUEST: ${questName} — ${goal}`);
	console.log(`${"═".repeat(60)}`);

	gpForce(["quest:create", "--json"], { stdin: JSON.stringify({ name: questName, goal }) });
	gpForce(["quest:plan", "--quest", questName, "--json"]);

	await runSkill("create-plan", `Use the Skill tool to invoke 'create-plan' for quest "${questName}". Goal: ${goal}. Simple 1-2 phase plan. Then call submit-plan.`, { logFile: `${questName}-plan.log` });

	let status = entityStatus("quest", questName);
	if (status === "planning") gpForce(["submit-plan", "--quest", questName, "--json"]);

	// Skip refine for quests — test direct plan-to-implement path
	gpForce(["quest:implement", "--quest", questName, "--json"]);

	await runSkill("implement-plan", `Use the Skill tool to invoke 'implement-plan' for quest "${questName}". Write the code. Then call submit-implementation.`, { logFile: `${questName}-impl.log`, maxBudgetUsd: 20 });

	status = entityStatus("quest", questName);
	if (status === "implementing") gpForce(["submit-implementation", "--quest", questName, "--json"]);

	status = entityStatus("quest", questName);
	if (status === "implementation-complete") {
		gpForce(["quest:complete", "--quest", questName, "--json"], {
			stdin: JSON.stringify({ verificationPassed: true, learnings: [], architectureDelta: [] }),
		});
	}
	console.log(`  Quest ${questName} final: ${entityStatus("quest", questName)}`);
}

// ─── Main ────────────────────────────────────────────────────

async function main(): Promise<void> {
	const startTime = Date.now();
	let totalCost = 0;

	console.log("\n" + "═".repeat(60));
	console.log("  FULL WORKFLOW VALIDATION — Opus 4.6");
	console.log("  Project: flashcards (CLI flashcard study app)");
	console.log("═".repeat(60));

	// Reset
	console.log("\n[setup] Resetting project...");
	const projectDir = join(PROJECT_DIR, ".project");
	if (existsSync(projectDir)) rmSync(projectDir, { recursive: true, force: true });
	gp(["init", "--name", "flashcards", "--json"]);
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

	console.log(`\n${"═".repeat(60)}`);
	console.log("  VALIDATION SUMMARY");
	console.log(`${"═".repeat(60)}`);
	console.log(`  Duration:  ${elapsed} min`);
	console.log(`  Model:     ${MODEL}`);

	console.log("\n  Entity Status:");
	for (const epic of ["core-engine", "spaced-repetition"]) {
		console.log(`    Epic ${epic}: ${entityStatus("epic", epic)}`);
	}
	for (const quest of ["markdown-import", "stats-display"]) {
		console.log(`    Quest ${quest}: ${entityStatus("quest", quest)}`);
	}

	const slices = gpJson<{ items: Array<{ name: string }> }>(["slice:list", "--json"]);
	for (const s of slices.items) {
		console.log(`    Slice ${s.name}: ${entityStatus("slice", s.name)}`);
	}

	if (violations.length > 0) {
		console.log(`\n  ⚠ VIOLATIONS: ${violations.length}`);
		for (const v of violations) {
			console.log(`    [${v.skill}] ${v.tool}: ${v.detail}`);
		}
	} else {
		console.log("\n  ✓ ZERO .project/ access violations");
	}

	console.log(`${"═".repeat(60)}\n`);
}

main()
	.then(() => { console.log("[validate] Done."); process.exit(0); })
	.catch((e) => { console.error("[validate] FATAL:", e); process.exit(1); });
