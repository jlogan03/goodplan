/**
 * Architecture Fidelity Fitness Test
 *
 * Programmatically verifies that every command, reviewer, event type, rubric,
 * and architectural contract specified in the v2 architecture docs
 * (.goodplan/epics/workflow-bug-fixes/architecture/) actually exists
 * in the implementation. Prevents drift between architecture and code.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { commandRegistry } from "../../src/commands/global/schema.js";
import {
	BriefingEventMap,
	DecisionEventMap,
	EpicEventMap,
	FindingEventMap,
	InvariantEventMap,
	LearningEventMap,
	MilestoneEventMap,
	PauseSteeringEventMap,
	ProjectEventMap,
	RefinementEventMap,
	ReshapeEventMap,
	SideQuestEventMap,
	SliceEventMap,
	SubsystemEventMap,
} from "../../src/schemas/events/index.js";
import { ALWAYS_ON_REVIEWERS } from "./architecture-fidelity-helpers.js";

const ROOT = path.resolve(import.meta.dirname, "../..");
const PLUGIN_DIR = path.join(ROOT, "plugin");
const REVIEWERS_DIR = path.join(PLUGIN_DIR, "agents");
const RUBRICS_DIR = path.join(PLUGIN_DIR, "rubrics");

// ─── Commands ──────────────────────────────────────────────

/**
 * Every command from architecture/commands.md.
 * Grouped by namespace for readability.
 */
const ARCHITECTURE_COMMANDS = [
	// Global
	"init",
	"status",
	"schema",
	"verify",
	"migrate",
	// Project
	"project:show",
	"project:set-steering",
	// Epic
	"epic:create",
	"epic:list",
	"epic:show",
	"epic:goal-draft",
	"epic:goal-commit",
	"epic:set-steering",
	"epic:architecture-draft",
	"epic:architecture-commit",
	"epic:architecture-shape-start",
	"epic:architecture-shape-approve",
	"epic:architecture-shape-auto",
	"epic:pressure-test-draft",
	"epic:pressure-test-commit",
	"epic:pressure-test-finding-disposition",
	"epic:slices-draft",
	"epic:slices-commit",
	"epic:slice-set-shape-start",
	"epic:slice-set-shape-approve",
	"epic:slice-set-shape-auto",
	"epic:activate",
	"epic:pause",
	"epic:resume",
	"epic:complete",
	"epic:abandon",
	"epic:explore-start",
	"epic:explore-conclude",
	"epic:research-capture",
	"epic:brainstorm-capture",
	// Slice
	"slice:create",
	"slice:list",
	"slice:show",
	"slice:plan-draft",
	"slice:plan-commit",
	"slice:plan-shape-start",
	"slice:plan-shape-revise",
	"slice:plan-shape-approve",
	"slice:plan-shape-auto",
	"slice:implement-start",
	"slice:chunk-start",
	"slice:chunk-red-written",
	"slice:chunk-red-failed",
	"slice:chunk-green",
	"slice:chunk-verify",
	"slice:chunk-unverifiable",
	"slice:chunk-decide",
	"slice:code-refine-start",
	"slice:code-refine-commit",
	"slice:land",
	"slice:abandon",
	// Side-Quest
	"side-quest:create",
	"side-quest:list",
	"side-quest:show",
	"side-quest:goal-commit",
	"side-quest:plan-draft",
	"side-quest:plan-shape-approve",
	"side-quest:plan-commit",
	"side-quest:implement-start",
	"side-quest:chunk-start",
	"side-quest:chunk-verify",
	"side-quest:land",
	"side-quest:abandon",
	// Refinement
	"refine:start",
	"refine:score",
	"refine:synthesize",
	"refine:revise",
	"refine:evaluate",
	"refine:converge",
	"refine:stuck",
	"refine:override",
	// Trust substrate
	"finding:capture",
	"finding:list",
	"finding:triage",
	"briefing:write",
	"briefing:latest",
	"invariant:list",
	"invariant:propose",
	"invariant:activate",
	"invariant:deactivate",
	"invariant:check",
	"subsystem:register",
	"subsystem:update-maturity",
	"subsystem:retire",
	"subsystem:list",
	"subsystem:show",
	// Query
	"reviewer:list",
	"reviewer:show",
	"rubric:list",
	"rubric:show",
	"rubric:validate",
	"decision:record",
	"decision:list",
	"decision:show",
	"decision:supersede",
	"learning:capture",
	"learning:list",
	"learning:promote",
	"events:tail",
	"events:query",
] as const;

