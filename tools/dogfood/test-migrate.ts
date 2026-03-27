/**
 * Migration test harness — runs /migrate skill against a copy of this repo
 * using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-migrate.ts
 *
 * Creates a temporary copy of this repo at /tmp/goodplan-migrate-test/,
 * then runs the /migrate skill against it via the Agent SDK.
 */

import { execFileSync } from "node:child_process";
import {
	appendFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AskUserQuestionInput } from "@anthropic-ai/claude-agent-sdk/sdk-tools";

// ─── Environment ─────────────────────────────────────────────

const HOME = process.env.HOME;
if (!HOME) {
	console.error("FATAL: HOME environment variable is not set");
	process.exit(1);
}

const GOODPLAN_DIR = join(HOME, "Repos/goodplan");
const GOODPLAN_BIN = join(HOME, ".local/bin/goodplan");
const TEST_DIR = "/tmp/goodplan-migrate-test";
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/migrate-test.log");

// ─── Setup ───────────────────────────────────────────────────

console.log("\n[test-migrate] Setting up test copy...");

// Clean previous test
if (existsSync(TEST_DIR)) {
	rmSync(TEST_DIR, { recursive: true, force: true });
}

// Copy the repo using git archive, then overlay .project/
mkdirSync(TEST_DIR, { recursive: true });
execFileSync("bash", ["-c", `git archive HEAD | tar -x -C "${TEST_DIR}"`], { cwd: GOODPLAN_DIR });

// Copy .project/ directory (includes untracked files git archive misses)
cpSync(join(GOODPLAN_DIR, ".project"), join(TEST_DIR, ".project"), { recursive: true });

// Copy CLAUDE.md
if (existsSync(join(GOODPLAN_DIR, "CLAUDE.md"))) {
	cpSync(join(GOODPLAN_DIR, "CLAUDE.md"), join(TEST_DIR, "CLAUDE.md"));
}

// Initialize git in the copy so skills can use git commands
execFileSync("git", ["init"], { cwd: TEST_DIR, stdio: "pipe" });
execFileSync("git", ["add", "-A"], { cwd: TEST_DIR, stdio: "pipe" });
execFileSync("git", ["commit", "-m", "initial"], { cwd: TEST_DIR, stdio: "pipe" });

console.log(`[test-migrate] Test copy at: ${TEST_DIR}`);

// Verify goodplan CLI works against the copy
try {
	const status = execFileSync(GOODPLAN_BIN, ["status", "--json"], {
		cwd: TEST_DIR,
		encoding: "utf-8",
		input: "",
	});
	const parsed = JSON.parse(status);
	console.log(`[test-migrate] Status check passed — ${parsed.artifacts?.totalSlices ?? "?"} slices`);
} catch (e) {
	console.error("[test-migrate] FATAL: goodplan status --json failed on test copy");
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
}

// ─── Logging ─────────────────────────────────────────────────

writeFileSync(LOG_FILE, `# Migration Test Log\nStarted: ${new Date().toISOString()}\n\n`);

function log(content: string): void {
	appendFileSync(LOG_FILE, `${content}\n`);
	console.log(content);
}

// ─── Run /migrate skill ─────────────────────────────────────

const AUTONOMOUS_PROMPT = `
IMPORTANT OVERRIDE — AUTONOMOUS MODE:
You are running inside an automated test harness for testing the /migrate skill.

1. Do NOT use AskUserQuestion. Make all decisions autonomously.
2. When a skill asks for input, use reasonable defaults:
   - For project name: use "goodplan"
   - For epic names/details: read the current .project/ directory to discover them
   - For slice details: read the existing slice directories
   - For approval prompts: approve and continue
3. If you see a "backup before migration" prompt, answer "yes"
4. The goal is to migrate the .project/ directory from flat slices to nested (under epics)
`;

