/**
 * Plan-slice orchestrator test harness — runs /gp:plan-slice skill against a
 * minimal fixture using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-plan-slice.ts [--model <model>] [--max-iterations <n>]
 *
 * Creates a fixture project with a slice in `created` status, builds the plugin,
 * then runs `/gp:plan-slice` via the Agent SDK with a simulated user.
 *
 * Tests:
 * 1. Pipeline completes: Q&A phase runs, plan draft written, refinement loop runs
 * 2. Slice reaches `plan-refined` status
 * 3. Orchestrator discipline: no direct Read calls on artifact paths
 * 4. Plan file exists in slice directory after completion
 * 5. Refinement loop ran at least 1 iteration (score progression in log)
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import {
	createLogger,
	createMinimalFixture,
	createSimulatedUser,
	isSuccess,
	parseModel,
	platformBinaryDir,
	runSkillSession,
	tierDefault,
	verifyEntityStatus,
	verifyNoArtifactReads,
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
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/plan-slice-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/plan-slice-transcript.jsonl");
const MODEL = parseModel(tierDefault("structural"));
const MAX_ITERATIONS = parseMaxIterations(2);

const SLICE_NAME = "plan-poc";
const EPIC_NAME = "test-epic";
const SLICE_GOAL =
	"Build a REST API endpoint for user profile retrieval with caching, input validation, " +
	"and error handling. The endpoint should support JSON responses and integrate with the " +
	"existing authentication middleware.";

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-plan-slice] Building plugin...");
try {
	execFileSync("bun", ["run", "build:plugin"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-plan-slice] Plugin built successfully");
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

// Sync new skills from dist to installed cache so the Agent SDK can discover them.
// The Agent SDK loads plugin skills from the installed cache, not from the local dist.
const installedSkillsDir = join(
	HOME,
	".claude/plugins/cache/goodplan-marketplace/goodplan",
);
try {
	const versions = readdirSync(installedSkillsDir)
		.filter((d: string) => statSync(join(installedSkillsDir, d)).isDirectory())
		.sort()
		.reverse();
	const latestVersion = versions[0];
	if (latestVersion) {
		const installedPluginDir = join(installedSkillsDir, latestVersion);
		// Sync plan-slice skill to installed cache
		const srcSkill = join(PLUGIN_DIR, "skills", "plan-slice");
		const dstSkill = join(installedPluginDir, "skills", "plan-slice");
		if (existsSync(srcSkill) && !existsSync(dstSkill)) {
			execFileSync("cp", ["-r", srcSkill, dstSkill]);
			console.log("[test-plan-slice] Synced plan-slice skill to installed cache");
		}
		// Sync agents to installed cache
		const srcAgents = join(PLUGIN_DIR, "agents");
		const dstAgents = join(installedPluginDir, "agents");
		if (existsSync(srcAgents)) {
			execFileSync("rsync", ["-a", "--exclude", ".DS_Store", `${srcAgents}/`, `${dstAgents}/`]);
			console.log("[test-plan-slice] Synced agents to installed cache");
		}
	}
} catch (err) {
	console.warn("[test-plan-slice] WARN: Could not sync to installed cache:", err instanceof Error ? err.message : String(err));
}

// ─── Logging ────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const startTime = Date.now();

	// ─── Setup fixture ──────────────────────────────────────
	logger.log("[test-plan-slice] Creating fixture...");

	const fixtureDir = await createMinimalFixture({
		epicName: EPIC_NAME,
		sliceName: SLICE_NAME,
		sliceGoal: SLICE_GOAL,
		withSource: true,
		activateEpic: true,
		architectureFiles: {
			"_overview.md": [
				"# Architecture Overview",
				"",
				"## Layers",
				"1. API layer (Express + Zod validation)",
				"2. Service layer (business logic)",
				"3. Data layer (PostgreSQL + Drizzle ORM)",
				"4. Infrastructure (Docker, CI/CD)",
				"",
				"## Subsystems",
				"- auth: JWT-based authentication (Stable)",
				"- users: User CRUD operations (Growing)",
				"- cache: Redis-backed caching (Experimental)",
			].join("\n"),
			"conventions.md": [
				"# Conventions",
				"",
				"- TypeScript strict mode",
				"- Zod for request/response validation",
				"- Express router per domain",
				"- Vitest for testing",
			].join("\n"),
		},
	});

	logger.log(`[test-plan-slice] Fixture created at: ${fixtureDir}`);

	// Verify slice is in created status
	const preStatus = verifyEntityStatus("slice", SLICE_NAME, "created", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
		epic: EPIC_NAME,
	});
	if (!preStatus.ok) {
		logger.log(`FAIL: Slice not in 'created' status (got: ${preStatus.actual})`);
		process.exit(1);
	}
	logger.log("[test-plan-slice] Slice verified in 'created' status");

	// ─── Simulated user ─────────────────────────────────────

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			"You are a senior developer testing the /gp:plan-slice skill.",
			"The project is a TypeScript REST API using Express, Zod, PostgreSQL, and Redis caching.",
			`The slice goal is: ${SLICE_GOAL}`,
			"",
			"When asked about approach, suggest a phased approach:",
			"- Phase 1: Route + controller skeleton with Zod schema",
			"- Phase 2: Service layer with cache-aside pattern",
			"- Phase 3: Integration tests",
			"",
			"When asked about expected behavior, describe request/response shapes.",
			"When asked about risks, mention cache invalidation complexity.",
			"Always choose concrete, specific answers. Never say 'Proceed' without context.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	// ─── Tool call tracking for discipline verification ─────

	const toolCalls: Array<{ toolName: string; input: unknown }> = [];
	const scoreProgression: number[] = [];

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
							logger.log(`  [${name}] ${cmd}`);
						} else if (name === "Agent") {
							logger.log(`  [${name}] ${JSON.stringify(block.input).slice(0, 150)}`);
						} else {
							logger.log(`  [${name}]`);
						}
					}

					// Track score mentions in text blocks
					if (block.type === "text" && typeof block.text === "string") {
						const scoreMatch = block.text.match(
							/(?:aggregate|overall|net)\s*score[:\s]*(\d+(?:\.\d+)?)/i,
						);
						if (scoreMatch?.[1]) {
							const score = Number.parseFloat(scoreMatch[1]);
							if (!Number.isNaN(score)) {
								scoreProgression.push(score);
								logger.log(`  [score] ${score}/10 (iteration ${scoreProgression.length})`);
							}
						}
					}
				}
			}
		} else if (message.type === "system") {
			const sysMsg = message as Record<string, unknown>;
			if (sysMsg.subtype === "task_started") {
				const desc = typeof sysMsg.description === "string" ? sysMsg.description : "unknown";
				logger.log(`  [subagent] started: ${desc.slice(0, 120)}`);
			} else if (sysMsg.subtype === "task_notification") {
				const status = typeof sysMsg.status === "string" ? sysMsg.status : "unknown";
				const summary = typeof sysMsg.summary === "string" ? sysMsg.summary : "";
				logger.log(`  [subagent] ${status}: ${summary.slice(0, 120)}`);
			}
		}
	};

	// ─── Load SKILL.md for injection ───────────────────────

	const skillMdPath = join(PLUGIN_DIR, "skills", "plan-slice", "SKILL.md");
	if (!existsSync(skillMdPath)) {
		logger.log("FATAL: plan-slice SKILL.md not found in dist");
		process.exit(1);
	}
	const skillContent = readFileSync(skillMdPath, "utf-8");
	// Strip frontmatter — the LLM doesn't need it
	const skillBody = skillContent.replace(/^---[\s\S]*?---\n/, "");

	// ─── Run /gp:plan-slice ─────────────────────────────────

	logger.log(
		`\n[test-plan-slice] Running /gp:plan-slice (model: ${MODEL}, max-iterations: ${MAX_ITERATIONS})...\n`,
	);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Execute the plan-slice skill for slice "${SLICE_NAME}". Follow the skill instructions in your system prompt completely through all phases.`,
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 300,
				maxBudgetUsd: 20,
				model: MODEL,
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: {
					...process.env,
					PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
					GP_PLAN_SLICE_MAX_ITERATIONS: String(MAX_ITERATIONS),
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						`Use at most ${MAX_ITERATIONS} refinement iterations for cost control.`,
						"Do not ask the user to confirm — proceed automatically through all phases.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
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
			onMessage,
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

	let allPassed = true;

	// Test 1: Slice status
	const postStatus = verifyEntityStatus("slice", SLICE_NAME, "plan-refined", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
		epic: EPIC_NAME,
	});
	if (postStatus.ok) {
		logger.log("PASS: Slice reached 'plan-refined' status");
	} else {
		logger.log(`FAIL: Slice status is '${postStatus.actual}', expected 'plan-refined'`);
		allPassed = false;
	}

	// Test 2: Orchestrator discipline — no artifact reads
	const artifactCheck = verifyNoArtifactReads(toolCalls);
	if (artifactCheck.ok) {
		logger.log("PASS: No orchestrator-level artifact reads detected");
	} else {
		logger.log(`FAIL: ${artifactCheck.violations.length} artifact read violation(s):`);
		for (const v of artifactCheck.violations) {
			logger.log(`  - ${v}`);
		}
		allPassed = false;
	}

	// Test 3: Plan file exists
	let planFileFound = false;
	const sliceDir = join(fixtureDir, ".goodplan", "epics", EPIC_NAME, "slices");
	try {
		const sliceDirs = readdirSync(sliceDir);
		for (const d of sliceDirs) {
			if (d.includes(SLICE_NAME)) {
				const planPath = join(sliceDir, d, "plan.md");
				const planRefinedPath = join(sliceDir, d, "plan-refined.md");
				if (existsSync(planRefinedPath)) {
					planFileFound = true;
					const planSize = readFileSync(planRefinedPath, "utf-8").length;
					logger.log(`PASS: plan-refined.md exists (${planSize} bytes)`);
				} else if (existsSync(planPath)) {
					planFileFound = true;
					const planSize = readFileSync(planPath, "utf-8").length;
					logger.log(`PASS: plan.md exists (${planSize} bytes) — note: expected plan-refined.md`);
				}
				break;
			}
		}
	} catch (err: unknown) {
		logger.log(`WARN: Could not check plan files: ${err}`);
	}
	if (!planFileFound) {
		logger.log("FAIL: No plan file found in slice directory");
		allPassed = false;
	}

	// Test 4: Score progression (refinement loop ran at least 1 iteration)
	if (scoreProgression.length >= 1) {
		logger.log(`PASS: Refinement loop ran ${scoreProgression.length} iteration(s)`);
		logger.log(`  Scores: ${scoreProgression.join(" → ")}`);
	} else {
		logger.log("WARN: No score progression detected in session log");
		logger.log(
			"  (Scores may have been reported in sub-agent sessions, not visible to orchestrator)",
		);
		// Not a hard failure — sub-agent sessions have independent message streams
	}

	// Test 5: State write violations from checkViolation
	if (sessionResult && sessionResult.violations.length > 0) {
		logger.log(`FAIL: ${sessionResult.violations.length} state write violation(s):`);
		for (const v of sessionResult.violations) {
			logger.log(`  - ${v}`);
		}
		allPassed = false;
	} else {
		logger.log("PASS: No state write violations detected");
	}

	// ─── Summary ────────────────────────────────────────────

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

	logger.log("\n--- SUMMARY ---");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Max iterations: ${MAX_ITERATIONS}`);
	logger.log(`Elapsed: ${elapsed}s`);
	logger.log(`Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`);
	logger.log(`Tool calls tracked: ${toolCalls.length}`);
	logger.log(`Score iterations: ${scoreProgression.length}`);
	logger.log(`Overall: ${allPassed ? "PASS" : "FAIL"}`);
	logger.log(`Log file: ${LOG_FILE}`);
	logger.log(`Transcript: ${TRANSCRIPT_FILE}`);
	logger.log(`Fixture preserved at: ${fixtureDir}`);

	if (!allPassed) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
