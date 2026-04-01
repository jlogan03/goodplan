import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
	SDKMessage,
	SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
import {
	type CliResult,
	FixtureSetupError,
	checkViolation,
	createCostTracker,
	createLogger,
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
} from "../../../tools/dogfood/utils";

// ─── Typed test stubs ──────────────────────────────────────────

/** Create a minimal SDKMessage stub with only the fields the test needs. */
function stubMessage(overrides: Record<string, unknown>): SDKMessage {
	return {
		uuid: "test-uuid",
		session_id: "test-session",
		...overrides,
	} as SDKMessage;
}

function stubResultSuccess(overrides?: Record<string, unknown>): SDKResultMessage {
	return stubMessage({
		type: "result",
		subtype: "success",
		result: "ok",
		total_cost_usd: 0.01,
		...overrides,
	}) as SDKResultMessage;
}

function stubResultError(overrides?: Record<string, unknown>): SDKResultMessage {
	return stubMessage({
		type: "result",
		subtype: "error_during_execution",
		total_cost_usd: 0,
		...overrides,
	}) as SDKResultMessage;
}

// ─── createLogger ───────────────────────────────────────────

describe("createLogger", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = join("/tmp", `gp-utils-test-${Date.now()}`);
		mkdirSync(tmpDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("writes to file and console", () => {
		const logFile = join(tmpDir, "test.log");
		const logger = createLogger(logFile);
		logger.log("hello world");

		const content = readFileSync(logFile, "utf-8");
		expect(content).toContain("hello world");
		expect(content).toContain("Log started:");
	});

	it("creates parent directories", () => {
		const logFile = join(tmpDir, "nested/dir/test.log");
		const logger = createLogger(logFile);
		logger.log("nested test");

		expect(existsSync(logFile)).toBe(true);
	});
});

// ─── gp / gpJson ────────────────────────────────────────────

describe("gp", () => {
	it("returns stdout and exitCode 0 on success", () => {
		const result = gp(["--version", "--json"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout.length).toBeGreaterThan(0);
	});

	it("returns non-zero exitCode on bad command", () => {
		const result = gp(["nonexistent-command"]);
		expect(result.exitCode).not.toBe(0);
	});

	it("passes stdin option through to the process", () => {
		// gp --version ignores stdin, but the call should succeed without error
		const result = gp(["--version", "--json"], { stdin: '{"test": true}' });
		expect(result.exitCode).toBe(0);
	});
});

describe("gpJson", () => {
	it("parses JSON from successful command", () => {
		const data = gpJson<{ version: string }>(["--version", "--json"]);
		expect(data).toHaveProperty("version");
	});

	it("throws on failed command", () => {
		expect(() => gpJson(["nonexistent-command"])).toThrow();
	});
});

// ─── gpForce ────────────────────────────────────────────────

describe("gpForce", () => {
	it("returns retried: false on first-attempt success", () => {
		const result = gpForce(["--version", "--json"]);
		expect(result.retried).toBe(false);
		expect(result.exitCode).toBe(0);
	});

	it("returns failing result as-is when not CONCURRENT_MODIFICATION", () => {
		const result = gpForce(["nonexistent-command"]);
		expect(result.retried).toBe(false);
		expect(result.exitCode).not.toBe(0);
	});
});

// ─── verifyEntityStatus ─────────────────────────────────────

describe("verifyEntityStatus", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = join("/tmp", `gp-verify-test-${Date.now()}`);
		mkdirSync(tmpDir, { recursive: true });
		// Initialize a minimal project
		writeFileSync(
			join(tmpDir, "package.json"),
			JSON.stringify({ name: "test", version: "0.1.0" }),
		);
		const { execFileSync } = require("node:child_process");
		execFileSync("git", ["init"], { cwd: tmpDir, stdio: "pipe" });
		execFileSync("git", ["add", "-A"], { cwd: tmpDir, stdio: "pipe" });
		execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "-m", "init"], {
			cwd: tmpDir,
			stdio: "pipe",
		});
		gp(["init", "--name", "verify-test", "--json"], { cwd: tmpDir });
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns ok: false for non-existent entity", () => {
		const result = verifyEntityStatus("epic", "nonexistent", "active", {
			cwd: tmpDir,
		});
		expect(result.ok).toBe(false);
		expect(result.actual).toBe("not-found");
	});
});

