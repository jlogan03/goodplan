/**
 * Integration test for tools/dogfood/utils.ts shared utilities.
 *
 * Exercises all exports against a real temp directory with real `gp` CLI calls.
 *
 * Usage: bun tools/dogfood/test-utils.ts
 */

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import {
	FixtureSetupError,
	checkViolation,
	createCostTracker,
	createLogger,
	createMinimalFixture,
	flushTranscript,
	gp,
	gpForce,
	gpJson,
	isSuccess,
	parseModel,
	resetTranscriptState,
	tierDefault,
	verifyEntityStatus,
	writeTranscriptEntry,
} from "./utils";

// ─── Typed test stubs ──────────────────────────────────────────

function stubMessage(overrides: Record<string, unknown>): SDKMessage {
	return {
		uuid: "test-uuid",
		session_id: "test-session",
		...overrides,
	} as SDKMessage;
}

function stubResultMessage(overrides: Record<string, unknown>): SDKResultMessage {
	return stubMessage(overrides) as SDKResultMessage;
}

let tmpDir: string | undefined;
let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
	if (condition) {
		console.log(`  PASS: ${msg}`);
		passed++;
	} else {
		console.error(`  FAIL: ${msg}`);
		failed++;
	}
}

async function main(): Promise<void> {
	console.log("\n[test-utils] Integration test starting...\n");

	// ─── createLogger ───────────────────────────────────────
	console.log("--- createLogger ---");
	const logFile = `/tmp/gp-test-utils-log-${Date.now()}.log`;
	const logger = createLogger(logFile);
	logger.log("integration test message");
	const logContent = readFileSync(logFile, "utf-8");
	assert(logContent.includes("integration test message"), "log writes to file");
	assert(logContent.includes("Log started:"), "log has header");
	rmSync(logFile, { force: true });

	// ─── gp / gpJson ────────────────────────────────────────
	console.log("\n--- gp / gpJson ---");
	const gpResult = gp(["--version", "--json"]);
	assert(gpResult.exitCode === 0, "gp --version succeeds");
	assert(gpResult.stdout.length > 0, "gp --version has output");

	const version = gpJson<{ version: string }>(["--version", "--json"]);
	assert(typeof version.version === "string", "gpJson parses version");

	// ─── gp with stdin ──────────────────────────────────────
	console.log("\n--- gp with stdin ---");
	const stdinResult = gp(["--version", "--json"], { stdin: '{"test": true}' });
	assert(stdinResult.exitCode === 0, "gp with stdin succeeds");

	// ─── gpForce ────────────────────────────────────────────
	console.log("\n--- gpForce ---");
	const forceResult = gpForce(["--version", "--json"]);
	assert(forceResult.exitCode === 0, "gpForce succeeds on valid command");
	assert(forceResult.retried === false, "gpForce retried is false on success");

	// ─── createCostTracker ──────────────────────────────────
	console.log("\n--- createCostTracker ---");
	const tracker = createCostTracker();
	tracker.add(1.5);
	tracker.add(2.5);
	assert(tracker.total() === 4, "cost tracker accumulates correctly");

	// ─── checkViolation ─────────────────────────────────────
	console.log("\n--- checkViolation ---");
	const violations: string[] = [];
	checkViolation("Read", { file_path: "/tmp/.goodplan/project.json" }, violations);
	assert(violations.length === 1, "detects .goodplan/ Read violation");
	checkViolation("Read", { file_path: "/tmp/.project/project.json" }, violations);
	assert(violations.length === 1, "does not flag .project/ (stale path)");

	// ─── writeTranscriptEntry / flushTranscript ─────────────
	console.log("\n--- writeTranscriptEntry / flushTranscript ---");
	const transcriptFile = `/tmp/gp-test-utils-transcript-${Date.now()}.jsonl`;
	writeTranscriptEntry(transcriptFile, stubMessage({
		type: "assistant",
		message: { content: [] },
	}));
	writeTranscriptEntry(transcriptFile, stubMessage({
		type: "stream_event",
		event: {},
		uuid: "test-uuid-2",
	}));
	flushTranscript(transcriptFile);
	const transcriptContent = readFileSync(transcriptFile, "utf-8").trim();
	const transcriptLines = transcriptContent.split("\n").filter(Boolean);
	assert(transcriptLines.length === 1, "transcript includes assistant, excludes stream_event");
	let jsonValid = false;
	try { JSON.parse(transcriptLines[0]!); jsonValid = true; } catch { /* ignore */ }
	assert(jsonValid, "transcript entry is valid JSON");
	rmSync(transcriptFile, { force: true });

	// ─── resetTranscriptState ───────────────────────────────
	console.log("\n--- resetTranscriptState ---");
	const resetFile = `/tmp/gp-test-utils-reset-${Date.now()}.jsonl`;
	writeTranscriptEntry(resetFile, stubMessage({
		type: "assistant",
		message: { content: [] },
		uuid: "reset-uuid",
	}));
	resetTranscriptState();
	flushTranscript(resetFile);
	assert(!existsSync(resetFile), "resetTranscriptState clears buffer so no file is created");

	// ─── isSuccess ──────────────────────────────────────────
	console.log("\n--- isSuccess ---");
	assert(isSuccess(stubResultMessage({ type: "result", subtype: "success", result: "ok", total_cost_usd: 0.01 })), "isSuccess true for success");
	assert(!isSuccess(stubResultMessage({ type: "result", subtype: "error_during_execution", total_cost_usd: 0 })), "isSuccess false for error");

	// ─── parseModel ─────────────────────────────────────────
	console.log("\n--- parseModel ---");
	assert(parseModel("default-model") === "default-model" || process.argv.includes("--model"), "parseModel returns default or override");

	// ─── tierDefault ────────────────────────────────────────
	console.log("\n--- tierDefault ---");
	assert(tierDefault("structural") === "claude-haiku-4-5", "structural -> haiku");
	assert(tierDefault("pipeline") === "claude-haiku-4-5", "pipeline -> haiku");
	assert(tierDefault("quality") === "claude-sonnet-4-5", "quality -> sonnet");
	assert(tierDefault("e2e") === "claude-opus-4-6", "e2e -> opus");

	// ─── createMinimalFixture ───────────────────────────────
	console.log("\n--- createMinimalFixture ---");
	try {
		tmpDir = await createMinimalFixture();
		assert(existsSync(tmpDir), "fixture dir exists");
		assert(existsSync(join(tmpDir, "package.json")), "fixture has package.json");
		assert(existsSync(join(tmpDir, ".goodplan")), "fixture has .goodplan/");
		assert(existsSync(join(tmpDir, ".git")), "fixture has .git/");

		// gp status --json works in fixture
		const statusResult = gp(["status", "--json"], { cwd: tmpDir });
		assert(statusResult.exitCode === 0, "gp status --json works in fixture");

		// verifyEntityStatus in fixture
		console.log("\n--- verifyEntityStatus ---");
		const epicCheck = verifyEntityStatus("epic", "test-epic", "created", { cwd: tmpDir });
		// The actual status may vary — just check the shape
		assert(typeof epicCheck.ok === "boolean", "verifyEntityStatus returns ok boolean");
		assert(typeof epicCheck.actual === "string", "verifyEntityStatus returns actual string");
		console.log(`  (epic status: ${epicCheck.actual})`);
	} catch (e) {
		if (e instanceof FixtureSetupError) {
			console.error(`  FIXTURE SETUP ERROR: ${e.message}`);
			failed++;
		} else {
			throw e;
		}
	} finally {
		if (tmpDir) {
			rmSync(tmpDir, { recursive: true, force: true });
			assert(!existsSync(tmpDir), "fixture dir cleaned up");
		}
	}

	// ─── Summary ────────────────────────────────────────────
	console.log(`\n--- SUMMARY ---`);
	console.log(`Passed: ${passed}`);
	console.log(`Failed: ${failed}`);

	if (failed > 0) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
