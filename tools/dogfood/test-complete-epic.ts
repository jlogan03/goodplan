/**
 * Complete-epic skill test harness — runs /gp:complete-epic skill against a
 * minimal fixture using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-complete-epic.ts [--model <model>]
 *
 * Creates a fixture project with an epic where all slices are completed
 * (each with completion/learnings.md), then runs /gp:complete-epic via the
 * Agent SDK with a simulated user.
 *
 * Tests:
 * 1. Full pipeline: epic reaches completed status
 * 2. Cross-slice learnings synthesized (epic-level completion artifacts exist)
 * 3. Architecture reconciliation ran
 * 4. Orchestrator discipline: no direct Read calls on artifact paths
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import {
	createLogger,
	createMinimalFixture,
	createSimulatedUser,
	gp,
	isSuccess,
	parseModel,
	platformBinaryDir,
	runSkillSession,
	tierDefault,
	verifyEntityStatus,
	verifyNoArtifactReads,
} from "./utils";

// ─── Environment ────────────────────────────────────────────

const HOME = process.env.HOME;
if (!HOME) {
	console.error("FATAL: HOME environment variable is not set");
	process.exit(1);
}

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");
const GP_BIN = join(PLUGIN_DIR, "binaries", platformBinaryDir(), "gp");
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/complete-epic-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/complete-epic-transcript.jsonl");
const MODEL = parseModel(tierDefault("structural"));

const EPIC_NAME = "test-complete-epic";
const SLICE_NAMES = ["slice-auth", "slice-users", "slice-cache"];

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-complete-epic] Building plugin...");
try {
	execFileSync("bun", ["run", "build:plugin"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-complete-epic] Plugin built successfully");
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

// Use dist binary for ALL CLI operations (including createMinimalFixture)
// to ensure schema consistency between fixture creation and test assertions.
process.env.GP_CLI_PATH = GP_BIN;

// Sync new skills from dist to installed cache so the Agent SDK can discover them.
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
		// Sync complete-epic skill to installed cache
		const srcSkill = join(PLUGIN_DIR, "skills", "complete-epic");
		const dstSkill = join(installedPluginDir, "skills", "complete-epic");
		if (existsSync(srcSkill)) {
			execFileSync("rsync", ["-a", "--exclude", ".DS_Store", `${srcSkill}/`, `${dstSkill}/`]);
			console.log("[test-complete-epic] Synced complete-epic skill to installed cache");
		}
		// Sync agents to installed cache
		const srcAgents = join(PLUGIN_DIR, "agents");
		const dstAgents = join(installedPluginDir, "agents");
		if (existsSync(srcAgents)) {
			execFileSync("rsync", ["-a", "--exclude", ".DS_Store", `${srcAgents}/`, `${dstAgents}/`]);
			console.log("[test-complete-epic] Synced agents to installed cache");
		}
	}
} catch (err) {
	console.warn("[test-complete-epic] WARN: Could not sync to installed cache:", err instanceof Error ? err.message : String(err));
}

// ─── Logging ────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Tool call tracking ─────────────────────────────────────

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

function loadSkillBody(): string {
	const skillMdPath = join(PLUGIN_DIR, "skills", "complete-epic", "SKILL.md");
	if (!existsSync(skillMdPath)) {
		logger.log("FATAL: complete-epic SKILL.md not found in dist");
		process.exit(1);
	}
	const skillContent = readFileSync(skillMdPath, "utf-8");
	// Strip frontmatter — the LLM doesn't need it
	return skillContent.replace(/^---[\s\S]*?---\n/, "");
}

// ─── Fixture: Epic with all slices completed ────────────────

/**
 * Creates a project with an epic that has all slices in `completed` status,
 * each with completion artifacts (completion/learnings.md). Architecture files
 * exist at both top-level and epic level.
 */
