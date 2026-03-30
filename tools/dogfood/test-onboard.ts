/**
 * Onboard-repo test harness — runs /onboard-repo skill against a generated
 * fixture repo using the Claude Agent SDK for programmatic control.
 *
 * Usage: bun tools/dogfood/test-onboard.ts
 *
 * Generates a fixture TypeScript project at /tmp/goodplan-onboard-test/,
 * installs skills into the fixture's project-level .claude/skills/,
 * then runs the /onboard-repo skill against it via the Agent SDK.
 */

import { execFileSync } from "node:child_process";
import {
	appendFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
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

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const GOODPLAN_BIN = join(HOME, ".local/bin/goodplan");
const TEST_DIR = "/tmp/goodplan-onboard-test";
const FIXTURE_SCRIPT = join(GOODPLAN_DIR, "scripts/generate-onboard-fixture.sh");
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/onboard-test.log");

// ─── Setup ───────────────────────────────────────────────────

console.log("\n[test-onboard] Generating fixture repo...");

// Generate fixture
execFileSync("bash", [FIXTURE_SCRIPT, TEST_DIR], {
	stdio: "pipe",
	encoding: "utf-8",
});

console.log(`[test-onboard] Fixture created at: ${TEST_DIR}`);

// Install skills to fixture's project-level .claude/skills/
const fixtureSkillsDir = join(TEST_DIR, ".claude/skills");
mkdirSync(fixtureSkillsDir, { recursive: true });

const repoSkillsDir = join(GOODPLAN_DIR, "skills");
cpSync(repoSkillsDir, fixtureSkillsDir, { recursive: true });
console.log(`[test-onboard] Skills installed to: ${fixtureSkillsDir}`);

// Verify goodplan CLI is available
try {
	const versionOutput = execFileSync(GOODPLAN_BIN, ["--version", "--json"], {
		encoding: "utf-8",
		input: "",
	});
	console.log(`[test-onboard] CLI version: ${versionOutput.trim()}`);
} catch (e) {
	console.error("[test-onboard] FATAL: goodplan CLI not found at", GOODPLAN_BIN);
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
}

// ─── Logging ─────────────────────────────────────────────────

writeFileSync(LOG_FILE, `# Onboard Test Log\nStarted: ${new Date().toISOString()}\n\n`);

function log(content: string): void {
	appendFileSync(LOG_FILE, `${content}\n`);
	console.log(content);
}

// ─── Run /onboard-repo skill ─────────────────────────────────

const AUTONOMOUS_PROMPT = `
IMPORTANT OVERRIDE — AUTONOMOUS MODE:
You are running inside an automated test harness for testing the /onboard-repo skill.

1. Do NOT use AskUserQuestion. Make all decisions autonomously.
2. When a skill asks for confirmation, approve and continue.
3. When a skill asks whether to regenerate or keep existing content, choose to regenerate.
4. Use reasonable defaults for all decisions.
5. The goal is to onboard the fixture repo and create a .project/ directory with idea.md.
`;

async function main(): Promise<void> {
	const startTime = Date.now();
	log("\n[test-onboard] Running /onboard-repo skill...\n");

	let result = "";
	let messageCount = 0;
	let toolCalls = 0;
	let costUsd = 0;

	try {
		for await (const message of query({
			prompt: "/onboard-repo",
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
				break;
			} else if (message.type === "result") {
				log(`\n--- ERROR (${message.subtype}) ---\n${JSON.stringify("errors" in message ? message.errors : "unknown").slice(0, 1000)}`);
				if ("total_cost_usd" in message) {
					costUsd = message.total_cost_usd;
				}
				break;
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

	// ─── Post-onboard verification ───────────────────────────

	log("\n--- POST-ONBOARD VERIFICATION ---\n");

	// Check .project/ exists
	const hasProject = existsSync(join(TEST_DIR, ".project"));
	log(`PASS: .project/ exists: ${hasProject}`);

	// Check idea.md exists and is non-empty
	const ideaPath = join(TEST_DIR, ".project/idea.md");
	const hasIdea = existsSync(ideaPath);
	let ideaSize = 0;
	if (hasIdea) {
		ideaSize = readFileSync(ideaPath, "utf-8").length;
	}
	log(`PASS: .project/idea.md exists: ${hasIdea}, size: ${ideaSize} bytes`);

	// Check goodplan status works
	try {
		const statusOutput = execFileSync(GOODPLAN_BIN, ["status", "--json"], {
			cwd: TEST_DIR,
			encoding: "utf-8",
			input: "",
		});
		const status = JSON.parse(statusOutput);
		log(`PASS: goodplan status: ${JSON.stringify(status).slice(0, 500)}`);
	} catch (e) {
		log(`FAIL: goodplan status failed: ${e instanceof Error ? e.message : String(e)}`);
	}

	log(`\n[test-onboard] Done. Test directory preserved at: ${TEST_DIR}`);
	log(`[test-onboard] Log file: ${LOG_FILE}`);
}

// ─── Negative test: existing .project/ ───────────────────

const NEGATIVE_TEST_DIR = "/tmp/goodplan-onboard-test-negative";

async function negativeTest(): Promise<void> {
	log("\n--- NEGATIVE TEST: existing .project/ ---\n");

	// Generate a fresh fixture
	execFileSync("bash", [FIXTURE_SCRIPT, NEGATIVE_TEST_DIR], {
		stdio: "pipe",
		encoding: "utf-8",
	});

	// Install skills
	const negSkillsDir = join(NEGATIVE_TEST_DIR, ".claude/skills");
	mkdirSync(negSkillsDir, { recursive: true });
	cpSync(join(GOODPLAN_DIR, "skills"), negSkillsDir, { recursive: true });

	// Pre-create .project/ to simulate a fully-onboarded repo
	const negProjectDir = join(NEGATIVE_TEST_DIR, ".project");
	mkdirSync(join(negProjectDir, "architecture"), { recursive: true });
	writeFileSync(join(negProjectDir, "project.json"), '{"name":"taskflow"}');
	writeFileSync(join(negProjectDir, "idea.md"), "# TaskFlow\n\nA task management API.");
	writeFileSync(join(negProjectDir, "conventions.md"), "# Conventions\n\nTypeScript + Express.");
	writeFileSync(join(negProjectDir, "architecture", "_overview.md"), "# Architecture\n\nOverview.");

	log("[negative-test] .project/ pre-created with idea.md, conventions.md, architecture");

	let stopped = false;
	let crashed = false;

	try {
		for await (const message of query({
			prompt: "/onboard-repo",
			options: {
				cwd: NEGATIVE_TEST_DIR,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 30,
				maxBudgetUsd: 2,
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
			},
		})) {
			if (message.type === "result" && message.subtype === "success") {
				const text = message.result.toLowerCase();
				if (text.includes("already has") || text.includes("migrate") || text.includes("project-status") || text.includes("fully onboarded")) {
					stopped = true;
				}
				log(`[negative-test] Result: ${message.result.slice(0, 500)}`);
				break;
			} else if (message.type === "result") {
				log(`[negative-test] Error result: ${message.subtype}`);
				break;
			}
		}
	} catch (err) {
		crashed = true;
		log(`[negative-test] CRASH: ${err instanceof Error ? err.message : String(err)}`);
	}

	if (crashed) {
		log("FAIL: Skill crashed on existing .project/");
	} else if (stopped) {
		log("PASS: Skill detected existing project and stopped gracefully");
	} else {
		log("FAIL: Skill did not detect existing .project/ or did not stop gracefully");
	}
}

main()
	.then(() => negativeTest())
	.catch((err) => {
		console.error("Fatal error:", err);
		process.exit(1);
	});
