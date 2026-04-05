/**
 * Dogfooding test harness — runs goodplan skills in the nondet-eval repo
 * using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/harness.ts [phase] [step] [--model <model>]
 *   phase: reset | 2 | 3 | 4 (Phase 1 already complete)
 *   step: optional step within the phase (e.g., "explore", "architecture")
 *
 * Examples:
 *   bun tools/dogfood/harness.ts reset           # Reset nondet-eval to clean state
 *   bun tools/dogfood/harness.ts 2 explore        # Just run explore
 *   bun tools/dogfood/harness.ts 2                # Full Phase 2
 *   bun tools/dogfood/harness.ts 2 slice:provider-scaffold  # One slice cycle
 *   bun tools/dogfood/harness.ts 2 --model claude-haiku-4-5  # Override model
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
import { join, resolve } from "node:path";
import {
	type CliResult,
	createSimulatedUser,
	createTestEnv,
	gp,
	gpForce,
	gpJson,
	isSuccess,
	parseModel,
	runSkillSession,
	tierDefault,
} from "./utils";

// ─── Environment Validation ─────────────────────────────────

const HOME = process.env.HOME;
if (!HOME) {
	console.error("FATAL: HOME environment variable is not set");
	process.exit(1);
}

const NONDET_EVAL_DIR = join(HOME, "Repos/nondet-eval");
const GOODPLAN_DIR = join(import.meta.dir, "../..");
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");
const LOG_DIR = join(import.meta.dir, "logs");
const FRICTION_LOG = join(LOG_DIR, "friction-log.md");
const MODEL = parseModel(tierDefault("structural"));

mkdirSync(LOG_DIR, { recursive: true });

// Create friction log with header if absent
if (!existsSync(FRICTION_LOG)) {
	writeFileSync(
		FRICTION_LOG,
		"# Dogfood Harness Friction Log\n\n| # | Severity | Source | Issue |\n|---|---|---|---|\n",
	);
}

// Aggregate cost tracking across all skill runs
let totalCostUsd = 0;

// Aggregate violation tracking across all skill runs
const allViolations: string[] = [];

// ─── CLI Helpers (project-scoped wrappers) ───────────────────

function gpLocal(args: string[], opts: { cwd?: string; stdin?: string } = {}): CliResult {
	return gp(args, {
		cwd: opts.cwd ?? NONDET_EVAL_DIR,
		...(opts.stdin !== undefined ? { stdin: opts.stdin } : {}),
	});
}

function gpLocalJson<T>(args: string[], opts?: { cwd?: string; stdin?: string }): T {
	return gpJson<T>(args, {
		cwd: opts?.cwd ?? NONDET_EVAL_DIR,
		...(opts?.stdin !== undefined ? { stdin: opts.stdin } : {}),
	});
}

function gpLocalForce(
	args: string[],
	opts: { cwd?: string; stdin?: string } = {},
): CliResult & { retried: boolean } {
	return gpForce(args, {
		cwd: opts.cwd ?? NONDET_EVAL_DIR,
		...(opts.stdin !== undefined ? { stdin: opts.stdin } : {}),
	});
}

/**
 * Interpret a goodplan exit code for recovery decisions.
 * - exit 0: success
 * - exit 2: validation/usage error (fix invocation)
 * - exit 3: state machine error (check idempotent re-entry, recoverable)
 * - exit 1: internal error (stop)
 */
function describeExitCode(exitCode: number): string {
	switch (exitCode) {
		case 0:
			return "success";
		case 2:
			return "validation/usage error (fix invocation)";
		case 3:
			return "state machine error (potentially recoverable)";
		default:
			return `internal error (exit ${exitCode})`;
	}
}

function epicStatus(epicName = "core-provider"): string {
	try {
		const data = gpLocalJson<{ status: string }>(["epic:show", "--epic", epicName, "--json"]);
		return data.status;
	} catch {
		// Check if the epic was archived (~~archived~~ rename by /complete skill)
		try {
			const epicsDir = join(NONDET_EVAL_DIR, ".goodplan/epics");
			const entries = execFileSync("ls", [epicsDir], { encoding: "utf-8" }).trim().split("\n");
			const archived = entries.find((e) => e.includes(epicName) && e.startsWith("~~archived~~"));
			if (archived) {
				return "archived";
			}
		} catch {
			// ignore
		}
		throw new Error(`epic:show --epic ${epicName} failed: entity not found`);
	}
}

function projectStatus(): { activeEpic: { name: string } | null } {
	return gpLocalJson<{ activeEpic: { name: string } | null }>(["status", "--json"]);
}

// ─── Logging ─────────────────────────────────────────────────

function logFriction(severity: string, source: string, message: string): void {
	// Count existing entries to get the next number
	let nextNum = 1;
	try {
		const lines = readFileSync(FRICTION_LOG, "utf-8").split("\n");
		const entryCount = lines.filter(
			(l) => l.startsWith("|") && !l.startsWith("| #") && !l.startsWith("|---"),
		).length;
		nextNum = entryCount + 1;
	} catch {
		// File doesn't exist yet — will be created by appendFileSync
	}
	const entry = `| ${nextNum} | ${severity} | ${source} | ${message} |`;
	appendFileSync(FRICTION_LOG, `\n${entry}`);
	console.log(`  [friction #${nextNum}] ${severity}: ${message.slice(0, 120)}`);
}

function log(file: string, content: string): void {
	appendFileSync(join(LOG_DIR, file), `${content}\n`);
}

// ─── Simulated User ─────────────────────────────────────────

const SIMULATED_USER_PROMPT = `You are a developer building nondet-eval: a TypeScript eval framework on Promptfoo for measuring skill quality via Monte Carlo execution.
When asked questions, make reasonable choices:
- For architecture questions: keep it simple (3-4 modules, TypeScript, Bun, JSON output, CLI only)
- For naming: use descriptive kebab-case names
- For approval prompts: approve and continue
- For "is this ready?" questions: yes, proceed
- Keep all work focused and concise — this is a small eval framework, not a production system.
- Epic: core-provider (Core Provider & Basic Execution).
- Always complete CLI state transitions (submit-explore, submit-architecture, etc.) before finishing.`;

// ─── Skill Runner ────────────────────────────────────────────

async function runSkill(
	skillName: string,
	prompt: string,
	opts: {
		maxTurns?: number;
		maxBudgetUsd?: number;
		logFile?: string;
		model?: string;
	} = {},
): Promise<{ result: string; costUsd: number }> {
	const { maxTurns = 200, maxBudgetUsd = 8, logFile, model = MODEL } = opts;
	const logName = logFile ?? `${skillName}-${Date.now()}.log`;
	const transcriptFile = join(LOG_DIR, `${logName.replace(".log", "")}-transcript.jsonl`);
	const startTime = Date.now();

	console.log(`\n  ┌─ Running skill: ${skillName}`);
	console.log(`  │  model=${model}, maxTurns=${maxTurns}, maxBudget=$${maxBudgetUsd}`);

	log(
		logName,
		`\n${"=".repeat(60)}\n[${new Date().toISOString()}] Skill: ${skillName}\n${"=".repeat(60)}\n`,
	);
	log(logName, `Prompt:\n${prompt}\n`);

	const simulatedUser = createSimulatedUser({
		cwd: NONDET_EVAL_DIR,
		systemPrompt: SIMULATED_USER_PROMPT,
		transcriptFile,
	});

	let result = "";
	let costUsd = 0;

	try {
		const session = await runSkillSession({
			prompt,
			options: {
				cwd: NONDET_EVAL_DIR,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns,
				maxBudgetUsd,
				model,
				settingSources: [],
				env: createTestEnv(PLUGIN_DIR),
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: `Use ${model} for ALL Agent sub-agent calls.`,
				},
			},
			transcriptFile,
			simulatedUser,
			checkViolations: true,
			onMessage: (message) => {
				if (message.type === "assistant") {
					const raw = message as Record<string, unknown>;
					const inner =
						typeof raw.message === "object" && raw.message !== null
							? (raw.message as Record<string, unknown>)
							: undefined;
					const content =
						inner && Array.isArray(inner.content)
							? (inner.content as Array<{ type: string; name?: string; text?: string }>)
							: [];
					for (const block of content) {
						if (block.type === "tool_use") {
							log(logName, `[tool_use] ${block.name}`);
						}
					}
					// Log text content length
					const textBlocks = content.filter((b) => b.type === "text");
					if (textBlocks.length > 0) {
						const totalLen = textBlocks.reduce(
							(sum, b) => sum + (typeof b.text === "string" ? b.text.length : 0),
							0,
						);
						log(logName, `[assistant] ${totalLen} chars text`);
					}
				} else if (message.type === "system") {
					const sysMsg = message as Record<string, unknown>;
					if (sysMsg.subtype === "init") {
						if ("skills" in sysMsg && Array.isArray(sysMsg.skills)) {
							log(logName, `[system:init] skills loaded: ${JSON.stringify(sysMsg.skills)}`);
							console.log(`  │  [init] skills: ${JSON.stringify(sysMsg.skills)}`);
							if (!sysMsg.skills.includes(skillName)) {
								console.warn(
									`  │  WARNING: expected skill "${skillName}" not found in loaded skills`,
								);
								logFriction(
									"important",
									"runSkill",
									`Skill "${skillName}" not in init skills list: ${JSON.stringify(sysMsg.skills)}`,
								);
							}
						}
					} else if (sysMsg.subtype === "task_started") {
						const desc = typeof sysMsg.description === "string" ? sysMsg.description : "unknown";
						log(logName, `[subagent:started] ${desc}`);
						console.log(`  │  [subagent] started: ${desc.slice(0, 80)}`);
					} else if (sysMsg.subtype === "task_notification") {
						const status = typeof sysMsg.status === "string" ? sysMsg.status : "unknown";
						const summary = typeof sysMsg.summary === "string" ? sysMsg.summary : "";
						log(logName, `[subagent:${status}] ${summary.slice(0, 200)}`);
						console.log(`  │  [subagent] ${status}: ${summary.slice(0, 80)}`);
					} else {
						const brief = JSON.stringify(message).slice(0, 300);
						log(logName, `[system:${String(sysMsg.subtype)}] ${brief}`);
					}
				}
			},
		});

		costUsd = session.totalCost;
		totalCostUsd += costUsd;

		if (isSuccess(session.result)) {
			result = session.result.result;
			log(
				logName,
				`\n--- RESULT (${result.length} chars, $${costUsd.toFixed(4)}) ---\n${result.slice(0, 2000)}`,
			);
		} else {
			log(logName, `\n--- ERROR RESULT (${session.result.subtype}) ---`);
		}

		if (session.violations.length > 0) {
			allViolations.push(...session.violations);
			for (const v of session.violations) {
				log(logName, `[VIOLATION] ${v}`);
				console.warn(`  │  VIOLATION: ${v}`);
				logFriction("important", `Direct access: ${skillName}`, v);
			}
		}
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		log(logName, `\n[ERROR] ${errMsg}`);
		console.error(`  │  ERROR: ${errMsg.slice(0, 200)}`);
	}

	simulatedUser.close();
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`  │  ${elapsed}s, $${costUsd.toFixed(4)}`);
	console.log(`  └─ Done: ${skillName}\n`);

	log(
		logName,
		`\n--- STATS ---\nElapsed: ${elapsed}s\nCost: $${costUsd.toFixed(4)}\nTotal cost so far: $${totalCostUsd.toFixed(4)}\n`,
	);
	return { result, costUsd };
}

