/**
 * Audit orchestrator test harness -- runs /gp:audit skill against a fixture
 * using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-audit.ts [--model <model>]
 *
 * Creates a fixture project with source code, docs, and tests, builds the
 * plugin, then runs `/gp:audit` in each mode via the Agent SDK with a
 * simulated user.
 *
 * Tests:
 * 1. Architecture mode: produces findings
 * 2. Docs mode: produces findings
 * 3. Tests mode: produces findings
 * 4. Invalid mode: graceful error message
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
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
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/audit-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/audit-transcript.jsonl");
const MODEL = parseModel(tierDefault("pipeline"));

const EPIC_NAME = "test-audit-epic";

// ─── Preflight ──────────────────────────────────────────────

console.log("\n[test-audit] Building plugin...");
try {
	execFileSync("bun", ["run", "build:plugin"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[test-audit] Plugin built successfully");
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

// Sync skills and agents from dist to installed cache
const installedSkillsDir = join(HOME, ".claude/plugins/cache/goodplan-marketplace/goodplan");
try {
	const versions = readdirSync(installedSkillsDir)
		.filter((d: string) => statSync(join(installedSkillsDir, d)).isDirectory())
		.sort()
		.reverse();
	const latestVersion = versions[0];
	if (latestVersion) {
		const installedPluginDir = join(installedSkillsDir, latestVersion);
		// Sync audit skill to installed cache
		const srcSkill = join(PLUGIN_DIR, "skills", "audit");
		const dstSkill = join(installedPluginDir, "skills", "audit");
		if (existsSync(srcSkill)) {
			mkdirSync(dstSkill, { recursive: true });
			execFileSync("rsync", ["-a", "--exclude", ".DS_Store", `${srcSkill}/`, `${dstSkill}/`]);
			console.log("[test-audit] Synced audit skill to installed cache");
		}
		// Sync agents to installed cache
		const srcAgents = join(PLUGIN_DIR, "agents");
		const dstAgents = join(installedPluginDir, "agents");
		if (existsSync(srcAgents)) {
			execFileSync("rsync", ["-a", "--exclude", ".DS_Store", `${srcAgents}/`, `${dstAgents}/`]);
			console.log("[test-audit] Synced agents to installed cache");
		}
	}
} catch (err) {
	console.warn(
		"[test-audit] WARN: Could not sync to installed cache:",
		err instanceof Error ? err.message : String(err),
	);
}

// ─── Logging ────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Fixture Creation ───────────────────────────────────────

/**
 * Creates a fixture with source code, docs, tests, and architecture --
 * realistic enough for meaningful audit findings in all three modes.
 */