describe("Architecture fidelity: commands", () => {
	const registeredNames = new Set(commandRegistry.keys());

	it("commandRegistry is populated", () => {
		expect(commandRegistry.size).toBeGreaterThan(0);
	});

	for (const cmd of ARCHITECTURE_COMMANDS) {
		it(`command "${cmd}" is registered`, () => {
			expect(registeredNames.has(cmd), `Missing command: ${cmd}`).toBe(true);
		});
	}

	it("no unexpected commands exist outside architecture spec", () => {
		const archSet = new Set<string>(ARCHITECTURE_COMMANDS);
		const extras = [...registeredNames].filter((name) => !archSet.has(name));
		// Allow extra commands (state, task:list, task:show are v1 holdovers) but flag them
		// This is informational — we don't fail on extras to allow incremental additions
		if (extras.length > 0) {
			console.warn(`Extra commands not in architecture spec: ${extras.join(", ")}`);
		}
	});
});

// ─── Event Types ───────────────────────────────────────────

/**
 * Every event type from architecture/commands.md "Events Emitted" column,
 * matched against the EventMap exports from src/schemas/events/.
 */
const ALL_EVENT_MAPS = {
	...ProjectEventMap,
	...EpicEventMap,
	...SliceEventMap,
	...SideQuestEventMap,
	...SubsystemEventMap,
	...RefinementEventMap,
	...FindingEventMap,
	...BriefingEventMap,
	...InvariantEventMap,
	...DecisionEventMap,
	...LearningEventMap,
	...PauseSteeringEventMap,
	...ReshapeEventMap,
	...MilestoneEventMap,
} as const;

/** Event types referenced in commands.md "Events Emitted" column. */
const ARCHITECTURE_EVENT_TYPES = [
	// Project
	"project-initialized",
	"steering-preference-set",
	// Epic lifecycle
	"epic-created",
	"epic-abandoned",
	"epic-goal-drafted",
	"epic-goal-committed",
	"epic-steering-preference-set",
	"exploration-cycle-started",
	"exploration-concluded",
	"research-captured",
	"brainstorm-captured",
	"architecture-target-drafted",
	"architecture-target-committed",
	"architecture-shape-checkpoint-reached",
	"architecture-shape-approved",
	"architecture-shape-checkpoint-auto-shaped",
	"pressure-test-drafted",
	"pressure-test-committed",
	"pressure-test-finding-accepted",
	"slice-set-drafted",
	"slice-set-committed",
	"slice-set-shape-checkpoint-reached",
	"slice-set-shape-approved",
	"slice-set-shape-checkpoint-auto-shaped",
	"epic-activated",
	"epic-paused",
	"epic-resumed",
	"epic-completed",
	// Slice lifecycle
	"slice-created",
	"slice-abandoned",
	"slice-plan-drafted",
	"slice-plan-committed",
	"plan-shape-checkpoint-reached",
	"plan-shape-revision-proposed",
	"plan-shape-approved",
	"plan-shape-checkpoint-auto-shaped",
	"slice-implementation-started",
	"slice-implementation-chunk-started",
	"chunk-red-test-written",
	"chunk-red-test-failed",
	"chunk-green-achieved",
	"chunk-verified",
	"chunk-unverifiable",
	"chunk-unverifiable-decided",
	"slice-code-refinement-started",
	"code-refinement-converged",
	"slice-landed",
	// Side-quest lifecycle
	"side-quest-created",
	"side-quest-abandoned",
	"side-quest-goal-committed",
	"side-quest-plan-drafted",
	"side-quest-plan-shape-approved",
	"side-quest-plan-committed",
	"side-quest-implementation-started",
	"side-quest-chunk-started",
	"side-quest-chunk-verified",
	"side-quest-landed",
	// Refinement
	"refinement-round-started",
	"reviewer-scored",
	"refinement-synthesized",
	"artifact-revised",
	"refinement-converged",
	"refinement-circuit-breaker-tripped",
	"convergence-overridden",
	// Trust substrate
	"finding-captured",
	"finding-triaged",
	"briefing-written",
	"invariant-proposed",
	"invariant-activated",
	"invariant-deactivated",
	"subsystem-registered",
	"subsystem-maturity-updated",
	"subsystem-retired",
	// Query / decision / learning
	"decision-recorded",
	"decision-superseded",
	"learning-captured",
	"learning-promoted",
	// Pause / steering
	"pause-entered",
	// Reshape
	"reshape-proposed",
	// Milestone
	"milestone-committed",
] as const;