// ─── CLI Result Helper ──────────────────────────────────────

function logCliResult(label: string, result: CliResult): void {
	console.log(
		`  ${label}: ${result.exitCode === 0 ? "OK" : `FAIL (exit ${result.exitCode}) — ${describeExitCode(result.exitCode)}`}`,
	);
}

// ─── Reset Command ───────────────────────────────────────────

function reset(): void {
	console.log("\n[harness] Resetting nondet-eval to clean state...");

	// Delete .goodplan/ if it exists
	const goodplanDir = join(NONDET_EVAL_DIR, ".goodplan");
	if (existsSync(goodplanDir)) {
		try {
			rmSync(goodplanDir, { recursive: true, force: true });
			console.log("  Deleted .goodplan/");
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`  FATAL: Failed to delete .goodplan/: ${msg}`);
			process.exit(1);
		}
		// Verify removal
		if (existsSync(goodplanDir)) {
			console.error("  FATAL: .goodplan/ still exists after deletion");
			process.exit(1);
		}
	} else {
		console.log("  .goodplan/ does not exist (first run)");
	}

	// Init project
	const initResult = gpLocal(["init", "--name", "nondet-eval", "--json"]);
	if (initResult.exitCode !== 0) {
		console.error(
			`  FATAL: goodplan init failed (exit ${initResult.exitCode}): ${describeExitCode(initResult.exitCode)}`,
		);
		console.error(`  stdout: ${initResult.stdout.slice(0, 300)}`);
		process.exit(1);
	}
	console.log("  goodplan init: OK");

	// Create epic
	const epicPayload = JSON.stringify({
		name: "core-provider",
		goal: "Implement a core provider for running Claude skills via Promptfoo ApiProvider, with statistical aggregation and CLI entry point",
	});
	const epicResult = gpLocal(["epic:create", "--json"], { stdin: epicPayload });
	if (epicResult.exitCode !== 0) {
		console.error(
			`  FATAL: epic:create failed (exit ${epicResult.exitCode}): ${describeExitCode(epicResult.exitCode)}`,
		);
		console.error(`  stdout: ${epicResult.stdout.slice(0, 300)}`);
		process.exit(1);
	}
	console.log("  epic:create core-provider: OK");

	// Verify
	const statusResult = gpLocal(["status", "--json"]);
	if (statusResult.exitCode !== 0) {
		console.error("  WARNING: status check failed after reset");
	} else {
		console.log(`  Status: ${statusResult.stdout.slice(0, 200)}`);
	}

	console.log("  Reset complete\n");
}

// ─── Entity Status Helpers ──────────────────────────────────

function sliceStatus(sliceName: string): string {
	return gpLocalJson<{ status: string }>(["slice:show", "--slice", sliceName, "--json"]).status;
}

function questStatus(questName: string): string {
	return gpLocalJson<{ status: string }>(["quest:show", "--quest", questName, "--json"]).status;
}

// ─── Phase 2 Steps ───────────────────────────────────────────