async function createAuditFixture(): Promise<string> {
	const fixtureDir = await createMinimalFixture({
		epicName: EPIC_NAME,
		sliceName: "test-slice",
		sliceGoal: "Placeholder slice for audit fixture",
		withSource: true,
		activateEpic: true,
		architectureFiles: {
			"_overview.md": [
				"# Architecture Overview",
				"",
				"## System Summary",
				"",
				"A simple TypeScript project with two subsystems: core and utils.",
				"",
				"## Subsystems",
				"",
				"### Core",
				"",
				"Main application logic. Handles data processing and validation.",
				"",
				"**Dependencies:** Utils",
				"",
				"### Utils",
				"",
				"Utility functions shared across the application.",
				"",
				"**Dependencies:** None",
				"",
				"## Subsystem Maturity",
				"",
				"| Subsystem | Maturity | Dependents | Fitness Functions | Notes |",
				"|---|---|---|---|---|",
				"| Core | Developing | — | candidate | Main logic |",
				"| Utils | Experimental | Core | — | Shared utilities |",
			].join("\n"),
			"invariants.md": [
				"# Invariants",
				"",
				"## INV-001: No direct filesystem access outside data layer",
				"",
				"All filesystem operations must go through the data layer. Direct `fs` calls",
				"outside `src/data/` are prohibited.",
				"",
				"## INV-002: All exports must have JSDoc",
				"",
				"Every exported function, type, or interface must have a JSDoc comment.",
			].join("\n"),
		},
	});

	// Add source files with intentional gaps for auditing
	const srcDir = join(fixtureDir, "src");

	// Core module -- has architecture coverage
	mkdirSync(join(srcDir, "core"), { recursive: true });
	writeFileSync(
		join(srcDir, "core/processor.ts"),
		[
			"/** Process input data and return transformed output. */",
			"export function processData(input: string): string {",
			"  return input.toUpperCase();",
			"}",
			"",
			"// Undocumented export (gap for docs audit)",
			"export function validateInput(input: unknown): boolean {",
			"  return typeof input === 'string' && input.length > 0;",
			"}",
			"",
			"// Uses utils -- allowed by architecture",
			"import { formatOutput } from '../utils/formatter';",
			"",
			"export function processAndFormat(input: string): string {",
			"  return formatOutput(processData(input));",
			"}",
		].join("\n"),
	);

	// Utils module -- has architecture coverage
	mkdirSync(join(srcDir, "utils"), { recursive: true });
	writeFileSync(
		join(srcDir, "utils/formatter.ts"),
		[
			"/** Format output for display. */",
			"export function formatOutput(value: string): string {",
			"  return `[OUTPUT] ${value}`;",
			"}",
			"",
			"/** Parse a configuration string. */",
			"export function parseConfig(raw: string): Record<string, string> {",
			"  const result: Record<string, string> = {};",
			"  for (const line of raw.split('\\n')) {",
			"    const [key, val] = line.split('=');",
			"    if (key && val) result[key.trim()] = val.trim();",
			"  }",
			"  return result;",
			"}",
		].join("\n"),
	);

	// Undocumented module -- gap for architecture audit
	mkdirSync(join(srcDir, "helpers"), { recursive: true });
	writeFileSync(
		join(srcDir, "helpers/strings.ts"),
		[
			"// No JSDoc -- gap for docs audit",
			"export function capitalize(s: string): string {",
			"  return s.charAt(0).toUpperCase() + s.slice(1);",
			"}",
			"",
			"export function slugify(s: string): string {",
			"  return s.toLowerCase().replace(/\\s+/g, '-');",
			"}",
		].join("\n"),
	);

	// Add some docs with intentional staleness
	mkdirSync(join(fixtureDir, "docs"), { recursive: true });
	writeFileSync(
		join(fixtureDir, "docs/api.md"),
		[
			"# API Documentation",
			"",
			"## Core Module",
			"",
			"### processData(input: string): string",
			"",
			"Processes input data. Returns transformed output.",
			"",
			"### oldFunction(data: object): void",
			"",
			"This function handles legacy data processing.",
			"*(Note: this function was removed in v2)*",
			"",
			"## Utils Module",
			"",
			"### formatOutput(value: string): string",
			"",
			"Formats output for display.",
		].join("\n"),
	);

	writeFileSync(
		join(fixtureDir, "README.md"),
		[
			"# Test Fixture Project",
			"",
			"A simple TypeScript project for testing.",
			"",
			"## Getting Started",
			"",
			"```bash",
			"npm install",
			"npm run build",
			"```",
			"",
			"## API",
			"",
			"See `docs/api.md` for documentation.",
		].join("\n"),
	);

	// Add test files with intentional issues
	mkdirSync(join(fixtureDir, "tests"), { recursive: true });
	writeFileSync(
		join(fixtureDir, "tests/processor.test.ts"),
		[
			'import { describe, it, expect } from "vitest";',
			'import { processData } from "../src/core/processor";',
			"",
			'describe("processData", () => {',
			'  it("should uppercase input", () => {',
			'    expect(processData("hello")).toBe("HELLO");',
			"  });",
			"});",
			"",
			"// No tests for validateInput or processAndFormat (coverage gap)",
		].join("\n"),
	);

	writeFileSync(
		join(fixtureDir, "tests/formatter.test.ts"),
		[
			'import { describe, it, expect } from "vitest";',
			'import { formatOutput } from "../src/utils/formatter";',
			"",
			'describe("formatOutput", () => {',
			'  it("should format output", () => {',
			'    expect(formatOutput("test")).toBe("[OUTPUT] test");',
			"  });",
			"});",
			"",
			"// No tests for parseConfig (coverage gap)",
		].join("\n"),
	);

	// Stale test -- imports something that doesn't exist
	writeFileSync(
		join(fixtureDir, "tests/legacy.test.ts"),
		[
			'import { describe, it, expect } from "vitest";',
			"// import { oldFunction } from '../src/core/legacy';  // removed",
			"",
			'describe("legacy", () => {',
			'  it("placeholder", () => {',
			"    // This test is stale -- the module was removed",
			"    expect(true).toBe(true);",
			"  });",
			"});",
		].join("\n"),
	);

	// No tests for helpers module (coverage gap)

	// Add vitest config
	writeFileSync(
		join(fixtureDir, "vitest.config.ts"),
		[
			'import { defineConfig } from "vitest/config";',
			"",
			"export default defineConfig({",
			"  test: {",
			'    include: ["tests/**/*.test.ts"],',
			"  },",
			"});",
		].join("\n"),
	);

	// Commit fixture files
	execFileSync("git", ["add", "-A"], { cwd: fixtureDir, stdio: "pipe" });
	execFileSync(
		"git",
		[
			"-c",
			"user.name=test",
			"-c",
			"user.email=test@test.com",
			"commit",
			"-m",
			"add audit fixture files",
		],
		{ cwd: fixtureDir, stdio: "pipe" },
	);

	return fixtureDir;
}

