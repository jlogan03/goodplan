/**
 * Dogfooding test harness — runs goodplan skills in the nondet-eval repo
 * using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/harness.ts [phase] [step]
 *   phase: 2 | 3 | 4 (Phase 1 already complete)
 *   step: optional step within the phase (e.g., "explore", "architecture")
 *
 * Examples:
 *   bun tools/dogfood/harness.ts 2 explore     # Just run explore
 *   bun tools/dogfood/harness.ts 2              # Full Phase 2
 *   bun tools/dogfood/harness.ts 2 slice:provider-scaffold  # One slice cycle
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { execFileSync } from "child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME!;
const NONDET_EVAL_DIR = join(HOME, "Repos/nondet-eval");
const GOODPLAN_DIR = join(HOME, "Repos/goodplan");
const GOODPLAN_BIN = join(HOME, "bin/goodplan");
const FRICTION_LOG = join(
	GOODPLAN_DIR,
	".project/epics/__active__skills-cli-integration/slices/06-dogfooding/friction-log.md",
);
const LOG_DIR = join(
	GOODPLAN_DIR,
	".project/epics/__active__skills-cli-integration/slices/06-dogfooding/harness-logs",
);

mkdirSync(LOG_DIR, { recursive: true });

// ─── CLI Helper ──────────────────────────────────────────────

function goodplan(
	args: string[],
	opts: { cwd?: string; stdin?: string } = {},
): { ok: boolean; stdout: string; exitCode: number } {
	const cwd = opts.cwd ?? NONDET_EVAL_DIR;
	try {
		const stdout = execFileSync(GOODPLAN_BIN, args, {
			cwd,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			input: opts.stdin ?? "",
		});
		return { ok: true, stdout, exitCode: 0 };
	} catch (e: unknown) {
		const err = e as { stdout?: string; stderr?: string; status?: number };
		const stdout = err.stdout ?? err.stderr ?? "unknown error";
		return { ok: false, stdout, exitCode: err.status ?? 1 };
	}
}

function goodplanJson<T = unknown>(args: string[], opts?: { cwd?: string; stdin?: string }): T {
	const result = goodplan(args, opts);
	return JSON.parse(result.stdout) as T;
}

function epicStatus(): string {
	const data = goodplanJson<{ status: string }>(["epic:show", "--epic", "core-provider", "--json"]);
	return data.status;
}

function projectStatus(): { activeEpic: { name: string } | null } {
	return goodplanJson(["status", "--json"]);
}

// ─── Logging ─────────────────────────────────────────────────

function logFriction(phase: number, source: string, issue: string, severity: string): void {
	const lines = readFileSync(FRICTION_LOG, "utf-8").split("\n");
	const entryCount = lines.filter(
		(l) => l.startsWith("|") && !l.startsWith("| #") && !l.startsWith("|---"),
	).length;
	const num = entryCount + 1;
	const entry = `| ${num} | ${phase} | ${source} | ${issue} | ${severity} | Logged | — |`;
	appendFileSync(FRICTION_LOG, `\n${entry}`);
	console.log(`  [friction #${num}] ${severity}: ${issue.slice(0, 120)}`);
}

function log(file: string, content: string): void {
	appendFileSync(join(LOG_DIR, file), content + "\n");
}

// ─── Skill Runner ────────────────────────────────────────────

async function runSkill(
	skillName: string,
	prompt: string,
	opts: {
		maxTurns?: number;
		maxBudgetUsd?: number;
		logFile?: string;
	} = {},
): Promise<string> {
	const { maxTurns = 200, maxBudgetUsd = 8, logFile } = opts;
	const logName = logFile ?? `${skillName}-${Date.now()}.log`;
	const startTime = Date.now();

	console.log(`\n  ┌─ Running skill: ${skillName}`);
	console.log(`  │  maxTurns=${maxTurns}, maxBudget=$${maxBudgetUsd}`);

	log(logName, `\n${"=".repeat(60)}\n[${new Date().toISOString()}] Skill: ${skillName}\n${"=".repeat(60)}\n`);
	log(logName, `Prompt:\n${prompt}\n`);

	let result = "";
	let messageCount = 0;
	let toolCalls = 0;

	try {
		for await (const message of query({
			prompt,
			options: {
				cwd: NONDET_EVAL_DIR,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns,
				maxBudgetUsd,
				settingSources: ["project"],
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: AUTONOMOUS_SYSTEM_PROMPT,
				},
			},
		})) {
			messageCount++;

			if ("result" in message) {
				result = message.result;
				log(logName, `\n--- RESULT (${result.length} chars) ---\n${result.slice(0, 2000)}`);
			} else if (message.type === "system") {
				const brief = JSON.stringify(message).slice(0, 300);
				log(logName, `[system:${message.subtype}] ${brief}`);

				if (message.subtype === "tool_use") {
					toolCalls++;
				}
			}
		}
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		log(logName, `\n[ERROR] ${errMsg}`);
		console.error(`  │  ERROR: ${errMsg.slice(0, 200)}`);
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`  │  ${messageCount} messages, ${toolCalls} tool calls, ${elapsed}s`);
	console.log(`  └─ Done: ${skillName}\n`);

	log(logName, `\n--- STATS ---\nMessages: ${messageCount}\nTool calls: ${toolCalls}\nElapsed: ${elapsed}s\n`);
	return result;
}

const AUTONOMOUS_SYSTEM_PROMPT = `
IMPORTANT OVERRIDE — AUTONOMOUS MODE:
You are running inside an automated test harness for dogfooding goodplan skills.

1. Do NOT use AskUserQuestion. Make all decisions autonomously.
2. When a skill would normally ask the user for input, use reasonable defaults:
   - For architecture questions: keep it simple (3-4 modules, TypeScript, Bun, JSON output, CLI only)
   - For naming: use descriptive kebab-case names
   - For approval prompts: approve and continue
   - For "is this ready?" questions: yes, proceed
3. Keep all work focused and concise — this is a small eval framework, not a production system.
4. The project is nondet-eval: TypeScript eval framework on Promptfoo for measuring skill quality via Monte Carlo execution.
5. Epic: core-provider (Core Provider & Basic Execution).
6. If you encounter errors, log them and continue rather than blocking.
7. Always complete CLI state transitions (submit-explore, submit-architecture, etc.) before finishing.
`;

// ─── Phase 2 Steps ───────────────────────────────────────────

async function phase2Explore(): Promise<void> {
	console.log("\n[Phase 2] Step: Explore");

	// Check current state
	const status = epicStatus();
	console.log(`  Epic status: ${status}`);

	if (status === "created") {
		// Need to transition to exploring first
		const r = goodplan(["epic:explore", "--epic", "core-provider", "--json"]);
		console.log(`  epic:explore: ${r.ok ? "OK" : `FAIL (exit ${r.exitCode})`}`);
	}

	await runSkill(
		"explore",
		`Use the Skill tool to invoke the 'explore' skill.
The epic is core-provider (currently in 'exploring' state).
Research these 3 topics, writing a concise .md file for each in the epic's research/ directory:
1. Promptfoo custom provider API — ApiProvider interface, callApi method, how to register
2. Anthropic SDK for LLM-as-judge — messages.parse() with structured output for scoring
3. Monte Carlo eval patterns — repeated execution, statistical aggregation, bootstrap CIs

Also write a brainstorm file about provider architecture options.
When done, write explore-complete.md and use the CLI to submit: goodplan submit-explore --epic core-provider --json`,
		{ logFile: "phase2-explore.log" },
	);

	// Verify and fix state
	const afterStatus = epicStatus();
	console.log(`  Epic status after explore: ${afterStatus}`);
	if (afterStatus === "exploring") {
		console.log("  Completing explore transition manually...");
		// Write explore-complete.md if not written
		const ecPath = join(NONDET_EVAL_DIR, ".project/epics/core-provider/explore-complete.md");
		try {
			readFileSync(ecPath);
		} catch {
			writeFileSync(ecPath, "# Explore Complete\n\nResearch and brainstorming complete.\n");
		}
		goodplan(["submit-explore", "--epic", "core-provider", "--json"]);
		logFriction(2, "Skill: /explore", "Skill did not complete submit-explore transition", "MINOR");
	}
}

async function phase2Architecture(): Promise<void> {
	console.log("\n[Phase 2] Step: Create Architecture");

	await runSkill(
		"create-architecture",
		`Use the Skill tool to invoke the 'create-architecture' skill.
The epic is core-provider. Define a simple architecture:
- Provider module: Promptfoo ApiProvider that runs Claude skills via subprocess
- Stats module: Online aggregation (Welford's algorithm), bootstrap confidence intervals
- CLI module: Entry point that ties provider + stats, outputs JSON results
Write architecture files to the epic's architecture/ directory.
Also write .project/conventions.md with TypeScript/Bun conventions.
Complete all CLI state transitions when done.`,
		{ logFile: "phase2-architecture.log", maxBudgetUsd: 10 },
	);

	const status = epicStatus();
	console.log(`  Epic status after architecture: ${status}`);
}

async function phase2RefineArchitecture(): Promise<void> {
	console.log("\n[Phase 2] Step: Refine Architecture");

	await runSkill(
		"refine-architecture",
		`Use the Skill tool to invoke the 'refine-architecture' skill.
Refine the architecture for epic core-provider. Keep it concise — 2-3 iterations max.
This is a small project; don't over-engineer.`,
		{ logFile: "phase2-refine-architecture.log", maxBudgetUsd: 15, maxTurns: 300 },
	);

	const status = epicStatus();
	console.log(`  Epic status after refine-architecture: ${status}`);
}

async function phase2Slices(): Promise<void> {
	console.log("\n[Phase 2] Step: Create & Refine Slices");

	await runSkill(
		"create-slices",
		`Use the Skill tool to invoke the 'create-slices' skill.
Define 2 small slices for epic core-provider:
1. "provider-scaffold" — Promptfoo ApiProvider + basic stats aggregation + test
2. "cli-runner" — CLI entry point that runs evals end-to-end + JSON output
Keep slices small and focused.`,
		{ logFile: "phase2-create-slices.log" },
	);

	await runSkill(
		"refine-slices",
		`Use the Skill tool to invoke the 'refine-slices' skill.
Refine the slices for epic core-provider. Quick review — 1-2 iterations.`,
		{ logFile: "phase2-refine-slices.log", maxBudgetUsd: 12 },
	);

	const slices = goodplanJson<{ items: Array<{ name: string; status: string }> }>(["slice:list", "--json"]);
	console.log(`  Slices: ${JSON.stringify(slices.items.map((s) => `${s.name}:${s.status}`))}`);
}

async function phase2Activate(): Promise<void> {
	console.log("\n[Phase 2] Step: Activate Epic");

	const verPayload = JSON.stringify({
		verification: {
			description: "All slices pass bun tsc --noEmit and tests",
			status: "pending",
			addedDuring: "slices",
			modifiedDuring: null,
		},
	});

	const addVer = goodplan(["epic:add-verification", "--epic", "core-provider", "--json"], { stdin: verPayload });
	console.log(`  add-verification: ${addVer.ok ? "OK" : `FAIL (exit ${addVer.exitCode})`}`);

	const activate = goodplan(["epic:activate", "--epic", "core-provider", "--json"]);
	console.log(`  activate: ${activate.ok ? "OK" : `FAIL (exit ${activate.exitCode})`}`);

	const status = projectStatus();
	console.log(`  Active epic: ${status.activeEpic?.name ?? "none"}`);
}

async function phase2SliceCycle(sliceName: string): Promise<void> {
	console.log(`\n[Phase 2] Step: Slice cycle — ${sliceName}`);

	// Transition to planning
	const planTransition = goodplan(["slice:plan", "--slice", sliceName, "--json"]);
	console.log(`  slice:plan: ${planTransition.ok ? "OK" : `FAIL (exit ${planTransition.exitCode})`}`);

	await runSkill(
		"create-plan",
		`Use the Skill tool to invoke the 'create-plan' skill for slice "${sliceName}".
Create a focused implementation plan. Keep it simple — 2-3 phases max.`,
		{ logFile: `phase2-plan-${sliceName}.log` },
	);

	await runSkill(
		"refine-plan",
		`Use the Skill tool to invoke the 'refine-plan' skill for slice "${sliceName}".
Refine the plan. Keep it concise — 2-3 review iterations.`,
		{ logFile: `phase2-refine-${sliceName}.log`, maxBudgetUsd: 15, maxTurns: 300 },
	);

	await runSkill(
		"implement-plan",
		`Use the Skill tool to invoke the 'implement-plan' skill for slice "${sliceName}".
Implement the refined plan. Write actual TypeScript code.`,
		{ logFile: `phase2-implement-${sliceName}.log`, maxBudgetUsd: 20, maxTurns: 400 },
	);

	await runSkill(
		"complete",
		`Use the Skill tool to invoke the 'complete' skill for slice "${sliceName}".
Complete the slice — synthesize learnings, update architecture.`,
		{ logFile: `phase2-complete-${sliceName}.log` },
	);

	const sliceData = goodplanJson<{ status: string }>(["slice:show", "--slice", sliceName, "--json"]);
	console.log(`  Slice ${sliceName} final status: ${sliceData.status}`);
}

async function phase2EpicComplete(): Promise<void> {
	console.log("\n[Phase 2] Step: Complete Epic");

	await runSkill(
		"complete",
		`Use the Skill tool to invoke the 'complete' skill.
Complete the epic "core-provider". Synthesize learnings, reconcile architecture layers.`,
		{ logFile: "phase2-complete-epic.log" },
	);

	const data = goodplanJson<{ status: string }>(["epic:show", "--epic", "core-provider", "--json"]);
	console.log(`  Epic core-provider final status: ${data.status}`);
}

// ─── Phase 2 Orchestrator ────────────────────────────────────

async function runPhase2(): Promise<void> {
	console.log("\n" + "═".repeat(60));
	console.log("  PHASE 2: First Epic Full Lifecycle");
	console.log("═".repeat(60));

	await phase2Explore();
	await phase2Architecture();
	await phase2RefineArchitecture();
	await phase2Slices();
	await phase2Activate();

	// Run each slice
	const slices = goodplanJson<{ items: Array<{ name: string }> }>(["slice:list", "--json"]);
	for (const slice of slices.items) {
		await phase2SliceCycle(slice.name);
	}

	await phase2EpicComplete();

	console.log("\n" + "═".repeat(60));
	console.log("  PHASE 2 COMPLETE");
	console.log("═".repeat(60));
}

// ─── Entry Point ─────────────────────────────────────────────

const [phase, step] = process.argv.slice(2);

if (!phase) {
	console.log("Usage: bun tools/dogfood/harness.ts <phase> [step]");
	console.log("");
	console.log("  phase: 2 | 3 | 4");
	console.log("");
	console.log("  Phase 2 steps:");
	console.log("    explore        — Run /explore on core-provider epic");
	console.log("    architecture   — Run /create-architecture");
	console.log("    refine-arch    — Run /refine-architecture");
	console.log("    slices         — Run /create-slices + /refine-slices");
	console.log("    activate       — Add verification + epic:activate");
	console.log("    slice:<name>   — Full slice cycle (plan → implement → complete)");
	console.log("    complete       — Run /complete for epic");
	console.log("");
	console.log("  No step = run full phase");
	process.exit(1);
}

switch (phase) {
	case "2":
		if (step) {
			switch (step) {
				case "explore":
					await phase2Explore();
					break;
				case "architecture":
					await phase2Architecture();
					break;
				case "refine-arch":
					await phase2RefineArchitecture();
					break;
				case "slices":
					await phase2Slices();
					break;
				case "activate":
					await phase2Activate();
					break;
				case "complete":
					await phase2EpicComplete();
					break;
				default:
					if (step.startsWith("slice:")) {
						await phase2SliceCycle(step.slice(6));
					} else {
						console.error(`Unknown step: ${step}`);
						process.exit(1);
					}
			}
		} else {
			await runPhase2();
		}
		break;
	case "3":
		console.log("Phase 3 not yet implemented");
		break;
	case "4":
		console.log("Phase 4 not yet implemented");
		break;
	default:
		console.error(`Unknown phase: ${phase}`);
		process.exit(1);
}

console.log("\n[harness] Done.");