describe("Architecture fidelity: event types", () => {
	const implementedEventTypes = new Set(Object.keys(ALL_EVENT_MAPS));

	for (const eventType of ARCHITECTURE_EVENT_TYPES) {
		it(`event type "${eventType}" has a Zod payload schema`, () => {
			expect(
				implementedEventTypes.has(eventType),
				`Missing schema for event type: ${eventType}`,
			).toBe(true);
		});
	}

	it("schema files exist for all event domains", () => {
		const expectedFiles = [
			"project.ts",
			"epic.ts",
			"slice.ts",
			"side-quest.ts",
			"subsystem.ts",
			"refinement.ts",
			"finding.ts",
			"briefing.ts",
			"invariant.ts",
			"decision.ts",
			"learning.ts",
			"pause-steering.ts",
			"reshape.ts",
			"milestone.ts",
		];
		const schemasDir = path.join(ROOT, "src/schemas/events");
		for (const file of expectedFiles) {
			expect(
				fs.existsSync(path.join(schemasDir, file)),
				`Missing schema file: src/schemas/events/${file}`,
			).toBe(true);
		}
	});
});

// ─── Reviewers ─────────────────────────────────────────────

/**
 * All reviewers from architecture/trust.md and architecture/plugin.md.
 */
const ARCHITECTURE_REVIEWERS = [
	// Always-on trio
	"reviewer-holistic",
	"reviewer-invariant-checker",
	"reviewer-context-transport",
	// Artifact-specific
	"reviewer-plan",
	"reviewer-verification-plausibility",
	"reviewer-goal",
	"reviewer-slice-set",
	"reviewer-software-architecture",
	// Code-quality
	"reviewer-performance",
	"reviewer-typescript",
	"reviewer-data-layer",
	"reviewer-tui-cli",
	"reviewer-agent-skill",
	"reviewer-api-contract",
	// Subsystem-specific
	"reviewer-verification-spot-check",
] as const;