// ─── checkViolation ─────────────────────────────────────────

describe("checkViolation", () => {
	it("detects Read on .goodplan/ .json files", () => {
		const violations: string[] = [];
		checkViolation("Read", { file_path: "/path/.goodplan/project.json" }, violations);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toContain("Read");
	});

	it("detects Write on .goodplan/ .jsonl files", () => {
		const violations: string[] = [];
		checkViolation("Write", { file_path: "/path/.goodplan/activity-log.jsonl" }, violations);
		expect(violations).toHaveLength(1);
	});

	it("detects Edit on .goodplan/ .json files", () => {
		const violations: string[] = [];
		checkViolation("Edit", { file_path: "/path/.goodplan/epics/overview.json" }, violations);
		expect(violations).toHaveLength(1);
	});

	it("detects Bash cat on .goodplan/ JSON", () => {
		const violations: string[] = [];
		checkViolation("Bash", { command: "cat /path/.goodplan/project.json" }, violations);
		expect(violations).toHaveLength(1);
	});

	it("ignores safe operations (Read on .md)", () => {
		const violations: string[] = [];
		checkViolation("Read", { file_path: "/path/.goodplan/idea.md" }, violations);
		expect(violations).toHaveLength(0);
	});

	it("does NOT match .project/ (stale path)", () => {
		const violations: string[] = [];
		checkViolation("Read", { file_path: "/path/.project/project.json" }, violations);
		expect(violations).toHaveLength(0);
	});

	it("ignores non-object input", () => {
		const violations: string[] = [];
		checkViolation("Read", null, violations);
		checkViolation("Read", "string", violations);
		expect(violations).toHaveLength(0);
	});

	it("ignores array input", () => {
		const violations: string[] = [];
		checkViolation("Read", [{ file_path: "/path/.goodplan/project.json" }], violations);
		expect(violations).toHaveLength(0);
	});

	it("detects Bash sed -i on .goodplan/ JSON", () => {
		const violations: string[] = [];
		checkViolation("Bash", { command: 'sed -i "" "s/old/new/" /path/.goodplan/project.json' }, violations);
		expect(violations).toHaveLength(1);
	});

	it("detects Bash node -e writing to .goodplan/", () => {
		const violations: string[] = [];
		checkViolation("Bash", { command: 'node -e "require(\'fs\').writeFileSync(\'.goodplan/project.json\', \'{}\')"' }, violations);
		expect(violations).toHaveLength(1);
	});
});

// ─── createCostTracker ──────────────────────────────────────

describe("createCostTracker", () => {
	it("accumulates correctly", () => {
		const tracker = createCostTracker();
		expect(tracker.total()).toBe(0);
		tracker.add(1.5);
		tracker.add(2.5);
		expect(tracker.total()).toBe(4);
	});
});

// ─── writeTranscriptEntry / flushTranscript ─────────────────

