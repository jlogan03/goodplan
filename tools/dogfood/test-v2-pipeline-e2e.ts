/**
 * Full v2 Pipeline E2E — CLI-only test that drives the v2 event engine through
 * a complete workflow cycle:
 *
 *   init → epic:create → goal → explore → architecture → pressure-test →
 *   slices → activate → slice:create → plan → implement → refine → land
 *
 * This is a deterministic CLI-level test (no Agent SDK / no LLM calls).
 * It verifies the event engine pipeline works end-to-end by issuing gp
 * commands in sequence and checking the resulting event log.
 *
 * Usage: bun tools/dogfood/test-v2-pipeline-e2e.ts
 *
 * Prerequisites: `bun run build` must have been run first.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createLogger, gp, platformBinaryDir } from "./utils";

// ─── Constants ─────────────────────────────────────────────

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");
const GP_BIN = join(PLUGIN_DIR, "binaries", platformBinaryDir(), "gp");
const BASE_DIR = "/tmp/goodplan-v2-pipeline-e2e";
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/v2-pipeline-e2e-test.log");

// ─── Preflight ─────────────────────────────────────────────

console.log("\n[v2-pipeline-e2e] Building plugin...");
try {
	execFileSync("bun", ["run", "build"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	console.log("[v2-pipeline-e2e] Plugin built successfully");
} catch (err) {
	console.error("FATAL: Plugin build failed:", err instanceof Error ? err.message : String(err));
	process.exit(1);
}

if (!existsSync(GP_BIN)) {
	console.error("FATAL: Plugin binary not found at", GP_BIN);
	process.exit(1);
}

// ─── Setup ─────────────────────────────────────────────────

const logger = createLogger(LOG_FILE);
const opts = { cwd: BASE_DIR, gpBin: GP_BIN };

function assert(condition: boolean, message: string): void {
	if (!condition) {
		logger.log(`FAIL: ${message}`);
		console.error(`FAIL: ${message}`);
		process.exit(1);
	}
}

function assertOk(result: { exitCode: number; stdout: string }, label: string): void {
	if (result.exitCode !== 0) {
		logger.log(`FAIL: ${label} — exit ${result.exitCode}\n  stdout: ${result.stdout.slice(0, 500)}`);
		console.error(`FAIL: ${label}`);
		process.exit(1);
	}
	logger.log(`  OK: ${label}`);
}

/** Helper: gp command with content via stdin JSON */
function gpStdin(args: string[], content: string): { exitCode: number; stdout: string } {
	return gp(args, { ...opts, stdin: JSON.stringify({ content }) });
}

/** Helper: gp command with arbitrary stdin JSON */
function gpStdinJson(args: string[], payload: Record<string, unknown>): { exitCode: number; stdout: string } {
	return gp(args, { ...opts, stdin: JSON.stringify(payload) });
}

function readEvents(scope: string): string[] {
	let eventsPath: string;
	if (scope === "project") {
		eventsPath = join(BASE_DIR, ".goodplan/events.jsonl");
	} else if (scope.startsWith("epic:")) {
		eventsPath = join(BASE_DIR, ".goodplan/epics", scope.slice(5), "events.jsonl");
	} else {
		throw new Error(`Unknown scope: ${scope}`);
	}
	if (!existsSync(eventsPath)) return [];
	return readFileSync(eventsPath, "utf-8")
		.split("\n")
		.filter((l) => l.trim().length > 0);
}

function eventTypes(scope: string): string[] {
	return readEvents(scope).map((line) => {
		const parsed = JSON.parse(line) as { type: string };
		return parsed.type;
	});
}

// ─── Minimal fixture content ───────────────────────────────

const GOAL_MD = `---
description: Test epic for v2 pipeline verification
scope: CLI pipeline
non_goals: []
success_criteria:
  - All events emitted correctly
---

# Test Epic Goal

Verify the full v2 pipeline works end-to-end.
`;

const ARCHITECTURE_MD = `---
subsystems:
  - id: core
    maturity: walking
    owns: [src/core]
    dependsOn: []
communication_patterns: []
proposed_invariants: []
---

# Architecture Target

Single subsystem: core.
`;

const PRESSURE_TEST_MD = `---
failure_modes: []
scaling_cliffs: []
optionality_ledger: []
error_classes: []
locked_in_assumptions: []
findings: []
---

# Pressure Test

No critical findings for this test epic.
`;

const SLICES_MD = `---
slices:
  - id: alpha
    description: First test slice
    dependencies: []
    affected_subsystems: [core]
---

# Slice Set

Single slice: alpha.
`;

