import type { ReviewerRegistry } from "./registry.js";
import type { ArtifactType, ReviewerRoute } from "./types.js";

/**
 * Always-on reviewer IDs that are included in every routing result at "high" relevance.
 */
const ALWAYS_ON_REVIEWERS = [
	"reviewer-holistic",
	"reviewer-agent-skill",
	"reviewer-software-architecture",
];

/**
 * Route reviewers for a given artifact type, affected subsystems, and max maturity level.
 * Returns a deduplicated array sorted by relevance (high first).
 */
export function routeReviewers(
	registry: ReviewerRegistry,
	artifactType: ArtifactType,
	affectedSubsystems: string[],
	_maxMaturity: string,
): ReviewerRoute[] {
	const routeMap = new Map<string, ReviewerRoute>();

	// 1. Always-on reviewers at "high" relevance
	for (const id of ALWAYS_ON_REVIEWERS) {
		const entry = registry.getById(id);
		if (entry !== undefined) {
			routeMap.set(id, { reviewerId: id, relevance: "high" });
		}
	}

	// 2. Artifact-specific reviewers matched via applies_to
	const artifactMatches = registry.getByArtifactType(artifactType);
	for (const entry of artifactMatches) {
		if (!routeMap.has(entry.id)) {
			// Specificity: if applies_to has few entries, it's more specific -> "high"
			const relevance = entry.frontmatter.applies_to.length <= 2 ? "high" : "medium";
			routeMap.set(entry.id, { reviewerId: entry.id, relevance });
		}
	}

	// 3. Subsystem-specific reviewers matched via domains overlap
	if (affectedSubsystems.length > 0) {
		const allEntries = registry.getAll();
		for (const entry of allEntries) {
			if (routeMap.has(entry.id)) continue;
			const overlap = entry.frontmatter.domains.filter((d) => affectedSubsystems.includes(d));
			if (overlap.length > 0) {
				// Direct match (majority of domains overlap) -> "high", partial -> "medium"
				const relevance =
					overlap.length >= entry.frontmatter.domains.length / 2 ? "high" : "medium";
				routeMap.set(entry.id, { reviewerId: entry.id, relevance });
			}
		}
	}

	// Sort by relevance: high > medium > low
	const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
	return [...routeMap.values()].sort(
		(a, b) => (order[a.relevance] ?? 2) - (order[b.relevance] ?? 2),
	);
}