async function main(): Promise<void> {
	const startTime = Date.now();
	log("\n[test-migrate] Running /migrate skill...\n");

	let result = "";
	let messageCount = 0;
	let toolCalls = 0;
	let costUsd = 0;

	try {
		for await (const message of query({
			prompt: "/migrate",
			options: {
				cwd: TEST_DIR,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 300,
				maxBudgetUsd: 15,
				model: "claude-opus-4-6",
				settingSources: ["user", "project"],
				env: {
					...process.env,
					PATH: `${HOME}/.local/bin:${HOME}/bin:${process.env.PATH ?? ""}`,
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: AUTONOMOUS_PROMPT,
				},
				canUseTool: async (toolName: string, input: Record<string, unknown>) => {
					if (toolName === "AskUserQuestion") {
						if (!("questions" in input) || !Array.isArray(input.questions)) {
							return { behavior: "allow" as const, updatedInput: input };
						}
						const typed = input as unknown as AskUserQuestionInput;
						const answers: Record<string, string> = {};
						for (const q of typed.questions) {
							const firstOption = q.options[0];
							answers[q.question] = firstOption?.label ?? "Proceed";
						}
						log(`  [AskUserQuestion] ${typed.questions.map((q) => q.question).join("; ")} → auto: ${Object.values(answers).join(", ")}`);
						return {
							behavior: "allow" as const,
							updatedInput: { questions: typed.questions, answers },
						};
					}
					return { behavior: "allow" as const, updatedInput: input };
				},
			},
		})) {
			messageCount++;

			if (message.type === "result" && message.subtype === "success") {
				result = message.result;
				costUsd = message.total_cost_usd;
				log(`\n--- RESULT ($${costUsd.toFixed(4)}) ---\n${result.slice(0, 3000)}`);
			} else if (message.type === "result") {
				log(`\n--- ERROR (${message.subtype}) ---\n${JSON.stringify("errors" in message ? message.errors : "unknown").slice(0, 1000)}`);
				if ("total_cost_usd" in message) {
					costUsd = message.total_cost_usd;
				}
			} else if (message.type === "assistant") {
				for (const block of message.message.content) {
					if (block.type === "tool_use") {
						toolCalls++;
						if (block.name === "Bash") {
							const cmd = typeof block.input === "object" && block.input && "command" in block.input
								? String(block.input.command).slice(0, 100)
								: "?";
							log(`  [${block.name}] ${cmd}`);
						} else {
							log(`  [${block.name}]`);
						}
					}
				}
			} else if (message.type === "system") {
				if (message.subtype === "task_started") {
					const desc = "description" in message ? String(message.description) : "unknown";
					log(`  [subagent] started: ${desc.slice(0, 100)}`);
				} else if (message.subtype === "task_notification") {
					const status = "status" in message ? String(message.status) : "unknown";
					const summary = "summary" in message ? String(message.summary) : "";
					log(`  [subagent] ${status}: ${summary.slice(0, 100)}`);
				}
			}
		}
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		log(`\n[ERROR] ${errMsg}`);
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	log("\n--- STATS ---");
	log(`Messages: ${messageCount}`);
	log(`Tool calls: ${toolCalls}`);
	log(`Elapsed: ${elapsed}s`);
	log(`Cost: $${costUsd.toFixed(4)}`);

	// ─── Post-migration verification ─────────────────────────

	log("\n--- POST-MIGRATION VERIFICATION ---\n");

	// Check if slices moved under epics
	const hasTopLevelSlices = existsSync(join(TEST_DIR, ".project/slices"));
	log(`Top-level .project/slices/ exists: ${hasTopLevelSlices} (should be false after migration)`);

	// Check status
	try {
		const statusOutput = execFileSync(GOODPLAN_BIN, ["status", "--json"], {
			cwd: TEST_DIR,
			encoding: "utf-8",
			input: "",
		});
		const status = JSON.parse(statusOutput);
		log(`Status: totalSlices=${status.artifacts?.totalSlices}, warnings=${JSON.stringify(status.warnings)}`);
	} catch (e) {
		log(`Status check failed: ${e instanceof Error ? e.message : String(e)}`);
	}

	// Check if .project-old-* backup exists
	try {
		const parentEntries = readdirSync(TEST_DIR);
		const backups = parentEntries.filter((e) => e.startsWith(".project-old"));
		log(`Backup directories: ${backups.length > 0 ? backups.join(", ") : "none"}`);
	} catch {
		log("Could not list test directory");
	}

	log(`\n[test-migrate] Done. Test directory preserved at: ${TEST_DIR}`);
	log(`[test-migrate] Log file: ${LOG_FILE}`);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
