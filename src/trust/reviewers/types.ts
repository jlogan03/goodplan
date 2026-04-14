import type { ReviewerFrontmatter } from "../../schemas/trust/reviewer-frontmatter.js";

/** A registered reviewer entry loaded from plugin/agents/reviewer-*.md */
export interface ReviewerRegistryEntry {
	id: string;
	frontmatter: ReviewerFrontmatter;
	filePath: string;
	promptContent: string;
}

/** A routed reviewer with relevance weighting */
export interface ReviewerRoute {
	reviewerId: string;
	relevance: "high" | "medium" | "low";
}

/** Artifact types supported by the reviewer routing system */
export type ArtifactType =
	| "plan"
	| "architecture"
	| "goal"
	| "slice-set"
	| "pressure-test"
	| "code";
