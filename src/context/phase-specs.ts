import type { Phase } from "../schemas/entities/derived-state.js";
import type { PhaseSpec } from "./types.js";

/**
 * Per-phase inline/reference specifications.
 *
 * Keys map to DerivedStateData accessor paths:
 *   - "architecture-current" -> root architecture doc (.goodplan/architecture-current.md)
 *   - "architecture-target" -> epic's architecture target ContentRef
 *   - "epic-goal" -> epic's goal ContentRef
 *   - "conventions" -> .goodplan/conventions.md
 *   - "subsystem-registry" -> subsystem maturity registry
 *   - "active-decisions" -> active decision entries
 *   - "recent-learnings" -> recent learning entries
 *   - "exploration-artifacts" -> exploration cycle artifacts
 *   - "exploration-conclusions" -> concluded exploration summaries
 *   - "research" -> relevant research artifacts
 *   - "pressure-test-findings" -> pressure test finding entries
 *   - "slice-goal" -> slice's goal ContentRef
 *   - "slice-plan" -> slice's plan ContentRef
 *   - "plan-chunks" -> plan with chunk breakdown
 *   - "reviewer-feedback" -> latest reviewer feedback
 *   - "code-diff" -> code diff for refinement
 *   - "epic-summary" -> synthesized epic summary (goal + architecture + slices)
 *   - "slice-summary" -> synthesized slice summary
 *   - "chunk-evidence" -> chunk verification evidence
 *   - "subsystem-docs" -> relevant subsystem documentation
 *   - "other-slice-plans" -> other slice plans in the epic
 *   - "prior-architecture-drafts" -> previous architecture draft versions
 *   - "prior-exploration-cycles" -> previous exploration cycle artifacts
 *   - "slice-details" -> full slice detail breakdowns
 *   - "test-output" -> test execution output
 *   - "learnings" -> learning entries for reconciliation
 *
 * Inline keys are ordered by priority (first = highest).
 */
export const phaseSpecs: Record<Phase, PhaseSpec> = {
	// --- Epic phases ---

	P0: {
		inlineKeys: ["conventions"],
		referenceKeys: ["architecture-current"],
	},

	P1: {
		inlineKeys: ["architecture-current", "conventions", "subsystem-registry", "active-decisions"],
		referenceKeys: ["recent-learnings", "exploration-artifacts"],
	},

	P2: {
		inlineKeys: ["epic-goal", "architecture-current", "research"],
		referenceKeys: ["subsystem-docs", "prior-exploration-cycles"],
	},

	P3: {
		inlineKeys: [
			"epic-goal",
			"architecture-current",
			"architecture-target",
			"exploration-conclusions",
			"subsystem-registry",
		],
		referenceKeys: ["conventions", "prior-architecture-drafts"],
	},

	P4: {
		inlineKeys: ["architecture-target", "epic-goal", "subsystem-registry"],
		referenceKeys: ["architecture-current", "conventions"],
	},

	P5: {
		inlineKeys: ["architecture-target", "pressure-test-findings", "epic-goal"],
		referenceKeys: ["subsystem-docs", "conventions"],
	},

	P6: {
		inlineKeys: ["epic-summary", "architecture-current"],
		referenceKeys: ["slice-details"],
	},

	P7: {
		inlineKeys: ["slice-goal", "architecture-target", "architecture-current", "subsystem-docs"],
		referenceKeys: ["other-slice-plans", "conventions"],
	},

	P8: {
		inlineKeys: ["slice-plan", "slice-goal", "architecture-target"],
		referenceKeys: ["architecture-current", "subsystem-docs"],
	},

	P9: {
		inlineKeys: ["slice-plan", "reviewer-feedback", "architecture-target"],
		referenceKeys: ["architecture-current", "subsystem-docs"],
	},

	P10: {
		inlineKeys: ["plan-chunks", "architecture-current"],
		referenceKeys: ["architecture-target", "subsystem-docs", "conventions"],
	},

	P11: {
		inlineKeys: ["code-diff", "reviewer-feedback", "plan-chunks"],
		referenceKeys: ["architecture-current", "test-output"],
	},

	P12: {
		inlineKeys: ["slice-summary", "chunk-evidence", "architecture-current"],
		referenceKeys: ["architecture-target", "learnings"],
	},

	// --- Side-quest phases ---

	S0: {
		inlineKeys: ["conventions"],
		referenceKeys: ["architecture-current"],
	},

	S1: {
		inlineKeys: ["architecture-current", "conventions"],
		referenceKeys: ["subsystem-docs"],
	},

	S2: {
		inlineKeys: ["plan-chunks", "architecture-current"],
		referenceKeys: ["conventions", "subsystem-docs"],
	},

	S3: {
		inlineKeys: ["slice-summary", "chunk-evidence"],
		referenceKeys: ["architecture-current", "learnings"],
	},
};
