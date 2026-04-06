/**
 * Reference loading verification test — confirms that the restructured
 * plugin loads shared references via @ auto-includes (not Read tool calls).
 *
 * Usage: bun tools/dogfood/test-reference-loading.ts [--model <model>]
 *
 * Prerequisites: `bun run build` must have been run first.
 *
 * Tests:
 * 1. /gp:status executes (exercises reference loading)
 * 2. Zero Read tool calls target shared reference paths
 *    (skills/_references/, agents/_references/)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import {
	createLogger,
	createTestEnv,
	isSuccess,
	parseModel,
	platformBinaryDir,
	runSkillSession,
	tierDefault,
} from "./utils";

// ─── Environment ─────────────────────────────────────────────

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");
const GP_BIN = join(PLUGIN_DIR, "binaries", platformBinaryDir(), "gp");
const TEST_DIR = "/tmp/gp-reference-loading-test";
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/validate-logs/test-reference-loading.log");
const TRANSCRIPT_FILE = join(
	GOODPLAN_DIR,
	"tools/dogfood/validate-logs/test-reference-loading.transcript.jsonl",
);
const MODEL = parseModel(tierDefault("e2e"));

// ─── Shared reference path patterns (should NOT be Read targets) ────

const SHARED_REF_PATTERNS = [/skills\/_references\//, /agents\/_references\//];

// ─── Preflight ──────────────────────────────────────────────

if (!existsSync(PLUGIN_DIR)) {
	console.error("FATAL: Plugin not built. Run `bun run build` first.");
	process.exit(1);
}

if (!existsSync(GP_BIN)) {
	console.error("FATAL: Plugin binary not found at", GP_BIN);
	process.exit(1);
}

// ─── Setup ──────────────────────────────────────────────────

console.log("\n[test-reference-loading] Setting up test project...");

execFileSync("rm", ["-rf", TEST_DIR]);
mkdirSync(TEST_DIR, { recursive: true });

// Initialize a goodplan project
const initOutput = execFileSync(GP_BIN, ["init", "--name", "ref-loading-test", "--json"], {
	cwd: TEST_DIR,
	encoding: "utf-8",
	input: "",
});
console.log(`[test-reference-loading] Project initialized: ${initOutput.trim()}`);

// ─── Logging ─────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);

// ─── Tool call collector ─────────────────────────────────────

interface ToolCall {
	name: string;
	input: Record<string, unknown>;
}

function extractToolCalls(messages: SDKMessage[]): ToolCall[] {
	const calls: ToolCall[] = [];
	for (const msg of messages) {
		if (msg.type !== "assistant") continue;
		for (const block of msg.message.content) {
			if (block.type === "tool_use") {
				calls.push({
					name: block.name,
					input: (typeof block.input === "object" && block.input !== null
						? block.input
						: {}) as Record<string, unknown>,
				});
			}
		}
	}
	return calls;
}

function findSharedRefReads(toolCalls: ToolCall[]): string[] {
	const violations: string[] = [];
	for (const call of toolCalls) {
		if (call.name !== "Read") continue;
		const filePath = typeof call.input.file_path === "string" ? call.input.file_path : "";
		if (!filePath) continue;
		for (const pattern of SHARED_REF_PATTERNS) {
			if (pattern.test(filePath)) {
				violations.push(filePath);
				break;
			}
		}
	}
	return violations;
}

// ─── Test: /gp:status with reference loading check ──────────

async function testStatusReferenceLoading(): Promise<{
	statusPassed: boolean;
	zeroSharedReads: boolean;
	sharedReadViolations: string[];
	allToolCalls: ToolCall[];
}> {
	logger.log("\n--- TEST: /gp:status reference loading ---\n");

	const collectedMessages: SDKMessage[] = [];
	let statusPassed = false;

	const session = await runSkillSession({
		prompt:
			"Run `gp status --json` using the Bash tool. Then summarize the project status concisely.",
		options: {
			cwd: TEST_DIR,
			permissionMode: "bypassPermissions",
			allowDangerouslySkipPermissions: true,
			maxTurns: 20,
			maxBudgetUsd: 3,
			model: MODEL,
			settingSources: [],
			plugins: [{ type: "local", path: PLUGIN_DIR }],
			env: createTestEnv(PLUGIN_DIR),
			systemPrompt: {
				type: "preset",
				preset: "claude_code",
				append:
					"You are in an automated test. Execute commands concisely. Do not read any files from the plugin directory — use only CLI commands.",
			},
		},
		transcriptFile: TRANSCRIPT_FILE,
		onMessage: (message) => {
			collectedMessages.push(message);
			if (message.type === "assistant") {
				for (const block of message.message.content) {
					if (block.type === "tool_use") {
						const input = block.input as Record<string, unknown> | undefined;
						if (block.name === "Read") {
							const fp = typeof input?.file_path === "string" ? input.file_path : "?";
							logger.log(`  [Read] ${fp}`);
						} else if (block.name === "Bash") {
							const cmd = typeof input?.command === "string" ? input.command.slice(0, 120) : "?";
							logger.log(`  [Bash] ${cmd}`);
						} else if (block.name === "Skill") {
							logger.log(`  [Skill] ${JSON.stringify(input).slice(0, 120)}`);
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
		logger.log(`Result (first 1000 chars):\n${result.slice(0, 1000)}`);

		if (
			result.includes("ref-loading-test") ||
			result.includes("goodplan") ||
			result.includes("project") ||
			result.includes("status")
		) {
			statusPassed = true;
			logger.log("\nPASS: /gp:status executed successfully");
		} else {
			logger.log("\nFAIL: /gp:status returned unexpected output");
		}
	} else {
		logger.log(`ERROR: ${session.result.subtype}`);
	}

	// Analyze tool calls for shared reference reads
	const allToolCalls = extractToolCalls(collectedMessages);
	const sharedReadViolations = findSharedRefReads(allToolCalls);

	logger.log(`\nTotal tool calls: ${allToolCalls.length}`);
	logger.log(
		`Read tool calls: ${allToolCalls.filter((c) => c.name === "Read").length}`,
	);
	logger.log(`Shared reference Read violations: ${sharedReadViolations.length}`);

	if (sharedReadViolations.length > 0) {
		logger.log("FAIL: Found Read calls targeting shared reference paths:");
		for (const v of sharedReadViolations) {
			logger.log(`  - ${v}`);
		}
	} else {
		logger.log(
			"PASS: Zero Read calls targeting shared reference paths (@ auto-includes working)",
		);
	}

	return {
		statusPassed,
		zeroSharedReads: sharedReadViolations.length === 0,
		sharedReadViolations,
		allToolCalls,
	};
}

// ─── Main ────────────────────────────────────────────────────

async function main(): Promise<void> {
	const startTime = Date.now();

	const result = await testStatusReferenceLoading();
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

	logger.log("\n--- SUMMARY ---");
	logger.log(`Model: ${MODEL}`);
	logger.log(`/gp:status execution: ${result.statusPassed ? "PASS" : "FAIL"}`);
	logger.log(
		`Zero shared ref reads: ${result.zeroSharedReads ? "PASS" : "FAIL"} (${result.sharedReadViolations.length} violations)`,
	);
	logger.log(`Total tool calls: ${result.allToolCalls.length}`);
	logger.log(`Elapsed: ${elapsed}s`);
	logger.log(`Log: ${LOG_FILE}`);

	// Clean up
	execFileSync("rm", ["-rf", TEST_DIR]);
	logger.log(`\n[test-reference-loading] Cleaned up ${TEST_DIR}`);

	// Exit with failure if any test failed
	if (!result.statusPassed || !result.zeroSharedReads) {
		console.error("\nFAILED: One or more checks did not pass");
		process.exit(1);
	}

	console.log("\nAll checks passed.");
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