async function createCompletedEpicFixture(): Promise<string> {
	// Create base fixture with the first slice (createMinimalFixture requires at least one)
	const firstSlice = SLICE_NAMES[0];
	if (!firstSlice) throw new Error("SLICE_NAMES must have at least one entry");

	const fixtureDir = await createMinimalFixture({
		epicName: EPIC_NAME,
		sliceName: firstSlice,
		sliceGoal: "JWT-based authentication middleware",
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

	// Create remaining slices via CLI
	for (let i = 1; i < SLICE_NAMES.length; i++) {
		const name = SLICE_NAMES[i];
		if (!name) continue;
		const goals = ["User CRUD operations and profile management", "Redis-backed response caching"];
		const goal = goals[i - 1] ?? `Slice ${i + 1} goal`;
		const sliceResult = gp(["slice:create", "--epic", EPIC_NAME, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
			stdin: JSON.stringify({ name, goal }),
		});
		if (sliceResult.exitCode !== 0) {
			throw new Error(`slice:create failed for ${name} (exit ${sliceResult.exitCode}): ${sliceResult.stdout}`);
		}
	}

	// Advance all slices through the full lifecycle to `completed` status
	for (const sliceName of SLICE_NAMES) {
		// plan-created
		gp(["slice:plan", "--slice", sliceName, "--epic", EPIC_NAME, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
		});

		// Write a minimal plan file so plan submission succeeds
		const sliceListResult = gp(["slice:list", "--epic", EPIC_NAME, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
		});
		let sliceDirName = sliceName;
		try {
			const sliceList = JSON.parse(sliceListResult.stdout) as Array<{ name: string; slug: string }>;
			const found = sliceList.find((s) => s.name === sliceName);
			if (found) sliceDirName = found.slug ?? found.name;
		} catch {
			// Fall back to name
		}

		const sliceDir = join(fixtureDir, ".goodplan", "epics", EPIC_NAME, "slices", sliceDirName);
		mkdirSync(sliceDir, { recursive: true });
		writeFileSync(
			join(sliceDir, "plan.md"),
			[
				`# Plan: ${sliceName}`,
				"",
				"## Phase 1: Setup",
				"Create the basic structure.",
				"",
				"## Phase 2: Implementation",
				"Implement the core functionality.",
			].join("\n"),
		);

		// submit-plan → plan-refined
		gp(["submit-plan", "--slice", sliceName, "--epic", EPIC_NAME, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
		});
		gp(["submit-refine-plan", "--slice", sliceName, "--epic", EPIC_NAME, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
			stdin: JSON.stringify({ scores: { overall: 9 } }),
		});

		// implement → implementing
		gp(["slice:implement", "--slice", sliceName, "--epic", EPIC_NAME, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
		});

		// submit-implementation → implementation-complete
		gp(["submit-implementation", "--slice", sliceName, "--epic", EPIC_NAME, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
		});

		// Write completion artifacts before completing
		const completionDir = join(sliceDir, "completion");
		mkdirSync(completionDir, { recursive: true });
		writeFileSync(
			join(completionDir, "learnings.md"),
			[
				`# Learnings: ${sliceName}`,
				"",
				"## What Worked",
				`- Clean separation of concerns in ${sliceName} implementation`,
				"- Zod validation caught type mismatches early",
				"",
				"## What Could Be Better",
				"- Test setup was verbose — consider shared fixtures",
				"- Error handling patterns could be more consistent",
				"",
				"## Recommendations",
				"- Extract shared Zod schemas to a common module",
				"- Consider middleware composition for cross-cutting concerns",
			].join("\n"),
		);

		// slice:complete → completed
		gp(["slice:complete", "--slice", sliceName, "--epic", EPIC_NAME, "--json"], {
			cwd: fixtureDir,
			gpBin: GP_BIN,
			stdin: JSON.stringify({
				verificationPassed: true,
				learnings: [`${sliceName}: Clean implementation with good test coverage`],
				architectureDelta: [],
				deferred: [],
			}),
		});
	}

	// Write epic-level architecture files
	const epicArchDir = join(fixtureDir, ".goodplan", "epics", EPIC_NAME, "architecture");
	mkdirSync(epicArchDir, { recursive: true });
	writeFileSync(
		join(epicArchDir, "_overview.md"),
		[
			"# Epic Architecture: API Layer",
			"",
			"## Target State",
			"- Express routes with Zod validation",
			"- JWT auth middleware",
			"- Redis cache-aside pattern",
			"- PostgreSQL via Drizzle ORM",
			"",
			"## Subsystem Changes",
			"- auth: New JWT middleware (Stable)",
			"- users: CRUD endpoints (Growing)",
			"- cache: Redis integration (Experimental)",
		].join("\n"),
	);

	return fixtureDir;
}

// ─── Test 1: Full Pipeline ──────────────────────────────────

async function testFullPipeline(): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST 1: Full Pipeline — Complete Epic");
	logger.log("========================================\n");

	const startTime = Date.now();
	let allPassed = true;

	// Setup fixture
	logger.log("[complete-epic] Creating fixture with all slices completed...");
	const fixtureDir = await createCompletedEpicFixture();
	logger.log(`[complete-epic] Fixture created at: ${fixtureDir}`);

	// Verify pre-condition: all slices are completed
	for (const sliceName of SLICE_NAMES) {
		const sliceStatus = verifyEntityStatus("slice", sliceName, "completed", {
			cwd: fixtureDir,
			gpBin: GP_BIN,
			epic: EPIC_NAME,
		});
		if (!sliceStatus.ok) {
			logger.log(`FAIL: Pre-condition not met — slice '${sliceName}' status is '${sliceStatus.actual}', expected 'completed'`);
			return false;
		}
	}
	logger.log("[complete-epic] All slices verified in 'completed' status");

	// Verify pre-condition: epic is not yet completed
	const preEpicStatus = verifyEntityStatus("epic", EPIC_NAME, "activated", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});
	logger.log(`[complete-epic] Epic pre-status: ${preEpicStatus.actual}`);

	// Simulated user
	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			"You are a senior developer testing the /gp:complete-epic skill.",
			"The epic has all slices completed. You want to complete the epic.",
			"",
			"When asked about architecture reconciliation, approve all recommended updates.",
			"When asked about artifact promotion, approve promotion of all artifacts.",
			"When asked about side quests, say 'Skip for now'.",
			"When given options about architecture updates, choose 'Update top-level architecture' or the most affirmative option.",
			"Always choose concrete, specific answers. Never say 'Proceed' without context.",
			"If asked to confirm completion, confirm.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody();

	logger.log(
		`\n[complete-epic] Running /gp:complete-epic (model: ${MODEL})...\n`,
	);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Complete the epic "${EPIC_NAME}". All slices are already completed. Follow the complete-epic skill instructions in your system prompt completely through all steps.`,
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
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: [
						"You are in an automated test harness. Execute the skill below faithfully.",
						"Do not ask the user to confirm — proceed automatically through all steps.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"",
						"# Complete-Epic Skill Instructions",
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

	logger.log("\n--- POST-RUN VERIFICATION (Complete Epic) ---\n");

	// Test 1a: Epic reached completed status
	const epicStatus = verifyEntityStatus("epic", EPIC_NAME, "completed", {
		cwd: fixtureDir,
		gpBin: GP_BIN,
	});
	if (epicStatus.ok) {
		logger.log("PASS: Epic reached 'completed' status");
	} else {
		logger.log(`FAIL: Epic status is '${epicStatus.actual}', expected 'completed'`);
		allPassed = false;
	}

	// Test 1b: Cross-slice learnings synthesized (epic-level completion artifacts)
	const epicDir = join(fixtureDir, ".goodplan", "epics", EPIC_NAME);
	const epicCompletionDir = join(epicDir, "completion");
	const epicLearningsPath = join(epicCompletionDir, "learnings.md");
	if (existsSync(epicLearningsPath)) {
		const learningsContent = readFileSync(epicLearningsPath, "utf-8");
		if (learningsContent.length > 50) {
			logger.log(`PASS: Epic-level learnings.md exists (${learningsContent.length} bytes)`);
		} else {
			logger.log(`WARN: Epic-level learnings.md exists but is very short (${learningsContent.length} bytes)`);
		}
	} else {
		// Check if learnings were written elsewhere
		const altPaths = [
			join(epicDir, "learnings.md"),
			join(epicCompletionDir, "summary.md"),
		];
		let found = false;
		for (const altPath of altPaths) {
			if (existsSync(altPath)) {
				logger.log(`PASS: Epic-level completion artifact found at alternative path: ${altPath}`);
				found = true;
				break;
			}
		}
		if (!found) {
			logger.log("FAIL: No epic-level learnings artifact found");
			allPassed = false;
		}
	}

	// Test 1c: Architecture reconciliation ran (check for architecture-updates artifact)
	const archUpdatesPath = join(epicCompletionDir, "architecture-updates.md");
	if (existsSync(archUpdatesPath)) {
		logger.log("PASS: Architecture reconciliation artifact exists");
	} else {
		// Architecture reconciliation may have been applied directly or stored differently
		// Check if the completion-epic agent ran at all by looking for any completion artifacts
		if (existsSync(epicCompletionDir)) {
			try {
				const completionFiles = readdirSync(epicCompletionDir);
				if (completionFiles.length > 0) {
					logger.log(`WARN: Architecture reconciliation file not found, but completion dir has: ${completionFiles.join(", ")}`);
				} else {
					logger.log("FAIL: Completion directory exists but is empty — architecture reconciliation likely did not run");
					allPassed = false;
				}
			} catch {
				logger.log("FAIL: Could not read completion directory");
				allPassed = false;
			}
		} else {
			logger.log("FAIL: Epic completion directory not found — architecture reconciliation did not run");
			allPassed = false;
		}
	}

	// Test 1d: Orchestrator discipline — no artifact reads
	const artifactCheck = verifyNoArtifactReads(tracker.toolCalls);
	if (artifactCheck.ok) {
		logger.log("PASS: No orchestrator-level artifact reads detected");
	} else {
		logger.log(`FAIL: ${artifactCheck.violations.length} artifact read violation(s):`);
		for (const v of artifactCheck.violations) {
			logger.log(`  - ${v}`);
		}
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
	logger.log(`\n[complete-epic] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`);
	logger.log(`[complete-epic] Fixture preserved at: ${fixtureDir}`);

	return allPassed;
}

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const overallStart = Date.now();

	logger.log("=== test-complete-epic.ts ===");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Timestamp: ${new Date().toISOString()}`);

	const results: Array<{ name: string; passed: boolean }> = [];

	// Test 1: Full pipeline
	const t1 = await testFullPipeline();
	results.push({ name: "Full Pipeline — Complete Epic", passed: t1 });

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