async function phase2Explore(): Promise<void> {
	console.log("\n[Phase 2] Step: Explore");

	// Check current state
	const status = epicStatus();
	console.log(`  Epic status: ${status}`);

	if (status === "created") {
		// Need to transition to exploring first
		const r = gpLocal(["epic:explore", "--epic", "core-provider", "--json"]);
		console.log(
			`  epic:explore: ${r.exitCode === 0 ? "OK" : `FAIL (exit ${r.exitCode}) — ${describeExitCode(r.exitCode)}`}`,
		);
		if (r.exitCode !== 0) {
			throw new Error(`Failed to transition to exploring: exit ${r.exitCode}`);
		}
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

	// Verify and fix state — submit-explore fallback
	const afterStatus = epicStatus();
	console.log(`  Epic status after explore: ${afterStatus}`);
	if (afterStatus === "exploring") {
		console.log("  Completing explore transition manually...");
		const ecPath = join(NONDET_EVAL_DIR, ".goodplan/epics/core-provider/explore-complete.md");
		if (!existsSync(ecPath)) {
			writeFileSync(ecPath, "# Explore Complete\n\nResearch and brainstorming complete.\n");
		}
		const submitResult = gpLocal(["submit-explore", "--epic", "core-provider", "--json"]);
		if (submitResult.exitCode !== 0) {
			console.error(
				`  submit-explore fallback failed: exit ${submitResult.exitCode} — ${describeExitCode(submitResult.exitCode)}`,
			);
		} else {
			const finalStatus = epicStatus();
			console.log(`  Epic status after submit-explore fallback: ${finalStatus}`);
		}
		logFriction(
			"minor",
			"Skill: /explore",
			"Skill did not complete submit-explore transition — manual fallback used",
		);
	}

	// Verify research files exist
	const researchDir = join(NONDET_EVAL_DIR, ".goodplan/epics/core-provider/research");
	if (existsSync(researchDir)) {
		console.log("  Research directory exists");
	} else {
		console.log("  WARNING: Research directory not found");
		logFriction(
			"important",
			"phase2Explore",
			"Research directory not created during explore phase",
		);
	}
}

async function phase2Architecture(): Promise<void> {
	console.log("\n[Phase 2] Step: Create Architecture");

	// Transition to defining-architecture (required before skill can run)
	const status = epicStatus();
	console.log(`  Epic status: ${status}`);
	if (status === "explored") {
		const r = gpLocal(["epic:define-architecture", "--epic", "core-provider", "--json"]);
		console.log(
			`  epic:define-architecture: ${r.exitCode === 0 ? "OK" : `FAIL (exit ${r.exitCode}) — ${describeExitCode(r.exitCode)}`}`,
		);
		if (r.exitCode !== 0) {
			throw new Error(`Failed to transition to defining-architecture: exit ${r.exitCode}`);
		}
		const afterTransition = epicStatus();
		if (afterTransition !== "defining-architecture") {
			throw new Error(
				`Expected defining-architecture after epic:define-architecture, got ${afterTransition}`,
			);
		}
		console.log(`  Epic status after transition: ${afterTransition}`);
	}

	await runSkill(
		"create-architecture",
		`Use the Skill tool to invoke the 'create-architecture' skill.
The epic is core-provider. Define a simple architecture:
- Provider module: Promptfoo ApiProvider that runs Claude skills via subprocess
- Stats module: Online aggregation (Welford's algorithm), bootstrap confidence intervals
- CLI module: Entry point that ties provider + stats, outputs JSON results
Write architecture files to the epic's architecture/ directory.
Also write .goodplan/conventions.md with TypeScript/Bun conventions.
When done, call: goodplan submit-architecture --epic core-provider --json`,
		{ logFile: "phase2-architecture.log", maxBudgetUsd: 10 },
	);

	// State recovery: if skill didn't submit, do it manually
	const afterStatus = epicStatus();
	console.log(`  Epic status after architecture skill: ${afterStatus}`);
	if (afterStatus === "defining-architecture") {
		console.log("  Completing architecture transition manually...");
		const submitResult = gpLocal(["submit-architecture", "--epic", "core-provider", "--json"]);
		if (submitResult.exitCode !== 0) {
			console.error(
				`  submit-architecture fallback failed: exit ${submitResult.exitCode} — ${describeExitCode(submitResult.exitCode)}`,
			);
		} else {
			console.log("  submit-architecture fallback: OK");
		}
		logFriction(
			"minor",
			"Skill: /create-architecture",
			"Skill did not complete submit-architecture transition — manual fallback used",
		);
	}

	// Verify architecture files exist
	const archDir = join(NONDET_EVAL_DIR, ".goodplan/epics/core-provider/architecture");
	if (existsSync(archDir)) {
		console.log("  Architecture directory exists");
	} else {
		console.log("  WARNING: Architecture directory not found");
		logFriction(
			"important",
			"phase2Architecture",
			"Architecture directory not created during architecture phase",
		);
	}

	const finalStatus = epicStatus();
	console.log(`  Epic status after architecture: ${finalStatus}`);
}

async function phase2RefineArchitecture(): Promise<void> {
	console.log("\n[Phase 2] Step: Refine Architecture");

	// Transition to refining-architecture (required before skill can run)
	const status = epicStatus();
	console.log(`  Epic status: ${status}`);
	if (status === "architecture-defined") {
		const r = gpLocal(["epic:refine-architecture", "--epic", "core-provider", "--json"]);
		console.log(
			`  epic:refine-architecture: ${r.exitCode === 0 ? "OK" : `FAIL (exit ${r.exitCode}) — ${describeExitCode(r.exitCode)}`}`,
		);
		if (r.exitCode !== 0) {
			throw new Error(`Failed to transition to refining-architecture: exit ${r.exitCode}`);
		}
		const afterTransition = epicStatus();
		if (afterTransition !== "refining-architecture") {
			throw new Error(
				`Expected refining-architecture after epic:refine-architecture, got ${afterTransition}`,
			);
		}
		console.log(`  Epic status after transition: ${afterTransition}`);
	}

	await runSkill(
		"refine-architecture",
		`Use the Skill tool to invoke the 'refine-architecture' skill.
Refine the architecture for epic core-provider. Keep it concise — 2-3 iterations max.
This is a small project; don't over-engineer.
When done, submit scores via: echo '{"scores":{"completeness":8,"correctness":8,"clarity":8}}' | goodplan submit-refine-architecture --epic core-provider --override --json`,
		{
			logFile: "phase2-refine-architecture.log",
			maxBudgetUsd: 15,
			maxTurns: 300,
		},
	);

	// State recovery: if skill didn't submit, do it manually with --override
	const afterStatus = epicStatus();
	console.log(`  Epic status after refine-architecture skill: ${afterStatus}`);
	if (afterStatus === "refining-architecture") {
		console.log("  Completing refine-architecture transition manually...");
		const scores = JSON.stringify({
			scores: { completeness: 8, correctness: 8, clarity: 8 },
		});
		const submitResult = gpLocal(
			["submit-refine-architecture", "--epic", "core-provider", "--override", "--json"],
			{ stdin: scores },
		);
		if (submitResult.exitCode !== 0) {
			console.error(
				`  submit-refine-architecture fallback failed: exit ${submitResult.exitCode} — ${describeExitCode(submitResult.exitCode)}`,
			);
		} else {
			console.log("  submit-refine-architecture fallback: OK");
		}
		logFriction(
			"minor",
			"Skill: /refine-architecture",
			"Skill did not complete submit-refine-architecture transition — manual fallback used",
		);
	}

	const finalStatus = epicStatus();
	console.log(`  Epic status after refine-architecture: ${finalStatus}`);
}

async function phase2Slices(): Promise<void> {
	console.log("\n[Phase 2] Step: Create & Refine Slices");

	// Transition to defining-slices (required before /create-slices skill can run)
	const status = epicStatus();
	console.log(`  Epic status: ${status}`);
	if (status === "architecture-refined") {
		const r = gpLocal(["epic:define-slices", "--epic", "core-provider", "--json"]);
		console.log(
			`  epic:define-slices: ${r.exitCode === 0 ? "OK" : `FAIL (exit ${r.exitCode}) — ${describeExitCode(r.exitCode)}`}`,
		);
		if (r.exitCode !== 0) {
			throw new Error(`Failed to transition to defining-slices: exit ${r.exitCode}`);
		}
		const afterTransition = epicStatus();
		if (afterTransition !== "defining-slices") {
			throw new Error(`Expected defining-slices after epic:define-slices, got ${afterTransition}`);
		}
		console.log(`  Epic status after transition: ${afterTransition}`);
	}

	await runSkill(
		"create-slices",
		`Use the Skill tool to invoke the 'create-slices' skill.
Define 2 small slices for epic core-provider:
1. "provider-scaffold" — Promptfoo ApiProvider + basic stats aggregation + test
2. "cli-runner" — CLI entry point that runs evals end-to-end + JSON output
Keep slices small and focused.
When done, call: goodplan submit-slices --epic core-provider --json`,
		{ logFile: "phase2-create-slices.log" },
	);

	// State recovery for create-slices
	let afterCreate = epicStatus();
	console.log(`  Epic status after create-slices skill: ${afterCreate}`);
	if (afterCreate === "defining-slices") {
		console.log("  Completing submit-slices transition manually...");
		const submitResult = gpLocal(["submit-slices", "--epic", "core-provider", "--json"]);
		if (submitResult.exitCode !== 0) {
			console.error(
				`  submit-slices fallback failed: exit ${submitResult.exitCode} — ${describeExitCode(submitResult.exitCode)}`,
			);
		} else {
			console.log("  submit-slices fallback: OK");
			afterCreate = epicStatus();
		}
		logFriction(
			"minor",
			"Skill: /create-slices",
			"Skill did not complete submit-slices transition — manual fallback used",
		);
	}

	// Transition to refining-slices (required before /refine-slices skill can run)
	const preRefineStatus = epicStatus();
	console.log(`  Epic status before refine-slices: ${preRefineStatus}`);
	if (preRefineStatus === "slices-defined") {
		const r = gpLocal(["epic:refine-slices", "--epic", "core-provider", "--json"]);
		console.log(
			`  epic:refine-slices: ${r.exitCode === 0 ? "OK" : `FAIL (exit ${r.exitCode}) — ${describeExitCode(r.exitCode)}`}`,
		);
		if (r.exitCode !== 0) {
			throw new Error(`Failed to transition to refining-slices: exit ${r.exitCode}`);
		}
		const afterTransition = epicStatus();
		if (afterTransition !== "refining-slices") {
			throw new Error(`Expected refining-slices after epic:refine-slices, got ${afterTransition}`);
		}
		console.log(`  Epic status after transition: ${afterTransition}`);
	}

	await runSkill(
		"refine-slices",
		`Use the Skill tool to invoke the 'refine-slices' skill.
Refine the slices for epic core-provider. Quick review — 1-2 iterations.
When done, submit scores via: echo '{"scores":{"completeness":8,"correctness":8,"clarity":8}}' | goodplan submit-refine-slices --epic core-provider --override --json`,
		{ logFile: "phase2-refine-slices.log", maxBudgetUsd: 12 },
	);

	// State recovery for refine-slices
	const afterRefine = epicStatus();
	console.log(`  Epic status after refine-slices skill: ${afterRefine}`);
	if (afterRefine === "refining-slices") {
		console.log("  Completing submit-refine-slices transition manually...");
		const scores = JSON.stringify({
			scores: { completeness: 8, correctness: 8, clarity: 8 },
		});
		const submitResult = gpLocal(
			["submit-refine-slices", "--epic", "core-provider", "--override", "--json"],
			{ stdin: scores },
		);
		if (submitResult.exitCode !== 0) {
			console.error(
				`  submit-refine-slices fallback failed: exit ${submitResult.exitCode} — ${describeExitCode(submitResult.exitCode)}`,
			);
		} else {
			console.log("  submit-refine-slices fallback: OK");
		}
		logFriction(
			"minor",
			"Skill: /refine-slices",
			"Skill did not complete submit-refine-slices transition — manual fallback used",
		);
	}

	// Verify slices created
	const slices = gpLocalJson<{
		items: Array<{ name: string; status: string }>;
	}>(["slice:list", "--epic", "core-provider", "--json"]);
	const sliceItems = slices.items;
	if (!Array.isArray(sliceItems)) {
		throw new Error(
			`slice:list returned unexpected shape — missing items array: ${JSON.stringify(slices)}`,
		);
	}
	console.log(
		`  Slices: ${JSON.stringify(sliceItems.map((s: { name: string; status: string }) => `${s.name}:${s.status}`))}`,
	);
}

async function phase2Activate(): Promise<void> {
	console.log("\n[Phase 2] Step: Activate Epic");

	// Pre-condition: epic must be in slices-refined state
	const epicState = epicStatus();
	console.log(`  Epic status: ${epicState}`);
	if (epicState === "active") {
		console.log("  Epic already active — skipping activation");
		return;
	}
	if (epicState !== "slices-refined") {
		throw new Error(`phase2Activate requires epic in slices-refined state, got: ${epicState}`);
	}

	const verPayload = JSON.stringify({
		verification: {
			description: "All slices pass bun tsc --noEmit and tests",
			status: "pending",
			addedDuring: "slices",
			modifiedDuring: null,
		},
	});

	const addVer = gpLocal(["epic:add-verification", "--epic", "core-provider", "--json"], {
		stdin: verPayload,
	});
	logCliResult("add-verification", addVer);

	const activate = gpLocal(["epic:activate", "--epic", "core-provider", "--json"]);
	logCliResult("activate", activate);

	const ps = projectStatus();
	console.log(`  Active epic: ${ps.activeEpic?.name ?? "none"}`);
}

async function phase2SliceCycle(sliceName: string): Promise<void> {
	console.log(`\n[Phase 2] Step: Slice cycle — ${sliceName}`);

	// Step 1: slice:plan — activate slice for planning (skip if already past created)
	let currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status: ${currentStatus}`);
	if (currentStatus === "created") {
		const planTransition = gpLocal(["slice:plan", "--slice", sliceName, "--json"]);
		logCliResult("slice:plan", planTransition);
		if (planTransition.exitCode !== 0) {
			throw new Error(`Failed to start planning for ${sliceName}: exit ${planTransition.exitCode}`);
		}
	} else {
		console.log(`  Skipping slice:plan — slice already in ${currentStatus} state`);
	}

	// Step 2: Run /create-plan skill
	await runSkill(
		"create-plan",
		`Use the Skill tool to invoke the 'create-plan' skill for slice "${sliceName}".
Create a focused implementation plan. Keep it simple — 2-3 phases max.
When done, call: echo '' | goodplan submit-plan --slice ${sliceName} --json`,
		{ logFile: `phase2-plan-${sliceName}.log` },
	);

	// Step 3: submit-plan (planning -> plan-created)
	currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status after create-plan: ${currentStatus}`);
	if (currentStatus === "planning") {
		console.log("  Submitting plan manually...");
		const submitPlan = gpLocal(["submit-plan", "--slice", sliceName, "--json"], { stdin: "" });
		logCliResult("submit-plan", submitPlan);
		if (submitPlan.exitCode !== 0) {
			console.error(`  submit-plan failed: exit ${submitPlan.exitCode}`);
		}
		logFriction(
			"minor",
			"Skill: /create-plan",
			`Skill did not complete submit-plan for ${sliceName} — manual fallback used`,
		);
	}

	// Step 4: slice:refine-plan (plan-created -> refining)
	currentStatus = sliceStatus(sliceName);
	if (currentStatus === "plan-created") {
		const refineTransition = gpLocal(["slice:refine-plan", "--slice", sliceName, "--json"]);
		logCliResult("slice:refine-plan", refineTransition);
		if (refineTransition.exitCode !== 0) {
			throw new Error(
				`Failed to start refining for ${sliceName}: exit ${refineTransition.exitCode}`,
			);
		}
	}

	// Step 5: Run /refine-plan skill
	await runSkill(
		"refine-plan",
		`Use the Skill tool to invoke the 'refine-plan' skill for slice "${sliceName}".
Refine the plan. Keep it concise — 1-2 review iterations.
When done, submit scores via: echo '{"scores":{"completeness":8,"correctness":8,"clarity":8}}' | goodplan submit-refinement --slice ${sliceName} --override --json`,
		{
			logFile: `phase2-refine-${sliceName}.log`,
			maxBudgetUsd: 15,
			maxTurns: 300,
		},
	);

	// Step 6: submit-refinement (refining -> plan-refined) with --override
	currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status after refine-plan: ${currentStatus}`);
	if (currentStatus === "refining") {
		console.log("  Submitting refinement manually...");
		const scores = JSON.stringify({
			scores: { completeness: 8, correctness: 8, clarity: 8 },
		});
		const submitRefine = gpLocal(
			["submit-refinement", "--slice", sliceName, "--override", "--json"],
			{ stdin: scores },
		);
		logCliResult("submit-refinement", submitRefine);
		if (submitRefine.exitCode !== 0) {
			console.error(`  submit-refinement failed: exit ${submitRefine.exitCode}`);
		}
		logFriction(
			"minor",
			"Skill: /refine-plan",
			`Skill did not complete submit-refinement for ${sliceName} — manual fallback used`,
		);
	}

	// Step 7: slice:implement (plan-refined -> implementing)
	// Fix-up: ensure plan-refined.md exists (the CLI guard requires it)
	currentStatus = sliceStatus(sliceName);
	if (currentStatus === "plan-refined") {
		const sliceDir = join(NONDET_EVAL_DIR, ".goodplan/slices", sliceName);
		const refiningPath = join(sliceDir, "plan-refining.md");
		const refinedPath = join(sliceDir, "plan-refined.md");
		const planPath = join(sliceDir, "plan.md");
		if (!existsSync(refinedPath)) {
			if (existsSync(refiningPath)) {
				execFileSync("mv", [refiningPath, refinedPath]);
				console.log(`  Fixed: renamed plan-refining.md -> plan-refined.md for ${sliceName}`);
				logFriction(
					"minor",
					"Skill: /refine-plan",
					`plan-refining.md not renamed for ${sliceName}`,
				);
			} else if (existsSync(planPath)) {
				execFileSync("cp", [planPath, refinedPath]);
				console.log(
					`  Fixed: copied plan.md -> plan-refined.md for ${sliceName} (no refinement file created)`,
				);
				logFriction(
					"important",
					"Skill: /refine-plan",
					`Neither plan-refining.md nor plan-refined.md created for ${sliceName} — copied plan.md as fallback`,
				);
			}
		}

		const implTransition = gpLocal(["slice:implement", "--slice", sliceName, "--json"]);
		logCliResult("slice:implement", implTransition);
		if (implTransition.exitCode !== 0) {
			throw new Error(
				`Failed to start implementing for ${sliceName}: exit ${implTransition.exitCode}`,
			);
		}
	}

	// Step 8: Run /implement-plan skill
	await runSkill(
		"implement-plan",
		`Use the Skill tool to invoke the 'implement-plan' skill for slice "${sliceName}".
Implement the refined plan. Write actual TypeScript code.
When done, call: echo '' | goodplan submit-implementation --slice ${sliceName} --json`,
		{
			logFile: `phase2-implement-${sliceName}.log`,
			maxBudgetUsd: 20,
			maxTurns: 400,
		},
	);

	// Step 9: submit-implementation (implementing -> implementation-complete)
	currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status after implement-plan: ${currentStatus}`);
	if (currentStatus === "implementing") {
		console.log("  Submitting implementation manually...");
		const submitResult = gpLocalForce(["submit-implementation", "--slice", sliceName, "--json"]);
		logCliResult("submit-implementation", submitResult);
		if (submitResult.retried) {
			logFriction(
				"minor",
				"CLI: concurrent-mod",
				`Used --force to recover from CONCURRENT_MODIFICATION for ${sliceName}`,
			);
		}
		logFriction(
			"minor",
			"Skill: /implement-plan",
			`Skill did not complete submit-implementation for ${sliceName} — manual fallback used`,
		);
	}

	// Step 10: slice:complete (implementation-complete -> completed)
	currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status before complete: ${currentStatus}`);
	if (currentStatus === "implementation-complete") {
		const completePayload = JSON.stringify({
			verificationPassed: true,
			deferred: [],
			learnings: [],
			architectureDelta: [],
		});
		const completeResult = gpLocalForce(["slice:complete", "--slice", sliceName, "--json"], {
			stdin: completePayload,
		});
		logCliResult("slice:complete", completeResult);
		if (completeResult.exitCode !== 0) {
			console.error(`  slice:complete failed: exit ${completeResult.exitCode}`);
		}
	}

	const finalStatus = sliceStatus(sliceName);
	console.log(`  Slice ${sliceName} final status: ${finalStatus}`);
	if (finalStatus !== "completed") {
		logFriction(
			"important",
			`phase2SliceCycle(${sliceName})`,
			`Slice did not reach completed status — final status: ${finalStatus}`,
		);
	}
}

async function phase2EpicComplete(): Promise<void> {
	console.log("\n[Phase 2] Step: Complete Epic");

	const verificationResults = JSON.stringify([
		{ index: 0, passed: true, notes: "Harness automated verification" },
	]);

	await runSkill(
		"complete",
		`Use the Skill tool to invoke the 'complete' skill.
