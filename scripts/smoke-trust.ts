/**
 * Smoke test for the trust layer.
 * Exercises extractors, convergence evaluator, and circuit breaker
 * against fixture data. Exits 0 if all checks pass.
 *
 * Run via: bun scripts/smoke-trust.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReviewerPayload } from "../src/schemas/trust/reviewer-payload.js";
import { checkCircuitBreaker } from "../src/trust/convergence/circuit-breaker.js";
import { evaluateConvergence } from "../src/trust/convergence/evaluator.js";
import type { ScoredEvent } from "../src/trust/convergence/evaluator.js";
import { DEFAULT_PLAN_CONFIG } from "../src/trust/convergence/types.js";
import { createCoreExtractorRegistry } from "../src/trust/extractors/core-extractors.js";
import { synthesizeFeedback } from "../src/trust/feedback-synthesizer.js";

const FIXTURE_DIR = join(import.meta.dir, "..", "tests", "trust", "fixtures");

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
	try {
		fn();
		passed += 1;
		console.log(`  PASS: ${name}`);
	} catch (err) {
		failed += 1;
		console.error(`  FAIL: ${name}`);
		console.error(`    ${err instanceof Error ? err.message : String(err)}`);
	}
}

function assert(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(message);
	}
}

// --- Section 1: Extractors ---
console.log("\n=== Extractors ===");

const registry = createCoreExtractorRegistry();

check("registry has 10 extractors", () => {
	assert(
		registry.getAll().length === 10,
		`Expected 10 extractors, got ${registry.getAll().length}`,
	);
});

/** Map extractor ID to fixture filename (most use the same name). */
const extractorFixtures: [string, string][] = [
	["architecture", "architecture"],
	["architecture-target", "architecture"], // reuses architecture fixture (same shape)
	["plan", "plan"],
	["epic-goal", "epic-goal"],
	["slice-goal", "slice-goal"],
	["briefing", "briefing"],
	["finding", "finding"],
	["pressure-test", "pressure-test"],
	["side-quest-goal", "side-quest-goal"],
	["subsystem", "subsystem"],
];

for (const [extractorId, fixtureName] of extractorFixtures) {
	check(`extract ${extractorId} fixture`, () => {
		const md = readFileSync(join(FIXTURE_DIR, `${fixtureName}.md`), "utf-8");
		const result = registry.extract(extractorId, md);
		assert(
			result.success,
			`Extraction failed: ${!result.success ? result.error.message : "unknown"}`,
		);
	});
}

check("malformed architecture returns error", () => {
	const md = readFileSync(join(FIXTURE_DIR, "architecture-malformed.md"), "utf-8");
	const result = registry.extract("architecture", md);
	assert(!result.success, "Expected extraction to fail for malformed fixture");
});

// --- Section 2: Convergence Evaluator ---
console.log("\n=== Convergence Evaluator ===");

const passingPayload: ReviewerPayload = {
	reviewerId: "r1",
	dimensions: [
		{ name: "completeness", score: 0.9, threshold: 0.7, passed: true },
		{ name: "clarity", score: 0.85, threshold: 0.7, passed: true },
	],
	findings: [],
	rationale: "Good.",
};

const failingPayload: ReviewerPayload = {
	reviewerId: "r2",
	dimensions: [{ name: "completeness", score: 0.4, threshold: 0.7, passed: false }],
	findings: [{ severity: "CRITICAL", dimension: "completeness", description: "Missing sections." }],
	rationale: "Needs work.",
};

const passingEvents: ScoredEvent[] = [{ round: 1, payload: passingPayload }];
const failingEvents: ScoredEvent[] = [{ round: 1, payload: failingPayload }];

const rubric = {
	dimensions: [
		{ name: "completeness", threshold: 0.7 },
		{ name: "clarity", threshold: 0.7 },
	],
};

const weights = new Map([
	["r1", "medium" as const],
	["r2", "medium" as const],
]);

check("passing payload converges", () => {
	const result = evaluateConvergence(passingEvents, rubric, weights, DEFAULT_PLAN_CONFIG);
	assert(result.state === "CONVERGED", `Expected CONVERGED, got ${result.state}`);
});

check("failing payload continues", () => {
	const result = evaluateConvergence(failingEvents, rubric, weights, DEFAULT_PLAN_CONFIG);
	assert(result.state === "CONTINUE", `Expected CONTINUE, got ${result.state}`);
});

// --- Section 3: Circuit Breaker ---
console.log("\n=== Circuit Breaker ===");

check("no trigger on clean events", () => {
	const result = checkCircuitBreaker(passingEvents, DEFAULT_PLAN_CONFIG);
	assert(!result.triggered, "Expected no trigger");
});

check("round-budget-exceeded triggers", () => {
	const events: ScoredEvent[] = [];
	for (let round = 1; round <= DEFAULT_PLAN_CONFIG.maxRounds; round++) {
		events.push({ round, payload: failingPayload });
	}
	const result = checkCircuitBreaker(events, DEFAULT_PLAN_CONFIG);
	assert(result.triggered, "Expected trigger");
	if (result.triggered) {
		assert(
			result.reason.type === "round-budget-exceeded",
			`Expected round-budget-exceeded, got ${result.reason.type}`,
		);
	}
});

// --- Section 4: Feedback Synthesizer ---
console.log("\n=== Feedback Synthesizer ===");

check("synthesizeFeedback deduplicates identical findings", () => {
	const result = synthesizeFeedback([
		{
			reviewerId: "r1",
			dimensions: [],
			findings: [
				{ severity: "CRITICAL", dimension: "completeness", description: "Missing sections." },
			],
			rationale: "Bad.",
		},
		{
			reviewerId: "r2",
			dimensions: [],
			findings: [
				{ severity: "CRITICAL", dimension: "completeness", description: "Missing sections." },
			],
			rationale: "Also bad.",
		},
	]);
	assert(result.findings.length === 1, `Expected 1 finding, got ${result.findings.length}`);
	const finding = result.findings[0];
	assert(finding !== undefined && finding.mergedCount === 2, "Expected mergedCount of 2");
});

// --- Summary ---
console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
	process.exit(1);
}
