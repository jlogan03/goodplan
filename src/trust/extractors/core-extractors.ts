import { architectureTargetExtractor } from "./architecture-target.js";
import { architectureExtractor } from "./architecture.js";
import { epicGoalExtractor } from "./epic-goal.js";
import { planExtractor } from "./plan.js";
import { ExtractorRegistry } from "./registry.js";
import { sliceGoalExtractor } from "./slice-goal.js";

/**
 * Create an ExtractorRegistry pre-loaded with the 5 core artifact extractors.
 * Follows the createCoreRegistry() pattern from src/engine/invariants/core-rules.ts.
 */
export function createCoreExtractorRegistry(): ExtractorRegistry {
	const registry = new ExtractorRegistry();

	// Architecture extractors (2)
	registry.register(architectureExtractor);
	registry.register(architectureTargetExtractor);

	// Plan extractor (1)
	registry.register(planExtractor);

	// Goal extractors (2)
	registry.register(epicGoalExtractor);
	registry.register(sliceGoalExtractor);

	return registry;
}