Complete the epic "core-provider". Synthesize learnings, reconcile architecture layers.
Verification results: ${verificationResults}. Call epic:complete with this payload.`,
		{ logFile: "phase2-complete-epic.log" },
	);

	// State recovery: if skill didn't complete the epic, do it manually
	const afterStatus = epicStatus();
	console.log(`  Epic status after complete skill: ${afterStatus}`);
	if (afterStatus !== "completed") {
		console.log("  Completing epic manually via CLI fallback...");
		const completePayload = JSON.stringify({
			verificationResults: [{ index: 0, passed: true, notes: "Harness automated verification" }],
		});
		const completeResult = gpLocalForce(["epic:complete", "--epic", "core-provider", "--json"], {
			stdin: completePayload,
		});
		logCliResult("epic:complete fallback", completeResult);
		if (completeResult.exitCode !== 0) {
			console.error(
				`  epic:complete fallback failed: exit ${completeResult.exitCode} — ${describeExitCode(completeResult.exitCode)}`,
			);
		}
		logFriction(
			"minor",
			"Skill: /complete",
			"Skill did not complete epic:complete transition — manual CLI fallback used",
		);
	}

	const finalStatus = epicStatus();
	console.log(`  Epic core-provider final status: ${finalStatus}`);
	if (finalStatus !== "completed") {
		logFriction(
			"important",
			"phase2EpicComplete",
			`Epic did not reach completed status — final status: ${finalStatus}`,
		);
	}
}

// ─── Phase 3: Quest Lifecycle ─────────────────────────────────

async function runPhase3(): Promise<void> {
	console.log(`\n${"═".repeat(60)}`);
	console.log("  PHASE 3: Quest Lifecycle");
	console.log(`${"═".repeat(60)}`);

	const questName = "add-readme";

	// Create quest
	console.log("\n[Phase 3] Step: Create Quest");
	const createPayload = JSON.stringify({
		name: questName,
		goal: "Add a README.md to the project",
	});
	const createResult = gpLocal(["quest:create", "--json"], { stdin: createPayload });
	logCliResult("quest:create", createResult);
	if (createResult.exitCode !== 0) {
		if (createResult.exitCode === 3) {
			console.log("  Quest already exists (exit 3) — skipping create");
		} else {
			throw new Error(`Failed to create quest: exit ${createResult.exitCode}`);
		}
	}

	// Step 1: quest:plan (created -> planning)
	console.log("\n[Phase 3] Step: Plan Quest");
	let currentStatus = questStatus(questName);
	console.log(`  Quest status: ${currentStatus}`);
	if (currentStatus === "created") {
		const planTransition = gpLocal(["quest:plan", "--quest", questName, "--json"]);
		logCliResult("quest:plan", planTransition);
		if (planTransition.exitCode !== 0) {
			throw new Error(
				`Failed to start planning for quest ${questName}: exit ${planTransition.exitCode}`,
			);
		}
	} else {
		console.log(`  Skipping quest:plan — quest already in ${currentStatus} state`);
	}

	// Step 2: Run /create-plan skill
	currentStatus = questStatus(questName);
	if (currentStatus === "planning") {
		await runSkill(
			"create-plan",
			`Use the Skill tool to invoke the 'create-plan' skill for quest "${questName}".
