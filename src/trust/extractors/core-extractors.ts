import { architectureTargetExtractor } from "./architecture-target.js";
import { architectureExtractor } from "./architecture.js";
import { briefingExtractor } from "./briefing.js";
import { epicGoalExtractor } from "./epic-goal.js";
import { findingExtractor } from "./finding.js";
import { planExtractor } from "./plan.js";
import { pressureTestExtractor } from "./pressure-test.js";
import { ExtractorRegistry } from "./registry.js";
import { sideQuestGoalExtractor } from "./side-quest-goal.js";
import { sliceGoalExtractor } from "./slice-goal.js";
import { subsystemExtractor } from "./subsystem.js";

/**
 * Create an ExtractorRegistry pre-loaded with all 10 artifact extractors.
 * Follows the createCoreRegistry() pattern from src/engine/invariants/core-rules.ts.
 */
export function createCoreExtractorRegistry(): ExtractorRegistry {
	const registry = new ExtractorRegistry();

	// Architecture extractors (2)
	registry.register(architectureExtractor);
	registry.register(architectureTargetExtractor);

	// Plan extractor (1)
	registry.register(planExtractor);

	// Goal extractors (3)
	registry.register(epicGoalExtractor);
	registry.register(sliceGoalExtractor);
	registry.register(sideQuestGoalExtractor);

	// Session/analysis extractors (4)
	registry.register(briefingExtractor);
	registry.register(pressureTestExtractor);
	registry.register(findingExtractor);
	registry.register(subsystemExtractor);

	return registry;
}
