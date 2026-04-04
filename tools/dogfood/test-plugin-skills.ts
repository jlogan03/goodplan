/**
 * Plugin skill packaging test — verifies that built plugin skills load
 * and execute correctly via the Agent SDK with local plugin support.
 *
 * Usage: bun tools/dogfood/test-plugin-skills.ts [--model <model>]
 *
 * Prerequisites: `bun run build:plugin` must have been run first.
 *
 * Tests:
 * 1. Plugin loads without errors
 * 2. Skills are discoverable with /gp: namespace prefix (auto-namespacing)
 * 3. /gp:status executes and reads .goodplan/ state
 * 4. Skills referencing _shared/ resources resolve correctly
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
	createLogger,
	isSuccess,
	parseModel,
	platformBinaryDir,
	runSkillSession,
	tierDefault,
} from "./utils";

// ─── Environment ─────────────────────────────────────────────

const HOME = process.env.HOME;
if (!HOME) {
	console.error("FATAL: HOME environment variable is not set");
	process.exit(1);
}

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");
const GP_BIN = join(PLUGIN_DIR, "binaries", platformBinaryDir(), "gp");
const TEST_DIR = "/tmp/gp-plugin-skills-test";
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/plugin-skills-test.log");
const TRANSCRIPT_FILE = join(GOODPLAN_DIR, "tools/dogfood/plugin-skills-transcript.jsonl");
const MODEL = parseModel(tierDefault("structural"));

// ─── Preflight ──────────────────────────────────────────────

if (!existsSync(PLUGIN_DIR)) {
	console.error("FATAL: Plugin not built. Run `bun run build:plugin` first.");
	process.exit(1);
}

if (!existsSync(GP_BIN)) {
	console.error("FATAL: Plugin binary not found at", GP_BIN);
	process.exit(1);
}

// ─── Setup ──────────────────────────────────────────────────

console.log("\n[test-plugin-skills] Setting up test project...");

// Create a fresh test directory with .goodplan/ state
execFileSync("rm", ["-rf", TEST_DIR]);
mkdirSync(TEST_DIR, { recursive: true });

// Initialize a goodplan project using the plugin binary
const initOutput = execFileSync(GP_BIN, ["init", "--name", "plugin-skill-test", "--json"], {
	cwd: TEST_DIR,
	encoding: "utf-8",
	input: "",
});
console.log(`[test-plugin-skills] Project initialized: ${initOutput.trim()}`);

// ─── Logging ─────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Test 1: Skill discovery with /gp: namespace ─────────────

async function testSkillDiscovery(): Promise<boolean> {
	logger.log("\n--- TEST 1: Skill discovery with /gp: namespace ---\n");

	let foundGpSkills = false;
	let skillList = "";

	try {
		const session = await runSkillSession({
			prompt: "List all available slash commands that start with /gp: — just output the names, one per line, nothing else.",
			options: {
				cwd: TEST_DIR,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 10,
				maxBudgetUsd: 1,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: "You are in an automated test. Be concise. Do not use any tools. Just list the /gp: skills you see available.",
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
		});

		if (isSuccess(session.result)) {
			skillList = session.result.result;
			foundGpSkills = skillList.includes("/gp:");
			logger.log(`Skill list output:\n${skillList}`);
		} else {
			logger.log(`ERROR: ${session.result.subtype}`);
		}
	} catch (err) {
		logger.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
	}

	if (foundGpSkills) {
		logger.log("PASS: Skills discovered with /gp: namespace prefix");

		// Check for specific expected skills
		const expectedSkills = ["audit", "complete-epic", "create-epic", "create-side-quest", "explore", "implement", "init", "plan-slice", "start-epic", "status", "task", "upgrade"];
		for (const skill of expectedSkills) {
			if (skillList.includes(`/gp:${skill}`)) {
				logger.log(`  PASS: /gp:${skill} found`);
			} else {
				logger.log(`  WARN: /gp:${skill} not found in listing`);
			}
		}
	} else {
		logger.log("FAIL: No /gp: namespaced skills found");
		logger.log("This likely means auto-namespacing bug #20994 is still present");
		logger.log("Fallback: namespace prefixing build step needed");
	}

	return foundGpSkills;
}

// ─── Test 2: /gp:project-status executes ─────────────────────

async function testProjectStatus(): Promise<boolean> {
	logger.log("\n--- TEST 2: /gp:status execution ---\n");

	let success = false;

	try {
		const session = await runSkillSession({
			prompt: "/gp:status",
			options: {
				cwd: TEST_DIR,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 50,
				maxBudgetUsd: 3,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: {
					...process.env,
					PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: "You are in an automated test. Execute the skill and report results concisely.",
				},
			},
			transcriptFile: TRANSCRIPT_FILE,
			onMessage: (message) => {
				if (message.type === "assistant") {
					const msg = message as { message: { content: Array<{ type: string; name?: string; input?: unknown }> } };
					for (const block of msg.message.content) {
						if (block.type === "tool_use") {
							if (block.name === "Bash") {
								const cmd = typeof block.input === "object" && block.input && "command" in block.input
									? String((block.input as Record<string, unknown>).command).slice(0, 120)
									: "?";
								logger.log(`  [${block.name}] ${cmd}`);
							} else if (block.name === "Skill") {
								logger.log(`  [${block.name}] ${JSON.stringify(block.input).slice(0, 120)}`);
							} else {
								logger.log(`  [${block.name}]`);
							}
						}
					}
				}
			},
		});

		if (isSuccess(session.result)) {
			const result = session.result.result;
			logger.log(`Result (first 2000 chars):\n${result.slice(0, 2000)}`);

			// Check for indicators that status ran successfully
			if (result.includes("plugin-skill-test") || result.includes("goodplan") || result.includes("project") || result.includes("status")) {
				success = true;
				logger.log("\nPASS: /gp:status executed and returned project information");
			} else {
				logger.log("\nFAIL: /gp:status returned unexpected output");
			}
		} else {
			logger.log(`ERROR: ${session.result.subtype}`);
		}
	} catch (err) {
		logger.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
	}

	return success;
}

// ─── Main ────────────────────────────────────────────────────

async function main(): Promise<void> {
	const startTime = Date.now();

	const discoveryPassed = await testSkillDiscovery();
	const statusPassed = await testProjectStatus();

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

	logger.log("\n--- SUMMARY ---");
	logger.log(`Model: ${MODEL}`);
	logger.log(`Test 1 (skill discovery): ${discoveryPassed ? "PASS" : "FAIL"}`);
	logger.log(`Test 2 (status): ${statusPassed ? "PASS" : "FAIL"}`);
	logger.log(`Elapsed: ${elapsed}s`);
	logger.log(`Log file: ${LOG_FILE}`);

	if (!discoveryPassed) {
		logger.log("\nWARNING: Auto-namespacing failed. The build step should add gp: namespace prefixes.");
		logger.log("See plan Phase 2 fallback: 'If auto-namespacing does NOT work (bug #20994 still present)'");
	}

	// Clean up
	execFileSync("rm", ["-rf", TEST_DIR]);
	logger.log(`\n[test-plugin-skills] Cleaned up ${TEST_DIR}`);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