Create a focused implementation plan for adding a README.md. Keep it simple — 1-2 phases.
When done, call: echo '' | goodplan submit-plan --quest ${questName} --json`,
			{ logFile: `phase3-plan-${questName}.log` },
		);
	}

	// Step 3: submit-plan (planning -> plan-created)
	currentStatus = questStatus(questName);
	console.log(`  Quest status after create-plan: ${currentStatus}`);
	if (currentStatus === "planning") {
		console.log("  Submitting plan manually...");
		const submitPlan = gpLocal(["submit-plan", "--quest", questName, "--json"], { stdin: "" });
		logCliResult("submit-plan", submitPlan);
		if (submitPlan.exitCode !== 0) {
			console.error(`  submit-plan failed: exit ${submitPlan.exitCode}`);
		}
		logFriction(
			"minor",
			"Skill: /create-plan",
			`Skill did not complete submit-plan for quest ${questName} — manual fallback used`,
		);
	}

	// Step 4: quest:refine-plan (plan-created -> refining)
	currentStatus = questStatus(questName);
	console.log(`  Quest status before refine: ${currentStatus}`);
	if (currentStatus === "plan-created") {
		const refineTransition = gpLocal(["quest:refine-plan", "--quest", questName, "--json"]);
		logCliResult("quest:refine-plan", refineTransition);
		if (refineTransition.exitCode !== 0) {
			throw new Error(
				`Failed to start refining for quest ${questName}: exit ${refineTransition.exitCode}`,
			);
		}
	} else {
		console.log(`  Skipping quest:refine-plan — quest already in ${currentStatus} state`);
	}

	// Step 5: Run /refine-plan skill
	currentStatus = questStatus(questName);
	if (currentStatus === "refining") {
		await runSkill(
			"refine-plan",
			`Use the Skill tool to invoke the 'refine-plan' skill for quest "${questName}".
Refine the plan for adding a README.md. Keep it concise — 1-2 review iterations.
When done, submit scores via: echo '{"scores":{"completeness":8,"correctness":8,"clarity":8}}' | goodplan submit-refinement --quest ${questName} --override --json`,
			{
				logFile: `phase3-refine-${questName}.log`,
				maxBudgetUsd: 15,
				maxTurns: 300,
			},
		);
	}

	// Step 6: submit-refinement (refining -> plan-refined) with --override
	currentStatus = questStatus(questName);
	console.log(`  Quest status after refine-plan: ${currentStatus}`);
	if (currentStatus === "refining") {
		console.log("  Submitting refinement manually...");
		const scores = JSON.stringify({
			scores: { completeness: 8, correctness: 8, clarity: 8 },
		});
		const submitRefine = gpLocal(
			["submit-refinement", "--quest", questName, "--override", "--json"],
			{ stdin: scores },
		);
		logCliResult("submit-refinement", submitRefine);
		if (submitRefine.exitCode !== 0) {
			console.error(`  submit-refinement failed: exit ${submitRefine.exitCode}`);
		}
		logFriction(
			"minor",
			"Skill: /refine-plan",
			`Skill did not complete submit-refinement for quest ${questName} — manual fallback used`,
		);
	}

	// Step 7: quest:implement (plan-refined -> implementing)
	currentStatus = questStatus(questName);
	console.log(`  Quest status before implement: ${currentStatus}`);
	if (currentStatus === "plan-refined") {
		const implTransition = gpLocal(["quest:implement", "--quest", questName, "--json"]);
		logCliResult("quest:implement", implTransition);
		if (implTransition.exitCode !== 0) {
			throw new Error(
				`Failed to start implementing for quest ${questName}: exit ${implTransition.exitCode}`,
			);
		}
	} else {
		console.log(`  Skipping quest:implement — quest already in ${currentStatus} state`);
	}

	// Step 8: Run /implement-plan skill
	currentStatus = questStatus(questName);
	if (currentStatus === "implementing") {
		await runSkill(
			"implement-plan",
			`Use the Skill tool to invoke the 'implement-plan' skill for quest "${questName}".
Implement the plan: write a README.md file for the nondet-eval project.
When done, call: echo '' | goodplan submit-implementation --quest ${questName} --json`,
			{
				logFile: `phase3-implement-${questName}.log`,
				maxBudgetUsd: 20,
				maxTurns: 400,
			},
		);
	}

	// Step 9: submit-implementation (implementing -> implementation-complete)
	currentStatus = questStatus(questName);
	console.log(`  Quest status after implement-plan: ${currentStatus}`);
	if (currentStatus === "implementing") {
		console.log("  Submitting implementation manually...");
		const submitImpl = gpLocal(["submit-implementation", "--quest", questName, "--json"], {
			stdin: "",
		});
		logCliResult("submit-implementation", submitImpl);
		if (submitImpl.exitCode !== 0) {
			console.error(`  submit-implementation failed: exit ${submitImpl.exitCode}`);
		}
		logFriction(
			"minor",
			"Skill: /implement-plan",
			`Skill did not complete submit-implementation for quest ${questName} — manual fallback used`,
		);
	}

	// Step 10: quest:complete (implementation-complete -> completed)
	currentStatus = questStatus(questName);
	console.log(`  Quest status before complete: ${currentStatus}`);
	if (currentStatus === "implementation-complete") {
		const completePayload = JSON.stringify({
			verificationPassed: true,
			learnings: [],
			architectureDelta: [],
		});
		const completeResult = gpLocalForce(["quest:complete", "--quest", questName, "--json"], {
			stdin: completePayload,
		});
		logCliResult("quest:complete", completeResult);
		if (completeResult.exitCode !== 0) {
			console.error(`  quest:complete failed: exit ${completeResult.exitCode}`);
		}
	}

	// Verify final state
	const finalStatus = questStatus(questName);
	console.log(`  Quest ${questName} final status: ${finalStatus}`);
	if (finalStatus !== "completed") {
		logFriction(
			"important",
			`runPhase3(${questName})`,
			`Quest did not reach completed status — final status: ${finalStatus}`,
		);
	}

	console.log(`\n${"═".repeat(60)}`);
	console.log("  PHASE 3 COMPLETE");
	console.log(`${"═".repeat(60)}`);
}

// ─── Phase 4: Second Epic Lifecycle (Proposal Path) ──────────

async function phase4Explore(epicName: string): Promise<void> {
	console.log(`\n[Phase 4] Step: Explore (${epicName})`);

	const status = epicStatus(epicName);
	console.log(`  Epic status: ${status}`);

	if (status === "created") {
		const r = gpLocal(["epic:explore", "--epic", epicName, "--json"]);
		logCliResult("epic:explore", r);
		if (r.exitCode !== 0) {
			throw new Error(`Failed to transition ${epicName} to exploring: exit ${r.exitCode}`);
		}
	}

	await runSkill(
		"explore",
		`Use the Skill tool to invoke the 'explore' skill.
The epic is ${epicName} (currently in 'exploring' state).
Research these topics, writing a concise .md file for each in the epic's research/ directory:
1. LLM-as-judge patterns — how to use LLMs to evaluate other LLM outputs
2. Scoring rubrics — structured evaluation criteria for skill quality
3. Promptfoo custom scorer API — how to integrate custom scoring logic

Also write a brainstorm file about judge architecture options.
When done, write explore-complete.md and use the CLI to submit: goodplan submit-explore --epic ${epicName} --json`,
		{ logFile: `phase4-explore-${epicName}.log` },
	);

	// State recovery: submit-explore fallback
	const afterStatus = epicStatus(epicName);
	console.log(`  Epic status after explore: ${afterStatus}`);
	if (afterStatus === "exploring") {
		console.log("  Completing explore transition manually...");
		const ecPath = join(NONDET_EVAL_DIR, `.goodplan/epics/${epicName}/explore-complete.md`);
		if (!existsSync(ecPath)) {
			writeFileSync(ecPath, "# Explore Complete\n\nResearch and brainstorming complete.\n");
		}
		const submitResult = gpLocal(["submit-explore", "--epic", epicName, "--json"]);
		logCliResult("submit-explore fallback", submitResult);
		logFriction(
			"minor",
			"Skill: /explore",
			`Skill did not complete submit-explore for ${epicName} — manual fallback used`,
		);
	}
}

async function phase4Architecture(epicName: string): Promise<void> {
	console.log(`\n[Phase 4] Step: Architecture with Proposal Path (${epicName})`);

	// Transition to defining-architecture
	const status = epicStatus(epicName);
	console.log(`  Epic status: ${status}`);
	if (status === "explored") {
		const r = gpLocal(["epic:define-architecture", "--epic", epicName, "--json"]);
		logCliResult("epic:define-architecture", r);
		if (r.exitCode !== 0) {
			throw new Error(
				`Failed to transition ${epicName} to defining-architecture: exit ${r.exitCode}`,
			);
		}
		const afterTransition = epicStatus(epicName);
		if (afterTransition !== "defining-architecture") {
			throw new Error(
				`Expected defining-architecture after epic:define-architecture, got ${afterTransition}`,
			);
		}
		console.log(`  Epic status after transition: ${afterTransition}`);
	}

	// Run /create-architecture (proposal path — skill writes to architecture-proposal/)
	await runSkill(
		"create-architecture",
		`Use the Skill tool to invoke the 'create-architecture' skill.
