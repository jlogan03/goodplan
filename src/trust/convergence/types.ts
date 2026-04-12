import type { ConvergenceConfig } from "../../schemas/trust/convergence.js";

export type { ConvergenceConfig };

/**
 * Relevance weight for a reviewer — determines whether its scores block convergence.
 * - "high"/"medium": dimension below threshold or BLOCKING/CRITICAL finding blocks convergence
 * - "low": advisory only, never blocks convergence
 */
export type RelevanceWeight = "high" | "medium" | "low";

/**
 * Default convergence config for plan artifacts.
 */
export const DEFAULT_PLAN_CONFIG: ConvergenceConfig = {
	maxRounds: 3,
	stagnationWindow: 2,
	disagreementThreshold: 3,
	reductionThreshold: 0.1,
};

/**
 * Default convergence config for architecture artifacts.
 */
export const DEFAULT_ARCHITECTURE_CONFIG: ConvergenceConfig = {
	maxRounds: 5,
	stagnationWindow: 2,
	disagreementThreshold: 3,
	reductionThreshold: 0.1,
};