const PLAN_MD = `---
title: Alpha Slice Plan
---

# Plan: Alpha Slice

Single chunk: add a test file.

\`\`\`yaml extract
chunks:
  - id: chunk-1
    description: Add test file
    expectation: Test file exists
    redTest: N/A
    verificationType: manual
chunkDependencies: []
affectedSubsystems:
  - core
rollbackPath: Delete the test file
\`\`\`
`;

const EXPLORE_SUMMARY_MD = `# Exploration Summary

Explored the codebase. No blockers found.
`;

// ─── Clean start ───────────────────────────────────────────

if (existsSync(BASE_DIR)) {
	execFileSync("rm", ["-rf", BASE_DIR]);
}
mkdirSync(BASE_DIR, { recursive: true });

// Create a git repo (required for event envelope git context + ContentRef)
execFileSync("git", ["init"], { cwd: BASE_DIR, stdio: "pipe" });
execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "--allow-empty", "-m", "initial"], {
	cwd: BASE_DIR,
	stdio: "pipe",
});

logger.log("=== Full v2 Pipeline E2E ===\n");

// ─── Phase 0: Init ────────────────────────────────────────

logger.log("\n--- Phase 0: Init ---");
assertOk(gp(["init", "--name", "e2e-test", "--json"], opts), "gp init");

{
	const types = eventTypes("project");
	assert(types.includes("project-initialized"), "project-initialized event emitted");
	logger.log(`  Project events: ${types.join(", ")}`);
}

// ─── Phase 1: Create Epic ──────────────────────────────────

logger.log("\n--- Phase 1: Create Epic ---");
assertOk(gp(["epic:create", "--name", "test-epic", "--json"], opts), "gp epic:create");

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("epic-created"), "epic-created event emitted");
}

// ─── Phase 2: Goal + Explore ───────────────────────────────

logger.log("\n--- Phase 2: Goal + Explore ---");

assertOk(gpStdin(["epic:goal-draft", "--epic", "test-epic", "--json"], GOAL_MD), "gp epic:goal-draft");
assertOk(gpStdin(["epic:goal-commit", "--epic", "test-epic", "--json"], GOAL_MD), "gp epic:goal-commit");
assertOk(gp(["epic:explore-start", "--epic", "test-epic", "--json"], opts), "gp epic:explore-start");
assertOk(gpStdin(["epic:explore-conclude", "--epic", "test-epic", "--json"], EXPLORE_SUMMARY_MD), "gp epic:explore-conclude");

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("epic-goal-drafted"), "epic-goal-drafted event");
	assert(types.includes("epic-goal-committed"), "epic-goal-committed event");
	assert(types.includes("exploration-cycle-started"), "exploration-cycle-started event");
	assert(types.includes("exploration-concluded"), "exploration-concluded event");
	logger.log(`  Epic events so far: ${types.join(", ")}`);
}

// ─── Phase 3: Architecture ─────────────────────────────────

logger.log("\n--- Phase 3: Architecture ---");

assertOk(gpStdin(["epic:architecture-draft", "--epic", "test-epic", "--json"], ARCHITECTURE_MD), "gp epic:architecture-draft");
assertOk(gpStdin(["epic:architecture-commit", "--epic", "test-epic", "--json"], ARCHITECTURE_MD), "gp epic:architecture-commit");
assertOk(gp(["epic:architecture-shape-start", "--epic", "test-epic", "--json"], opts), "gp epic:architecture-shape-start");
assertOk(gp(["epic:architecture-shape-approve", "--epic", "test-epic", "--json"], opts), "gp epic:architecture-shape-approve");

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("architecture-target-drafted"), "architecture-target-drafted event");
	assert(types.includes("architecture-target-committed"), "architecture-target-committed event");
	assert(types.includes("architecture-shape-checkpoint-reached"), "architecture-shape-checkpoint-reached event");
	assert(types.includes("architecture-shape-approved"), "architecture-shape-approved event");
}

// ─── Phase 4: Pressure Test + Slices ───────────────────────

logger.log("\n--- Phase 4: Pressure Test + Slices ---");