The epic is ${epicName}. Define a simple architecture for an LLM judge:
- Judge module: Evaluate skill outputs using structured scoring rubrics
- Scorer module: Promptfoo custom scorer integration
- Config module: Evaluation criteria and threshold configuration
Write architecture files to the epic's architecture/ directory.
When done, do NOT call submit-architecture yet — we will handle the proposal approval manually.`,
		{ logFile: `phase4-architecture-${epicName}.log`, maxBudgetUsd: 10 },
	);

	// Architecture proposal approval: manual filesystem copy
	const epicDir = join(NONDET_EVAL_DIR, `.goodplan/epics/${epicName}`);
	const proposalDir = join(epicDir, "architecture-proposal");
	const archDir = join(epicDir, "architecture");

	if (existsSync(proposalDir)) {
		console.log("  Copying architecture-proposal/ -> architecture/ (manual approval)");
		mkdirSync(archDir, { recursive: true });
		cpSync(proposalDir, archDir, { recursive: true });
		writeFileSync(
			join(archDir, "approved.md"),
			"# Architecture Approved\n\nApproved by dogfood harness — automated run.\n",
		);
	} else if (!existsSync(archDir)) {
		// Skill may have written directly to architecture/ — that's fine
		console.log("  WARNING: No architecture-proposal/ found and no architecture/ — creating stub");
		mkdirSync(archDir, { recursive: true });
		writeFileSync(
			join(archDir, "_overview.md"),
			`# ${epicName} Architecture\n\nSimple LLM judge with scorer integration.\n`,
		);
	}

	logFriction(
		"important",
		"phase4-architecture",
		"No CLI command for architecture proposal approval — required manual filesystem copy of architecture-proposal/ to architecture/",
	);

	// Submit architecture
	const submitResult = gpLocal(["submit-architecture", "--epic", epicName, "--json"]);
	logCliResult("submit-architecture", submitResult);
	if (submitResult.exitCode !== 0) {
		console.error(
			`  submit-architecture failed: exit ${submitResult.exitCode} — ${describeExitCode(submitResult.exitCode)}`,
		);
	}

	const finalStatus = epicStatus(epicName);
	console.log(`  Epic status after architecture: ${finalStatus}`);
}

async function phase4RefineArchitecture(epicName: string): Promise<void> {
	console.log(`\n[Phase 4] Step: Refine Architecture (${epicName})`);

	const status = epicStatus(epicName);
	console.log(`  Epic status: ${status}`);
	if (status === "architecture-defined") {
		const r = gpLocal(["epic:refine-architecture", "--epic", epicName, "--json"]);
		logCliResult("epic:refine-architecture", r);
		if (r.exitCode !== 0) {
			throw new Error(
				`Failed to transition ${epicName} to refining-architecture: exit ${r.exitCode}`,
			);
		}
		const afterTransition = epicStatus(epicName);
		if (afterTransition !== "refining-architecture") {
			throw new Error(
				`Expected refining-architecture after epic:refine-architecture, got ${afterTransition}`,
			);
		}
		console.log(`  Epic status after transition: ${afterTransition}`);
	}

	await runSkill(
		"refine-architecture",
		`Use the Skill tool to invoke the 'refine-architecture' skill.
Refine the architecture for epic ${epicName}. Keep it concise — 2-3 iterations max.
This is a small project; don't over-engineer.
When done, submit scores via: echo '{"scores":{"completeness":8,"correctness":8,"clarity":8}}' | goodplan submit-refine-architecture --epic ${epicName} --override --json`,
		{
			logFile: `phase4-refine-architecture-${epicName}.log`,
			maxBudgetUsd: 15,
			maxTurns: 300,
		},
	);

	// State recovery
	const afterStatus = epicStatus(epicName);
	console.log(`  Epic status after refine-architecture skill: ${afterStatus}`);
	if (afterStatus === "refining-architecture") {
		console.log("  Completing refine-architecture transition manually...");
		const scores = JSON.stringify({
			scores: { completeness: 8, correctness: 8, clarity: 8 },
		});
		const submitResult = gpLocal(
			["submit-refine-architecture", "--epic", epicName, "--override", "--json"],
			{ stdin: scores },
		);
		logCliResult("submit-refine-architecture fallback", submitResult);
		logFriction(
			"minor",
			"Skill: /refine-architecture",
			`Skill did not complete submit-refine-architecture for ${epicName} — manual fallback used`,
		);
	}

	const finalStatus = epicStatus(epicName);
	console.log(`  Epic status after refine-architecture: ${finalStatus}`);
}

async function phase4Slices(epicName: string): Promise<void> {
	console.log(`\n[Phase 4] Step: Create & Refine Slices (${epicName})`);

	// Transition to defining-slices
	const status = epicStatus(epicName);
	console.log(`  Epic status: ${status}`);
	if (status === "architecture-refined") {
		const r = gpLocal(["epic:define-slices", "--epic", epicName, "--json"]);
		logCliResult("epic:define-slices", r);
		if (r.exitCode !== 0) {
			throw new Error(`Failed to transition ${epicName} to defining-slices: exit ${r.exitCode}`);
		}
		const afterTransition = epicStatus(epicName);
		if (afterTransition !== "defining-slices") {
			throw new Error(`Expected defining-slices after epic:define-slices, got ${afterTransition}`);
		}
		console.log(`  Epic status after transition: ${afterTransition}`);
	}

	await runSkill(
		"create-slices",
		`Use the Skill tool to invoke the 'create-slices' skill.
Define 2 small slices for epic ${epicName}:
1. "judge-core" — LLM judge evaluation logic + structured scoring
2. "scorer-integration" — Promptfoo custom scorer hookup + config
Keep slices small and focused.
When done, call: goodplan submit-slices --epic ${epicName} --json`,
		{ logFile: `phase4-create-slices-${epicName}.log` },
	);

	// State recovery for create-slices
	let afterCreate = epicStatus(epicName);
	console.log(`  Epic status after create-slices skill: ${afterCreate}`);
	if (afterCreate === "defining-slices") {
		console.log("  Completing submit-slices transition manually...");
		const submitResult = gpLocal(["submit-slices", "--epic", epicName, "--json"]);
		logCliResult("submit-slices fallback", submitResult);
		if (submitResult.exitCode === 0) {
			afterCreate = epicStatus(epicName);
		}
		logFriction(
			"minor",
			"Skill: /create-slices",
			`Skill did not complete submit-slices for ${epicName} — manual fallback used`,
		);
	}

	// Transition to refining-slices
	const preRefineStatus = epicStatus(epicName);
	console.log(`  Epic status before refine-slices: ${preRefineStatus}`);
	if (preRefineStatus === "slices-defined") {
		const r = gpLocal(["epic:refine-slices", "--epic", epicName, "--json"]);
		logCliResult("epic:refine-slices", r);
		if (r.exitCode !== 0) {
			throw new Error(`Failed to transition ${epicName} to refining-slices: exit ${r.exitCode}`);
		}
		const afterTransition = epicStatus(epicName);
		if (afterTransition !== "refining-slices") {
			throw new Error(`Expected refining-slices after epic:refine-slices, got ${afterTransition}`);
		}
		console.log(`  Epic status after transition: ${afterTransition}`);
	}

	await runSkill(
		"refine-slices",
		`Use the Skill tool to invoke the 'refine-slices' skill.
Refine the slices for epic ${epicName}. Quick review — 1-2 iterations.
When done, submit scores via: echo '{"scores":{"completeness":8,"correctness":8,"clarity":8}}' | goodplan submit-refine-slices --epic ${epicName} --override --json`,
		{ logFile: `phase4-refine-slices-${epicName}.log`, maxBudgetUsd: 12 },
	);

	// State recovery for refine-slices
	const afterRefine = epicStatus(epicName);
	console.log(`  Epic status after refine-slices skill: ${afterRefine}`);
	if (afterRefine === "refining-slices") {
		console.log("  Completing submit-refine-slices transition manually...");
		const scores = JSON.stringify({
			scores: { completeness: 8, correctness: 8, clarity: 8 },
		});
		const submitResult = gpLocal(
			["submit-refine-slices", "--epic", epicName, "--override", "--json"],
			{ stdin: scores },
		);
		logCliResult("submit-refine-slices fallback", submitResult);
		logFriction(
			"minor",
			"Skill: /refine-slices",
			`Skill did not complete submit-refine-slices for ${epicName} — manual fallback used`,
		);
	}

	// Verify slices created — use --epic to scope to this epic only
	const slices = gpLocalJson<{
		items: Array<{ name: string; status: string }>;
	}>(["slice:list", "--epic", epicName, "--json"]);
	const sliceItems = slices.items;
	if (!Array.isArray(sliceItems)) {
		throw new Error(
			`slice:list --epic ${epicName} returned unexpected shape — missing items array: ${JSON.stringify(slices)}`,
		);
	}
	console.log(
		`  Slices: ${JSON.stringify(sliceItems.map((s: { name: string; status: string }) => `${s.name}:${s.status}`))}`,
	);
}