describe("writeTranscriptEntry + flushTranscript", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = join("/tmp", `gp-transcript-test-${Date.now()}`);
		mkdirSync(tmpDir, { recursive: true });
		resetTranscriptState();
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
		resetTranscriptState();
	});

	it("writes included message types as valid JSONL", () => {
		const file = join(tmpDir, "transcript.jsonl");

		const assistantMsg = stubMessage({
			type: "assistant",
			message: { content: [{ type: "text", text: "hello" }] },
		});

		const resultMsg = stubMessage({
			type: "result",
			subtype: "success",
			result: "done",
			total_cost_usd: 0.01,
			uuid: "test-uuid-2",
		});

		writeTranscriptEntry(file, assistantMsg);
		writeTranscriptEntry(file, resultMsg);
		flushTranscript(file);

		const content = readFileSync(file, "utf-8").trim();
		const lines = content.split("\n");
		expect(lines).toHaveLength(2);

		// Each line should be valid JSON
		for (const line of lines) {
			expect(() => JSON.parse(line)).not.toThrow();
		}
	});

	it("filters out stream_event messages", () => {
		const file = join(tmpDir, "transcript-filter.jsonl");

		const streamMsg = stubMessage({
			type: "stream_event",
			event: {},
		});

		writeTranscriptEntry(file, streamMsg);
		flushTranscript(file);

		// File should not exist or be empty since nothing was written
		if (existsSync(file)) {
			const content = readFileSync(file, "utf-8");
			expect(content.trim()).toBe("");
		}
	});

	it("flushTranscript writes all buffered entries", () => {
		const file = join(tmpDir, "transcript-flush.jsonl");

		for (let i = 0; i < 5; i++) {
			writeTranscriptEntry(file, stubMessage({
				type: "system",
				subtype: "task_notification",
				uuid: `uuid-${i}`,
			}));
		}

		flushTranscript(file);

		const content = readFileSync(file, "utf-8").trim();
		const lines = content.split("\n");
		expect(lines).toHaveLength(5);
	});
});

// ─── resetTranscriptState ──────────────────────────────────

describe("resetTranscriptState", () => {
	it("clears buffered entries so they are not flushed", () => {
		const tmpDir = join("/tmp", `gp-reset-test-${Date.now()}`);
		mkdirSync(tmpDir, { recursive: true });
		const file = join(tmpDir, "transcript.jsonl");

		try {
			writeTranscriptEntry(file, stubMessage({ type: "assistant", message: { content: [] } }));
			resetTranscriptState();
			flushTranscript(file);

			// File should not exist since buffer was cleared before flush
			expect(existsSync(file)).toBe(false);
		} finally {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});

// ─── isSuccess ──────────────────────────────────────────────

describe("isSuccess", () => {
	it("returns true for success result", () => {
		expect(isSuccess(stubResultSuccess())).toBe(true);
	});

	it("returns false for error result", () => {
		expect(isSuccess(stubResultError())).toBe(false);
	});
});

// ─── parseModel ─────────────────────────────────────────────

describe("parseModel", () => {
	it("returns default when --model not present", () => {
		// process.argv won't have --model in test context
		expect(parseModel("claude-haiku-4-5")).toBe("claude-haiku-4-5");
	});

	it("returns override when --model is in argv", () => {
		const original = process.argv;
		process.argv = [...original, "--model", "claude-opus-4-6"];
		try {
			expect(parseModel("claude-haiku-4-5")).toBe("claude-opus-4-6");
		} finally {
			process.argv = original;
		}
	});
});

// ─── tierDefault ────────────────────────────────────────────

describe("tierDefault", () => {
	it("returns haiku for structural", () => {
		expect(tierDefault("structural")).toBe("claude-haiku-4-5");
	});

	it("returns haiku for pipeline", () => {
		expect(tierDefault("pipeline")).toBe("claude-haiku-4-5");
	});

	it("returns sonnet for quality", () => {
		expect(tierDefault("quality")).toBe("claude-sonnet-4-5");
	});

	it("returns opus for e2e", () => {
		expect(tierDefault("e2e")).toBe("claude-opus-4-6");
	});
});

// ─── FixtureSetupError ──────────────────────────────────────

describe("FixtureSetupError", () => {
	it("is distinguishable via instanceof", () => {
		const err = new FixtureSetupError("test");
		expect(err).toBeInstanceOf(FixtureSetupError);
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("FixtureSetupError");
	});
});