assertOk(gpStdin(["epic:pressure-test-draft", "--epic", "test-epic", "--json"], PRESSURE_TEST_MD), "gp epic:pressure-test-draft");
assertOk(gpStdin(["epic:pressure-test-commit", "--epic", "test-epic", "--json"], PRESSURE_TEST_MD), "gp epic:pressure-test-commit");
assertOk(gpStdin(["epic:slices-draft", "--epic", "test-epic", "--json"], SLICES_MD), "gp epic:slices-draft");
assertOk(gpStdin(["epic:slices-commit", "--epic", "test-epic", "--json"], SLICES_MD), "gp epic:slices-commit");
assertOk(gp(["epic:slice-set-shape-start", "--epic", "test-epic", "--json"], opts), "gp epic:slice-set-shape-start");
assertOk(gp(["epic:slice-set-shape-approve", "--epic", "test-epic", "--json"], opts), "gp epic:slice-set-shape-approve");

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("pressure-test-drafted"), "pressure-test-drafted event");
	assert(types.includes("pressure-test-committed"), "pressure-test-committed event");
	assert(types.includes("slice-set-drafted"), "slice-set-drafted event");
	assert(types.includes("slice-set-committed"), "slice-set-committed event");
	assert(types.includes("slice-set-shape-checkpoint-reached"), "slice-set-shape-checkpoint event");
	assert(types.includes("slice-set-shape-approved"), "slice-set-shape-approved event");
}

// ─── Phase 5: Activate Epic ────────────────────────────────

logger.log("\n--- Phase 5: Activate Epic ---");
assertOk(gp(["epic:activate", "--epic", "test-epic", "--json"], opts), "gp epic:activate");

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("epic-activated"), "epic-activated event");
}

// ─── Phase 6: Create + Plan Slice ──────────────────────────

logger.log("\n--- Phase 6: Create + Plan Slice ---");
assertOk(gp(["slice:create", "--epic", "test-epic", "--name", "alpha", "--json"], opts), "gp slice:create");

assertOk(gpStdin(["slice:plan-draft", "--epic", "test-epic", "--slice", "alpha", "--json"], PLAN_MD), "gp slice:plan-draft");
assertOk(gp(["slice:plan-shape-start", "--epic", "test-epic", "--slice", "alpha", "--json"], opts), "gp slice:plan-shape-start");
assertOk(gp(["slice:plan-shape-approve", "--epic", "test-epic", "--slice", "alpha", "--json"], opts), "gp slice:plan-shape-approve");
assertOk(gpStdin(["slice:plan-commit", "--epic", "test-epic", "--slice", "alpha", "--json"], PLAN_MD), "gp slice:plan-commit");

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("slice-created"), "slice-created event");
	assert(types.includes("slice-plan-drafted"), "slice-plan-drafted event");
	assert(types.includes("plan-shape-checkpoint-reached"), "plan-shape-checkpoint-reached event");
	assert(types.includes("plan-shape-approved"), "plan-shape-approved event");
	assert(types.includes("slice-plan-committed"), "slice-plan-committed event");
}

// ─── Phase 7: Implement Slice ──────────────────────────────

logger.log("\n--- Phase 7: Implement Slice ---");
assertOk(gp(["slice:implement-start", "--epic", "test-epic", "--slice", "alpha", "--json"], opts), "gp slice:implement-start");
assertOk(
	gpStdinJson(
		["slice:chunk-start", "--epic", "test-epic", "--slice", "alpha", "--chunk", "chunk-1", "--json"],
		{ description: "Add test file" },
	),
	"gp slice:chunk-start",
);

assertOk(
	gpStdinJson(
		["slice:chunk-verify", "--epic", "test-epic", "--slice", "alpha", "--chunk", "chunk-1", "--json"],
		{ evidence: "Test file created at src/test.ts" },
	),
	"gp slice:chunk-verify",
);

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("slice-implementation-started"), "slice-implementation-started event");
	assert(types.includes("slice-implementation-chunk-started"), "chunk-started event");
	assert(types.includes("chunk-verified"), "chunk-verified event");
}

// ─── Phase 8: Code Refinement ──────────────────────────────

logger.log("\n--- Phase 8: Code Refinement ---");
assertOk(gp(["slice:code-refine-start", "--epic", "test-epic", "--slice", "alpha", "--json"], opts), "gp slice:code-refine-start");
assertOk(gp(["slice:code-refine-commit", "--epic", "test-epic", "--slice", "alpha", "--json"], opts), "gp slice:code-refine-commit");

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("slice-code-refinement-started"), "slice-code-refinement-started event");
	assert(types.includes("code-refinement-converged"), "code-refinement-converged event");
}

// ─── Phase 9: Land Slice ───────────────────────────────────

logger.log("\n--- Phase 9: Land Slice ---");
assertOk(gp(["slice:land", "--epic", "test-epic", "--slice", "alpha", "--json"], opts), "gp slice:land");

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("slice-landed"), "slice-landed event");
}