async function phase4Activate(epicName: string): Promise<number> {
	console.log(`\n[Phase 4] Step: Activate Epic (${epicName})`);

	const epicState = epicStatus(epicName);
	console.log(`  Epic status: ${epicState}`);
	if (epicState === "active") {
		console.log("  Epic already active — skipping activation");
		const data = gpLocalJson<{ verificationItems?: Array<unknown> }>([
			"epic:show",
			"--epic",
			epicName,
			"--json",
		]);
		const items = (data as { verificationItems?: unknown }).verificationItems;
		return Array.isArray(items) ? items.length - 1 : 0;
	}
	if (epicState !== "slices-refined") {
		throw new Error(`phase4Activate requires epic in slices-refined state, got: ${epicState}`);
	}

	const verPayload = JSON.stringify({
		verification: {
			description: "All slices pass bun tsc --noEmit and tests",
			status: "pending",
			addedDuring: "slices",
			modifiedDuring: null,
		},
	});

	const addVer = gpLocal(["epic:add-verification", "--epic", epicName, "--json"], {
		stdin: verPayload,
	});
	logCliResult("add-verification", addVer);

	// Determine the verification index from the response
	let verificationIndex = 0;
	if (addVer.exitCode === 0) {
		try {
			const parsed = JSON.parse(addVer.stdout) as { verificationItems?: Array<unknown> };
			const items = parsed.verificationItems;
			if (Array.isArray(items)) {
				verificationIndex = items.length - 1;
			}
		} catch {
			// Fall back to 0
		}
	}

	const activate = gpLocal(["epic:activate", "--epic", epicName, "--json"]);
	logCliResult("activate", activate);

	const ps = projectStatus();
	console.log(`  Active epic: ${ps.activeEpic?.name ?? "none"}`);

	return verificationIndex;
}

async function phase4SliceCycle(sliceName: string, epicName: string): Promise<void> {
	console.log(`\n[Phase 4] Step: Slice cycle — ${sliceName} (${epicName})`);

	// Step 1: slice:plan
	let currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status: ${currentStatus}`);
	if (currentStatus === "created") {
		const planTransition = gpLocal(["slice:plan", "--slice", sliceName, "--json"]);
		logCliResult("slice:plan", planTransition);
		if (planTransition.exitCode !== 0) {
			throw new Error(`Failed to start planning for ${sliceName}: exit ${planTransition.exitCode}`);
		}
	} else {
		console.log(`  Skipping slice:plan — slice already in ${currentStatus} state`);
	}

	// Step 2: Run /create-plan skill
	await runSkill(
		"create-plan",
		`Use the Skill tool to invoke the 'create-plan' skill for slice "${sliceName}".
Create a focused implementation plan. Keep it simple — 2-3 phases max.
When done, call: echo '' | goodplan submit-plan --slice ${sliceName} --json`,
		{ logFile: `phase4-plan-${sliceName}.log` },
	);

	// Step 3: submit-plan fallback
	currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status after create-plan: ${currentStatus}`);
	if (currentStatus === "planning") {
		console.log("  Submitting plan manually...");
		const submitPlan = gpLocal(["submit-plan", "--slice", sliceName, "--json"], { stdin: "" });
		logCliResult("submit-plan", submitPlan);
		logFriction(
			"minor",
			"Skill: /create-plan",
			`Skill did not complete submit-plan for ${sliceName} — manual fallback used`,
		);
	}

	// Step 4: slice:refine-plan
	currentStatus = sliceStatus(sliceName);
	if (currentStatus === "plan-created") {
		const refineTransition = gpLocal(["slice:refine-plan", "--slice", sliceName, "--json"]);
		logCliResult("slice:refine-plan", refineTransition);
		if (refineTransition.exitCode !== 0) {
			throw new Error(
				`Failed to start refining for ${sliceName}: exit ${refineTransition.exitCode}`,
			);
		}
	}

	// Step 5: Run /refine-plan skill
	await runSkill(
		"refine-plan",
		`Use the Skill tool to invoke the 'refine-plan' skill for slice "${sliceName}".
Refine the plan. Keep it concise — 1-2 review iterations.
When done, submit scores via: echo '{"scores":{"completeness":8,"correctness":8,"clarity":8}}' | goodplan submit-refinement --slice ${sliceName} --override --json`,
		{
			logFile: `phase4-refine-${sliceName}.log`,
			maxBudgetUsd: 15,
			maxTurns: 300,
		},
	);

	// Step 6: submit-refinement fallback
	currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status after refine-plan: ${currentStatus}`);
	if (currentStatus === "refining") {
		console.log("  Submitting refinement manually...");
		const scores = JSON.stringify({
			scores: { completeness: 8, correctness: 8, clarity: 8 },
		});
		const submitRefine = gpLocal(
			["submit-refinement", "--slice", sliceName, "--override", "--json"],
			{ stdin: scores },
		);
		logCliResult("submit-refinement", submitRefine);
		logFriction(
			"minor",
			"Skill: /refine-plan",
			`Skill did not complete submit-refinement for ${sliceName} — manual fallback used`,
		);
	}

	// Step 7: slice:implement (with plan-refined.md fix-up)
	currentStatus = sliceStatus(sliceName);
	if (currentStatus === "plan-refined") {
		const sliceDir = join(NONDET_EVAL_DIR, ".goodplan/slices", sliceName);
		const refiningPath = join(sliceDir, "plan-refining.md");
		const refinedPath = join(sliceDir, "plan-refined.md");
		const planPath = join(sliceDir, "plan.md");
		if (!existsSync(refinedPath)) {
			if (existsSync(refiningPath)) {
				execFileSync("mv", [refiningPath, refinedPath]);
				console.log(`  Fixed: renamed plan-refining.md -> plan-refined.md for ${sliceName}`);
				logFriction(
					"minor",
					"Skill: /refine-plan",
					`plan-refining.md not renamed for ${sliceName}`,
				);
			} else if (existsSync(planPath)) {
				execFileSync("cp", [planPath, refinedPath]);
				console.log(
					`  Fixed: copied plan.md -> plan-refined.md for ${sliceName} (no refinement file created)`,
				);
				logFriction(
					"important",
					"Skill: /refine-plan",
					`Neither plan-refining.md nor plan-refined.md created for ${sliceName} — copied plan.md as fallback`,
				);
			}
		}

		const implTransition = gpLocal(["slice:implement", "--slice", sliceName, "--json"]);
		logCliResult("slice:implement", implTransition);
		if (implTransition.exitCode !== 0) {
			throw new Error(
				`Failed to start implementing for ${sliceName}: exit ${implTransition.exitCode}`,
			);
		}
	}

	// Step 8: Run /implement-plan skill
	await runSkill(
		"implement-plan",
		`Use the Skill tool to invoke the 'implement-plan' skill for slice "${sliceName}".
Implement the refined plan. Write actual TypeScript code.
When done, call: echo '' | goodplan submit-implementation --slice ${sliceName} --json`,
		{
			logFile: `phase4-implement-${sliceName}.log`,
			maxBudgetUsd: 20,
			maxTurns: 400,
		},
	);

	// Step 9: submit-implementation fallback (with --force for concurrent mod)
	currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status after implement-plan: ${currentStatus}`);
	if (currentStatus === "implementing") {
		console.log("  Submitting implementation manually...");
		const submitResult = gpLocalForce(["submit-implementation", "--slice", sliceName, "--json"]);
		logCliResult("submit-implementation", submitResult);
		if (submitResult.retried) {
			logFriction(
				"minor",
				"CLI: concurrent-mod",
				`Used --force for submit-implementation on ${sliceName}`,
			);
		}
		logFriction(
			"minor",
			"Skill: /implement-plan",
			`Skill did not complete submit-implementation for ${sliceName} — manual fallback used`,
		);
	}

	// Step 10: slice:complete (with --force fallback for concurrent mod)
	currentStatus = sliceStatus(sliceName);
	console.log(`  Slice status before complete: ${currentStatus}`);
	if (currentStatus === "implementation-complete") {
		const completePayload = JSON.stringify({
			verificationPassed: true,
			deferred: [],
			learnings: [],
			architectureDelta: [],
		});
		const completeResult = gpLocalForce(["slice:complete", "--slice", sliceName, "--json"], {
			stdin: completePayload,
		});
		logCliResult("slice:complete", completeResult);
		if (completeResult.retried) {
			logFriction(
				"minor",
				"CLI: concurrent-mod",
				`Used --force for slice:complete on ${sliceName}`,
			);
		}
	}

	const finalStatus = sliceStatus(sliceName);
	console.log(`  Slice ${sliceName} final status: ${finalStatus}`);
	if (finalStatus !== "completed") {
		logFriction(
			"important",
			`phase4SliceCycle(${sliceName})`,
			`Slice did not reach completed status — final status: ${finalStatus}`,
		);
	}
}