// ─── Tool Call Tracker ──────────────────────────────────────

function createToolCallTracker(logFn: (msg: string) => void): {
	onMessage: (message: SDKMessage) => void;
} {
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

	return { onMessage };
}

// ─── Load SKILL.md ──────────────────────────────────────────

function loadSkillBody(): string {
	const skillMdPath = join(PLUGIN_DIR, "skills", "audit", "SKILL.md");
	if (!existsSync(skillMdPath)) {
		logger.log("FATAL: audit SKILL.md not found in dist");
		process.exit(1);
	}
	const skillContent = readFileSync(skillMdPath, "utf-8");
	return skillContent.replace(/^---[\s\S]*?---\n/, "");
}

// ─── Test: Run a single audit mode ──────────────────────────

async function testAuditMode(mode: string, fixtureDir: string): Promise<boolean> {
	logger.log("\n========================================");
	logger.log(`TEST: Audit mode '${mode}'`);
	logger.log("========================================\n");

	const startTime = Date.now();

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: [
			`You are testing the /gp:audit skill in '${mode}' mode.`,
			"When asked about side quests, approve all proposed side quests.",
			"When asked any yes/no question, say yes.",
			"Always choose concrete answers.",
		].join("\n"),
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody();

	logger.log(`[${mode}] Running /gp:audit ${mode} (model: ${MODEL})...\n`);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: `Run /gp:audit ${mode}. Analyze the project and report findings.`,
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 200,
				maxBudgetUsd: 15,
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
						"Do not ask the user to confirm -- proceed automatically.",
						"When AskUserQuestion is needed, use it (the harness has a simulated user).",
						"",
						"# Audit Skill Instructions",
						"",
						skillBody,
					].join("\n"),
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser,
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

	// ─── Verification ──────────────────────────────────

	logger.log(`\n--- POST-RUN VERIFICATION (${mode}) ---\n`);

	let passed = true;

	// Check if session completed successfully
	if (sessionResult && isSuccess(sessionResult.result)) {
		logger.log("PASS: Session completed successfully");
	} else {
		logger.log("FAIL: Session did not complete successfully");
		passed = false;
	}

	// Check if the result text mentions findings
	if (sessionResult && isSuccess(sessionResult.result)) {
		const resultText = sessionResult.result.result.toLowerCase();
		const hasFindingMention =
			resultText.includes("finding") ||
			resultText.includes("audit") ||
			resultText.includes("score") ||
			resultText.includes("complete");
		if (hasFindingMention) {
			logger.log("PASS: Result mentions findings/audit output");
		} else {
			logger.log("WARN: Result does not clearly mention findings");
		}
	}

	// Check that audit report file was created
	const auditsDir = join(fixtureDir, ".goodplan", "audits");
	if (existsSync(auditsDir)) {
		const reportFiles = readdirSync(auditsDir).filter(
			(f: string) => f.startsWith(`${mode}-`) && f.endsWith(".md"),
		);
		if (reportFiles.length > 0) {
			logger.log(`PASS: Audit report file created: ${reportFiles[0]}`);
		} else {
			logger.log(`FAIL: No ${mode}-*.md report file found in .goodplan/audits/`);
			passed = false;
		}
	} else {
		logger.log("FAIL: .goodplan/audits/ directory not created");
		passed = false;
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	logger.log(
		`\n[${mode}] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`,
	);

	return passed;
}

