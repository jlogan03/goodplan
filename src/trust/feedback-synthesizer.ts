import type {
	DimensionResult,
	FindingSeverity,
	ReviewerPayload,
} from "../schemas/trust/reviewer-payload.js";
import type { SynthesizedFeedback, SynthesizedFinding } from "./refinement-loop-types.js";

/**
 * Severity ordering for sorting: most severe first.
 */
const SEVERITY_ORDER: Record<FindingSeverity, number> = {
	BLOCKING: 0,
	CRITICAL: 1,
	IMPORTANT: 2,
	MINOR: 3,
};

/**
 * Normalize a description for dedup: lowercase, collapse whitespace, take first 80 chars.
 */
function normalizeDescription(description: string): string {
	return description.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * Build a three-field dedup key for a finding.
 * Finer-grained than the circuit breaker's two-field key (severity+dimension)
 * because the synthesizer loses information when merging.
 */
function findingDedupKey(severity: string, dimension: string, description: string): string {
	return `${severity}:${dimension}:${normalizeDescription(description)}`;
}

/**
 * Synthesize feedback from multiple reviewer payloads.
 *
 * - Deduplicates findings by three-field key: severity + dimension + normalized description (first 80 chars)
 * - Sorts findings by severity (BLOCKING > CRITICAL > IMPORTANT > MINOR)
 * - Aggregates dimension scores across reviewers
 *
 * Pure function — no I/O, no side effects.
 */
export function synthesizeFeedback(payloads: ReviewerPayload[]): SynthesizedFeedback {
	// Deduplicate findings
	const findingMap = new Map<string, SynthesizedFinding>();

	for (const payload of payloads) {
		for (const finding of payload.findings) {
			const key = findingDedupKey(finding.severity, finding.dimension, finding.description);
			const existing = findingMap.get(key);
			if (existing !== undefined) {
				existing.mergedCount += 1;
			} else {
				findingMap.set(key, {
					severity: finding.severity,
					dimension: finding.dimension,
					description: finding.description,
					mergedCount: 1,
				});
			}
		}
	}

	// Sort by severity
	const findings = [...findingMap.values()].sort((a, b) => {
		return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
	});

	// Aggregate dimension scores: average scores per dimension name
	const dimensionScores = new Map<
		string,
		{ totalScore: number; totalThreshold: number; count: number }
	>();

	for (const payload of payloads) {
		for (const dim of payload.dimensions) {
			const existing = dimensionScores.get(dim.name);
			if (existing !== undefined) {
				existing.totalScore += dim.score;
				existing.totalThreshold += dim.threshold;
				existing.count += 1;
			} else {
				dimensionScores.set(dim.name, {
					totalScore: dim.score,
					totalThreshold: dim.threshold,
					count: 1,
				});
			}
		}
	}

	const dimensions: DimensionResult[] = [];
	for (const [name, agg] of dimensionScores) {
		const avgScore = agg.totalScore / agg.count;
		const avgThreshold = agg.totalThreshold / agg.count;
		dimensions.push({
			name,
			score: avgScore,
			threshold: avgThreshold,
			passed: avgScore >= avgThreshold,
		});
	}

	return { findings, dimensions };
}