async function phase4EpicComplete(epicName: string, verificationIndex: number): Promise<void> {
	console.log(`\n[Phase 4] Step: Complete Epic (${epicName})`);

	const verificationResults = JSON.stringify([
		{ index: verificationIndex, passed: true, notes: "Harness automated verification" },
	]);

	await runSkill(
		"complete",
		`Use the Skill tool to invoke the 'complete' skill.
Complete the epic "${epicName}". Synthesize learnings, reconcile architecture layers.
Verification results: ${verificationResults}. Call epic:complete with this payload.`,
		{ logFile: `phase4-complete-${epicName}.log` },
	);

	// State recovery
	const afterStatus = epicStatus(epicName);
	console.log(`  Epic status after complete skill: ${afterStatus}`);
	if (afterStatus !== "completed") {
		console.log("  Completing epic manually via CLI fallback...");
		const completePayload = JSON.stringify({
			verificationResults: [
				{ index: verificationIndex, passed: true, notes: "Harness automated verification" },
			],
		});
		const completeResult = gpLocalForce(["epic:complete", "--epic", epicName, "--json"], {
			stdin: completePayload,
		});
		logCliResult("epic:complete fallback", completeResult);
		if (completeResult.exitCode !== 0) {
			console.error(
				`  epic:complete fallback failed: exit ${completeResult.exitCode} — ${describeExitCode(completeResult.exitCode)}`,
			);
		}
		logFriction(
			"minor",
			"Skill: /complete",
			`Skill did not complete epic:complete for ${epicName} — manual CLI fallback used`,
		);
	}

	const finalStatus = epicStatus(epicName);
	console.log(`  Epic ${epicName} final status: ${finalStatus}`);
	if (finalStatus !== "completed") {
		logFriction(
			"important",
			`phase4EpicComplete(${epicName})`,
			`Epic did not reach completed status — final status: ${finalStatus}`,
		);
	}
}

async function runPhase4(): Promise<void> {
	console.log(`\n${"═".repeat(60)}`);
	console.log("  PHASE 4: Second Epic Lifecycle (Proposal Path)");
	console.log(`${"═".repeat(60)}`);

	const epicName = "llm-judge";

	// Create second epic
	console.log("\n[Phase 4] Step: Create Epic");
	const epicPayload = JSON.stringify({
		name: epicName,
		goal: "Implement an LLM judge for evaluating skill output quality",
	});
	const createResult = gpLocal(["epic:create", "--json"], { stdin: epicPayload });
	logCliResult("epic:create", createResult);
	if (createResult.exitCode !== 0) {
		if (createResult.exitCode === 3) {
			console.log(`  Epic ${epicName} already exists (exit 3) — skipping create`);
		} else {
			throw new Error(`Failed to create epic ${epicName}: exit ${createResult.exitCode}`);
		}
	}

	await phase4Explore(epicName);
	await phase4Architecture(epicName);
	await phase4RefineArchitecture(epicName);
	await phase4Slices(epicName);
	const verificationIndex = await phase4Activate(epicName);

	// Run each slice
	const slices = gpLocalJson<{
		items: Array<{ name: string }>;
	}>(["slice:list", "--epic", epicName, "--json"]);
	const sliceItems = slices.items;
	if (!Array.isArray(sliceItems)) {
		throw new Error(
			`slice:list --epic ${epicName} returned unexpected shape — missing items array: ${JSON.stringify(slices)}`,
		);
	}
	for (const slice of sliceItems as Array<{ name: string }>) {
		await phase4SliceCycle(slice.name, epicName);
	}

	await phase4EpicComplete(epicName, verificationIndex);

	// Verify second epic completed
	const finalStatus = epicStatus(epicName);
	console.log(`\n  Epic ${epicName} final status: ${finalStatus}`);

	console.log(`\n${"═".repeat(60)}`);
	console.log("  PHASE 4 COMPLETE");
	console.log(`${"═".repeat(60)}`);
}

// ─── Friction Summary ────────────────────────────────────────

function printFrictionSummary(): void {
	console.log(`\n${"═".repeat(60)}`);
	console.log("  FRICTION SUMMARY");
	console.log(`${"═".repeat(60)}`);

	try {
		const content = readFileSync(FRICTION_LOG, "utf-8");
		const lines = content
			.split("\n")
			.filter((l) => l.startsWith("|") && !l.startsWith("| #") && !l.startsWith("|---"));

		if (lines.length === 0) {
			console.log("  No friction items recorded.");
			return;
		}

		// Categorize by severity
		const bySeverity = new Map<string, string[]>();
		for (const line of lines) {
			const parts = line
				.split("|")
				.map((p) => p.trim())
				.filter(Boolean);
			// parts: [#, severity, source, issue]
			const severity = parts[1] ?? "unknown";
			const source = parts[2] ?? "unknown";
			const issue = parts[3] ?? "unknown";
			const existing = bySeverity.get(severity);
			if (existing) {
				existing.push(`  - [${source}] ${issue}`);
			} else {
				bySeverity.set(severity, [`  - [${source}] ${issue}`]);
			}
		}

		for (const [severity, items] of bySeverity) {
			console.log(`\n  ${severity.toUpperCase()} (${items.length}):`);
			for (const item of items) {
				console.log(item);
			}
		}

		console.log(`\n  Total friction items: ${lines.length}`);
	} catch {
		console.log("  Could not read friction log.");
	}

	console.log(`\n  Aggregate cost: $${totalCostUsd.toFixed(4)}`);
	console.log(`${"═".repeat(60)}`);
}

// ─── Phase 2 Orchestrator ────────────────────────────────────

async function runPhase2(): Promise<void> {
	console.log(`\n${"═".repeat(60)}`);
	console.log("  PHASE 2: First Epic Full Lifecycle");
	console.log(`${"═".repeat(60)}`);

	await phase2Explore();
	await phase2Architecture();
	await phase2RefineArchitecture();
	await phase2Slices();
	await phase2Activate();

	// Run each slice
	const slices = gpLocalJson<{
		items: Array<{ name: string }>;
	}>(["slice:list", "--epic", "core-provider", "--json"]);
	const sliceItems = slices.items;
	if (!Array.isArray(sliceItems)) {
		throw new Error(
			`slice:list returned unexpected shape — missing items array: ${JSON.stringify(slices)}`,
		);
	}
	for (const slice of sliceItems as Array<{ name: string }>) {
		await phase2SliceCycle(slice.name);
	}

	await phase2EpicComplete();

	console.log(`\n${"═".repeat(60)}`);
	console.log("  PHASE 2 COMPLETE");
	console.log(`${"═".repeat(60)}`);
}

// ─── Entry Point ─────────────────────────────────────────────

async function main(): Promise<void> {
	const startTime = Date.now();
	// Filter out --model and its arg from positional args
	const positionalArgs: string[] = [];
	for (let i = 2; i < process.argv.length; i++) {
		const arg = process.argv[i];
		if (arg === "--model") {
			i++; // skip next (model value)
			continue;
		}
		if (arg) positionalArgs.push(arg);
	}
	const phase = positionalArgs[0];
	const step = positionalArgs[1];

	if (!phase) {
		console.log("Usage: bun tools/dogfood/harness.ts <command> [step] [--model <model>]");
		console.log("");
		console.log("  Commands:");
		console.log("    reset          — Reset nondet-eval to clean state");
		console.log("    2 [step]       — Phase 2: First epic lifecycle");
		console.log("    3              — Phase 3: Quest lifecycle");
		console.log("    4              — Phase 4: Second epic lifecycle (proposal path)");
		console.log("    all            — Full run: reset -> Phase 2 -> Phase 3 -> Phase 4");
		console.log("");
		console.log("  Phase 2 steps:");
		console.log("    explore        — Run /explore on core-provider epic");
		console.log("    architecture   — Run /create-architecture");
		console.log("    refine-arch    — Run /refine-architecture");
		console.log("    slices         — Run /create-slices + /refine-slices");
		console.log("    activate       — Add verification + epic:activate");
		console.log("    slice:<name>   — Full slice cycle (plan -> implement -> complete)");
		console.log("    complete       — Run /complete for epic");
		console.log("");
		console.log(`  Model: ${MODEL} (override with --model)`);
		console.log("  No step = run full phase");
		process.exit(1);
	}

	let caughtError = false;
	try {
		switch (phase) {
			case "reset":
				reset();
				break;
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
				await runPhase3();
				break;
			case "4":
				await runPhase4();
				break;
			case "all":
				reset();
				await runPhase2();
				await runPhase3();
				await runPhase4();
				printFrictionSummary();
				break;
			default:
				console.error(`Unknown phase: ${phase}`);
				process.exit(1);
		}
	} catch (err) {
		caughtError = true;
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`\n[harness] ERROR: ${msg}`);
		if (err instanceof Error && err.stack) {
			console.error(err.stack);
		}
		// Don't re-throw — fall through to summary
	}

	// Final summary
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`\n${"─".repeat(60)}`);
	console.log("  HARNESS SUMMARY");
	console.log(`${"─".repeat(60)}`);
	console.log(`  Model:         ${MODEL}`);
	console.log(`  Total cost:    $${totalCostUsd.toFixed(4)}`);
	console.log(`  Total elapsed: ${elapsed}s`);
	console.log(`  Friction log:  ${FRICTION_LOG}`);
	console.log(`  Logs dir:      ${LOG_DIR}`);
	console.log(`  Violations:    ${allViolations.length}`);
	if (allViolations.length > 0) {
		for (const v of allViolations) {
			console.log(`    - ${v}`);
		}
	}
	if (caughtError) {
		console.log("  Status:        FAILED (error caught during execution)");
	}
	console.log("─".repeat(60));

	if (caughtError) {
		process.exit(1);
	}
}

main()
	.then(() => {
		console.log("\n[harness] Done.");
		process.exit(0);
	})
	.catch((err: unknown) => {
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`\n[harness] FATAL: ${msg}`);
		if (err instanceof Error && err.stack) {
			console.error(err.stack);
		}
		process.exit(1);
	});