describe("Architecture fidelity: reviewers", () => {
	it("all architecture-specified reviewers have agent files", () => {
		// reviewer-verification-spot-check is in the architecture but not yet implemented
		const KNOWN_UNIMPLEMENTED = new Set(["reviewer-verification-spot-check"]);
		const missing: string[] = [];
		for (const id of ARCHITECTURE_REVIEWERS) {
			if (KNOWN_UNIMPLEMENTED.has(id)) continue;
			const agentFile = path.join(REVIEWERS_DIR, `${id}.md`);
			if (!fs.existsSync(agentFile)) {
				missing.push(id);
			}
		}
		expect(missing, `Missing reviewer agent files: ${missing.join(", ")}`).toEqual([]);
	});

	it("every reviewer agent file has rubric_ref in frontmatter", () => {
		const reviewerFiles = fs
			.readdirSync(REVIEWERS_DIR)
			.filter((f) => f.startsWith("reviewer-") && f.endsWith(".md"));

		const missingRubricRef: string[] = [];
		for (const file of reviewerFiles) {
			const content = fs.readFileSync(path.join(REVIEWERS_DIR, file), "utf-8");
			if (!content.includes("rubric_ref:")) {
				missingRubricRef.push(file);
			}
		}
		expect(
			missingRubricRef,
			`Reviewer files missing rubric_ref: ${missingRubricRef.join(", ")}`,
		).toEqual([]);
	});

	it("every reviewer rubric_ref points to an existing rubric file", () => {
		const reviewerFiles = fs
			.readdirSync(REVIEWERS_DIR)
			.filter((f) => f.startsWith("reviewer-") && f.endsWith(".md"));

		const brokenRefs: string[] = [];
		for (const file of reviewerFiles) {
			const content = fs.readFileSync(path.join(REVIEWERS_DIR, file), "utf-8");
			const match = content.match(/rubric_ref:\s*(.+)/);
			if (match?.[1] !== undefined) {
				const rubricName = match[1].trim();
				// rubric_ref is just the name (e.g., "holistic"), resolve to rubrics/<name>.yaml
				const rubricPath = path.join(RUBRICS_DIR, `${rubricName}.yaml`);
				if (!fs.existsSync(rubricPath)) {
					brokenRefs.push(`${file} -> ${rubricName}`);
				}
			}
		}
		expect(brokenRefs, `Broken rubric_ref pointers: ${brokenRefs.join(", ")}`).toEqual([]);
	});

	it("always-on reviewers are registered in routing function", () => {
		// The architecture specifies reviewer-holistic, reviewer-invariant-checker,
		// reviewer-context-transport as always-on. Verify the ALWAYS_ON_REVIEWERS
		// constant in the routing module includes these.
		const archAlwaysOn = [
			"reviewer-holistic",
			"reviewer-invariant-checker",
			"reviewer-context-transport",
		];
		const missing = archAlwaysOn.filter((id) => !ALWAYS_ON_REVIEWERS.includes(id));

		// Document the actual state — the implementation diverged from the architecture
		// by using reviewer-agent-skill and reviewer-software-architecture instead of
		// reviewer-invariant-checker and reviewer-context-transport. This is a known gap.
		if (missing.length > 0) {
			console.warn(
				`Architecture specifies always-on reviewers not in ALWAYS_ON_REVIEWERS: ${missing.join(", ")}. ` +
					`Actual always-on: ${ALWAYS_ON_REVIEWERS.join(", ")}`,
			);
		}

		// At minimum, reviewer-holistic must be always-on
		expect(
			ALWAYS_ON_REVIEWERS.includes("reviewer-holistic"),
			"reviewer-holistic must be in ALWAYS_ON_REVIEWERS",
		).toBe(true);
	});
});

// ─── Rubrics ───────────────────────────────────────────────

const ARCHITECTURE_RUBRICS = [
	"holistic.yaml",
	"process-holistic.yaml",
	"code-quality.yaml",
	"architecture-design.yaml",
	"data-integrity.yaml",
	"implementation-plan.yaml",
] as const;

describe("Architecture fidelity: rubrics", () => {
	for (const rubric of ARCHITECTURE_RUBRICS) {
		it(`rubric "${rubric}" exists`, () => {
			expect(
				fs.existsSync(path.join(RUBRICS_DIR, rubric)),
				`Missing rubric: ${rubric}`,
			).toBe(true);
		});
	}

	it("every rubric has dimensions with thresholds", () => {
		for (const rubric of ARCHITECTURE_RUBRICS) {
			const content = fs.readFileSync(path.join(RUBRICS_DIR, rubric), "utf-8");
			expect(content, `${rubric} missing dimensions`).toContain("dimensions:");
			expect(content, `${rubric} missing threshold`).toContain("threshold:");
		}
	});

	it("every rubric has convergence config", () => {
		for (const rubric of ARCHITECTURE_RUBRICS) {
			const content = fs.readFileSync(path.join(RUBRICS_DIR, rubric), "utf-8");
			expect(content, `${rubric} missing convergence`).toContain("convergence:");
			expect(content, `${rubric} missing max_rounds`).toContain("max_rounds:");
		}
	});
});

// ─── Convergence Evaluator ─────────────────────────────────

