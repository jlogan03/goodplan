import type { ConvergenceConfig, ConvergenceResult } from "../schemas/trust/convergence.js";
import type { DimensionResult, ReviewerFinding } from "../schemas/trust/reviewer-payload.js";
import type { CircuitBreakerResult } from "./convergence/circuit-breaker.js";
import type { Rubric, ScoredEvent } from "./convergence/evaluator.js";
import type { RelevanceWeight } from "./convergence/types.js";
import type { ArtifactEditor } from "./interfaces/artifact-editor.js";
import type { ReviewerDispatcher } from "./interfaces/reviewer-dispatcher.js";

/**
 * A single finding with deduplication metadata.
 * When multiple reviewers produce the same finding (same severity+dimension+description80),
 * we keep one representative and track how many were merged.
 */
export interface SynthesizedFinding {
	severity: ReviewerFinding["severity"];
	dimension: string;
	description: string;
	mergedCount: number;
}

/**
 * Combined feedback from all reviewers in a round,
 * deduplicated and sorted by severity.
 */
export interface SynthesizedFeedback {
	findings: SynthesizedFinding[];
	dimensions: DimensionResult[];
}

/**
 * Data passed to the onRoundComplete callback after each round.
 */
export interface RoundCompleteData {
	round: number;
	convergenceResult: ConvergenceResult;
	circuitBreakerResult: CircuitBreakerResult;
	payloadCount: number;
	errorCount: number;
}

/**
 * Options for running a refinement loop.
 */
export interface RefinementLoopOptions {
	artifactType: string;
	artifactContent: string;
	reviewerIds: string[];
	convergenceConfig: ConvergenceConfig;
	rubric: Rubric;
	relevanceWeights: Map<string, RelevanceWeight>;
	dispatcher: ReviewerDispatcher;
	editor: ArtifactEditor;
	onRoundComplete?: (data: RoundCompleteData) => void;
}

/**
 * Result of running a refinement loop.
 */
export interface RefinementLoopResult {
	finalContent: string;
	converged: boolean;
	rounds: number;
	convergenceResult: ConvergenceResult;
	circuitBreakerResult: CircuitBreakerResult;
	history: ScoredEvent[];
}
