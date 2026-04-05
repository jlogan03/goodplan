/**
 * Tests whether Claude can Read files from the plugin's own directory
 * WITHOUT bypassPermissions — i.e., using the default permission mode.
 *
 * Usage: bun tools/dogfood/test-plugin-read-permissions.ts
 */

import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import {
	createLogger,
	createTestEnv,
	platformBinaryDir,
	runSkillSession,
} from "./utils";

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");
const GP_BIN = join(PLUGIN_DIR, "binaries", platformBinaryDir(), "gp");
const TEST_DIR = join(GOODPLAN_DIR, "/tmp/test-read-permissions");
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/validate-logs/test-read-permissions.log");

if (!existsSync(PLUGIN_DIR)) {
	console.error("FATAL: Plugin not built. Run `bun run build` first.");
	process.exit(1);
}

const TARGET_FILE = join(PLUGIN_DIR, "skills/_references/cli-interaction.md");
if (!existsSync(TARGET_FILE)) {
	console.error("FATAL: Target file not found at", TARGET_FILE);
	process.exit(1);
}

mkdirSync(TEST_DIR, { recursive: true });

const logger = createLogger(LOG_FILE);
const messages: SDKMessage[] = [];

console.log("\n[test-read-permissions] Testing Read on plugin file with DEFAULT permissions...");
console.log(`  Target: ${TARGET_FILE}`);
console.log(`  Permission mode: default (NOT bypass)\n`);

const session = await runSkillSession({
	prompt: `Use the Read tool to read the file at this exact absolute path: ${TARGET_FILE}

After reading it, respond with EXACTLY this format:
READ_SUCCESS: <first line of the file>

If you cannot read it due to permissions, respond with:
READ_FAILED: <reason>`,
	options: {
		cwd: TEST_DIR,
		permissionMode: "default",
		allowDangerouslySkipPermissions: false,
		maxTurns: 5,
		maxBudgetUsd: 0.5,
		model: "claude-haiku-4-5",
		settingSources: [],
		plugins: [{ type: "local" as const, path: PLUGIN_DIR }],
		env: createTestEnv(PLUGIN_DIR),
	},
	transcriptFile: LOG_FILE.replace(".log", ".transcript.jsonl"),
	onMessage(msg) {
		messages.push(msg);
	},
});

logger.log(`\nSDK result subtype: ${session.result.subtype}`);
logger.log(`Collected ${messages.length} messages`);

// Extract assistant text
const assistantText = messages
	.filter((m) => m.type === "assistant")
	.flatMap((m) =>
		m.type === "assistant"
			? m.message.content
					.filter((b): b is { type: "text"; text: string } => b.type === "text")
					.map((b) => b.text)
			: [],
	)
	.join("\n");

// Extract tool use and result info
for (const msg of messages) {
	if (msg.type === "assistant" && msg.message?.content) {
		for (const block of msg.message.content) {
			if (block.type === "tool_use") {
				logger.log(`Tool call: ${block.name} -> ${JSON.stringify(block.input).slice(0, 200)}`);
			}
		}
	}
	if (msg.type === "result") {
		logger.log(`Result: subtype=${msg.subtype}`);
	}
}

logger.log(`\nAssistant text:\n${assistantText}\n`);

if (assistantText.includes("READ_SUCCESS")) {
	console.log("✅ SUCCESS: Read tool worked on plugin file with default permissions");
	console.log(`   ${assistantText.trim()}`);
} else if (
	assistantText.includes("READ_FAILED") ||
	assistantText.includes("permission") ||
	assistantText.includes("denied")
) {
	console.log("❌ FAILED: Read requires permission approval for plugin files");
	console.log(`   ${assistantText.trim()}`);
} else {
	console.log("⚠️  UNCLEAR result. Check log for details.");
	console.log(`   Assistant text: ${assistantText.trim().slice(0, 500)}`);

	// Dump all message types for debugging
	for (const msg of messages) {
		logger.log(`  msg type=${msg.type}${msg.type === "result" ? ` subtype=${msg.subtype}` : ""}`);
	}
}

// Check for permission denials in the SDK result
const denials = (session.result as Record<string, unknown>).permission_denials;
if (Array.isArray(denials) && denials.length > 0) {
	console.log(`\n⚠️  Permission denials detected: ${JSON.stringify(denials)}`);
}

console.log(`\n[test-read-permissions] Done. Cost: $${session.totalCost.toFixed(4)}\n`);