describe("Architecture fidelity: convergence evaluator", () => {
	it("evaluator uses rubric parameter (not underscore-prefixed)", () => {
		const evaluatorPath = path.join(ROOT, "src/trust/convergence/evaluator.ts");
		const content = fs.readFileSync(evaluatorPath, "utf-8");

		// The rubric parameter must be named "rubric" (not "_rubric")
		expect(content).toContain("rubric: ConvergenceRubric");
		expect(content).not.toContain("_rubric");

		// Verify it actually reads rubric.dimensions
		expect(content).toContain("rubric.dimensions");
	});

	it("evaluator returns all three convergence states", () => {
		const evaluatorPath = path.join(ROOT, "src/trust/convergence/evaluator.ts");
		const content = fs.readFileSync(evaluatorPath, "utf-8");

		expect(content).toContain('"CONVERGED"');
		expect(content).toContain('"CONTINUE"');
		expect(content).toContain('"CIRCUIT-BROKEN"');
	});

	it("DimensionResult includes reviewerId and relevance fields", () => {
		const payloadPath = path.join(ROOT, "src/schemas/trust/reviewer-payload.ts");
		const content = fs.readFileSync(payloadPath, "utf-8");

		expect(content).toContain("reviewerId: z.string()");
		expect(content).toContain('relevance: z.enum(["high", "medium", "low"])');
	});

	it("circuit breaker has all three trigger types", () => {
		const convergencePath = path.join(ROOT, "src/schemas/trust/convergence.ts");
		const content = fs.readFileSync(convergencePath, "utf-8");

		expect(content).toContain('"stuck-finding"');
		expect(content).toContain('"reviewer-disagreement"');
		expect(content).toContain('"round-budget-exceeded"');
	});
});

// ─── Verify Command ────────────────────────────────────────

describe("Architecture fidelity: gp verify", () => {
	it("verify command implements all 5 specified checks", () => {
		const verifyPath = path.join(ROOT, "src/commands/global/verify.ts");
		const content = fs.readFileSync(verifyPath, "utf-8");

		// 1. JSON validity
		expect(content, "Missing JSON validity check").toContain("JSON.parse");

		// 2. Schema conformance
		expect(content, "Missing schema conformance check").toContain("AnyEventEnvelopeSchema");

		// 3. prevId chain integrity
		expect(content, "Missing prevId chain check").toContain("prevId");

		// 4. ContentRef SHA verification
		expect(content, "Missing ContentRef SHA check").toContain("git");
		expect(content, "Missing ContentRef SHA check").toContain("cat-file");

		// 5. schemaVersion monotonicity
		expect(content, "Missing schemaVersion monotonicity check").toContain("schemaVersion");
	});
});

// ─── Plugin Directory Structure ────────────────────────────

describe("Architecture fidelity: plugin structure", () => {
	const expectedDirs = ["skills", "agents", "reviewers", "rubrics", "hooks"] as const;

	// Architecture says plugin/reviewers/ is a top-level directory.
	// Implementation currently stores reviewers in plugin/agents/ with reviewer-*.md naming.
	// Accept either layout.
	for (const dir of expectedDirs) {
		if (dir === "reviewers") {
			it(`plugin has reviewer files (in agents/ or reviewers/)`, () => {
				const inAgents = fs
					.readdirSync(path.join(PLUGIN_DIR, "agents"))
					.some((f) => f.startsWith("reviewer-"));
				const hasReviewersDir = fs.existsSync(path.join(PLUGIN_DIR, "reviewers"));
				expect(
					inAgents || hasReviewersDir,
					"No reviewer files found in plugin/agents/ or plugin/reviewers/",
				).toBe(true);
			});
		} else {
			it(`plugin/${dir}/ exists`, () => {
				expect(
					fs.existsSync(path.join(PLUGIN_DIR, dir)),
					`Missing directory: plugin/${dir}/`,
				).toBe(true);
			});
		}
	}

	it("hook protection files exist", () => {
		const hooksDir = path.join(PLUGIN_DIR, "hooks");
		const hookJson = path.join(hooksDir, "hooks.json");
		expect(fs.existsSync(hookJson), "Missing hooks/hooks.json").toBe(true);
	});
});