// ─── Phase 10: Complete Epic ───────────────────────────────

logger.log("\n--- Phase 10: Complete Epic ---");
assertOk(gp(["epic:complete", "--epic", "test-epic", "--json"], opts), "gp epic:complete");

{
	const types = eventTypes("epic:test-epic");
	assert(types.includes("epic-completed"), "epic-completed event");
}

// ─── Verification: gp verify ───────────────────────────────

logger.log("\n--- Verification: gp verify ---");
const verifyResult = gp(["verify", "--json"], opts);
assertOk(verifyResult, "gp verify");

{
	const parsed = JSON.parse(verifyResult.stdout) as {
		status: string;
		eventsChecked: number;
		scopesChecked: number;
		issues: unknown[];
	};
	assert(parsed.status === "pass", `gp verify status should be "pass", got "${parsed.status}"`);
	assert(parsed.eventsChecked > 0, `eventsChecked should be > 0, got ${parsed.eventsChecked}`);
	assert(parsed.scopesChecked >= 2, `scopesChecked should be >= 2 (project + epic), got ${parsed.scopesChecked}`);
	assert(parsed.issues.length === 0, `verify issues should be empty, got ${parsed.issues.length}`);
	logger.log(`  Verify: ${parsed.eventsChecked} events across ${parsed.scopesChecked} scopes — PASS`);
}

// ─── Verification: gp status ───────────────────────────────

logger.log("\n--- Verification: gp status ---");
const statusResult = gp(["status", "--json"], opts);
assertOk(statusResult, "gp status");

{
	const parsed = JSON.parse(statusResult.stdout) as Record<string, unknown>;
	assert("project" in parsed, "status has 'project' key");
	logger.log(`  Status keys: ${Object.keys(parsed).join(", ")}`);
}

// ─── Verification: prevId chain ────────────────────────────

logger.log("\n--- Verification: prevId chains ---");
{
	const events = readEvents("epic:test-epic");
	let expectedPrevId: string | null = null;
	for (let i = 0; i < events.length; i++) {
		const event = JSON.parse(events[i]!) as { id: string; prevId: string | null };
		if (i === 0) {
			assert(event.prevId === null, `First event prevId should be null, got "${event.prevId}"`);
		} else {
			assert(
				event.prevId === expectedPrevId,
				`Event ${i} prevId mismatch: expected "${expectedPrevId}", got "${event.prevId}"`,
			);
		}
		expectedPrevId = event.id;
	}
	logger.log(`  prevId chain verified for ${events.length} events`);
}

// ─── Summary ───────────────────────────────────────────────

logger.log("\n--- Event Summary ---");
const epicEvents = eventTypes("epic:test-epic");
const projectEvents = eventTypes("project");
logger.log(`  Project events (${projectEvents.length}): ${projectEvents.join(", ")}`);
logger.log(`  Epic events (${epicEvents.length}): ${epicEvents.join(", ")}`);

const EXPECTED_EPIC_EVENTS = [
	"epic-created",
	"epic-goal-drafted",
	"epic-goal-committed",
	"exploration-cycle-started",
	"exploration-concluded",
	"architecture-target-drafted",
	"architecture-target-committed",
	"architecture-shape-checkpoint-reached",
	"architecture-shape-approved",
	"pressure-test-drafted",
	"pressure-test-committed",
	"slice-set-drafted",
	"slice-set-committed",
	"slice-set-shape-checkpoint-reached",
	"slice-set-shape-approved",
	"epic-activated",
	"slice-created",
	"slice-plan-drafted",
	"plan-shape-checkpoint-reached",
	"plan-shape-approved",
	"slice-plan-committed",
	"slice-implementation-started",
	"slice-implementation-chunk-started",
	"chunk-verified",
	"slice-code-refinement-started",
	"code-refinement-converged",
	"slice-landed",
	"epic-completed",
];

const missingEvents = EXPECTED_EPIC_EVENTS.filter((e) => !epicEvents.includes(e));
assert(missingEvents.length === 0, `Missing epic events: ${missingEvents.join(", ")}`);

logger.log(`\n  All ${EXPECTED_EPIC_EVENTS.length} expected epic events present`);
logger.log(`\n=== PASS: Full v2 Pipeline E2E ===\n`);
console.log("\nPASS: Full v2 Pipeline E2E");
console.log(`  ${epicEvents.length} epic events, ${projectEvents.length} project events`);
console.log(`  gp verify: PASS`);
