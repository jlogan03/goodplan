// Public API barrel for the Context Bundler subsystem.

export { buildContextBundle, defaultBudgetConfig } from "./bundler.js";
export { estimateTokens } from "./token-estimate.js";
export { phaseSpecs } from "./phase-specs.js";

export type {
	AgentType,
	BudgetConfig,
	ContentResolver,
	ContextBundle,
	InlineSection,
	PhaseSpec,
	ReferenceSection,
	TokenBudget,
} from "./types.js";