// ─── Test: Invalid mode ─────────────────────────────────────

async function testInvalidMode(fixtureDir: string): Promise<boolean> {
	logger.log("\n========================================");
	logger.log("TEST: Invalid mode argument");
	logger.log("========================================\n");

	const startTime = Date.now();

	const simulatedUser = createSimulatedUser({
		cwd: fixtureDir,
		systemPrompt: "You are testing error handling. The skill should reject an invalid mode.",
		transcriptFile: TRANSCRIPT_FILE,
		model: MODEL,
	});

	const tracker = createToolCallTracker(logger.log.bind(logger));
	const skillBody = loadSkillBody();

	logger.log(`[invalid-mode] Running /gp:audit banana (model: ${MODEL})...\n`);

	let sessionResult: Awaited<ReturnType<typeof runSkillSession>> | undefined;

	try {
		sessionResult = await runSkillSession({
			prompt: "Run /gp:audit banana. This is an invalid mode and should produce an error message.",
			options: {
				cwd: fixtureDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 50,
				maxBudgetUsd: 5,
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
						"",
						"# Audit Skill Instructions",
						"",
						skillBody,
					].join("\n"),
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			simulatedUser,
			onMessage: tracker.onMessage,
		});

		if (isSuccess(sessionResult.result)) {
			logger.log(`\n--- RESULT ($${sessionResult.totalCost.toFixed(4)}) ---`);
			logger.log(sessionResult.result.result.slice(0, 2000));
		} else {
			logger.log(`\n--- ERROR (${sessionResult.result.subtype}) ---`);
		}
	} catch (err) {
		logger.log(`\n[ERROR] ${err instanceof Error ? err.message : String(err)}`);
	} finally {
		simulatedUser.close();
	}

	// ─── Verification ──────────────────────────────────

	logger.log("\n--- POST-RUN VERIFICATION (invalid mode) ---\n");

	let passed = true;

	// Check that the result mentions the invalid mode error
	if (sessionResult && isSuccess(sessionResult.result)) {
		const resultText = sessionResult.result.result.toLowerCase();
		const hasErrorMention =
			resultText.includes("invalid") ||
			resultText.includes("error") ||
			resultText.includes("banana") ||
			resultText.includes("valid modes");
		if (hasErrorMention) {
			logger.log("PASS: Error message mentions invalid mode");
		} else {
			logger.log("FAIL: Error message does not clearly indicate invalid mode");
			passed = false;
		}
	} else {
		// Even a non-success result is acceptable for an error case
		logger.log("INFO: Session ended with non-success (acceptable for error test)");
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	logger.log(
		`\n[invalid-mode] Elapsed: ${elapsed}s | Cost: $${sessionResult?.totalCost.toFixed(4) ?? "unknown"}`,
	);

	return passed;
}

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const overallStart = Date.now();

	logger.log("=== test-audit.ts ===");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Timestamp: ${new Date().toISOString()}`);

	// Create a shared fixture for all tests
	logger.log("\n[setup] Creating audit fixture...");
	const fixtureDir = await createAuditFixture();
	logger.log(`[setup] Fixture created at: ${fixtureDir}`);

	const results: Array<{ name: string; passed: boolean }> = [];

	// Test 1: Architecture mode
	const t1 = await testAuditMode("architecture", fixtureDir);
	results.push({ name: "Architecture mode", passed: t1 });

	// Test 2: Docs mode
	const t2 = await testAuditMode("docs", fixtureDir);
	results.push({ name: "Docs mode", passed: t2 });

	// Test 3: Tests mode
	const t3 = await testAuditMode("tests", fixtureDir);
	results.push({ name: "Tests mode", passed: t3 });

	// Test 4: Invalid mode
	const t4 = await testInvalidMode(fixtureDir);
	results.push({ name: "Invalid mode", passed: t4 });

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
	logger.log(`Fixture preserved at: ${fixtureDir}`);

	if (!allPassed) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
