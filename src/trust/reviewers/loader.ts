import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { reviewerFrontmatterSchema } from "../../schemas/trust/reviewer-frontmatter.js";
import { ReviewerRegistry } from "./registry.js";
import type { ReviewerRegistryEntry } from "./types.js";

/**
 * Load reviewer agent files from a plugin directory.
 * Reads plugin/agents/reviewer-*.md, parses YAML frontmatter, validates against schema.
 */
export function loadReviewerAgents(pluginDir: string): ReviewerRegistryEntry[] {
	const agentsDir = resolve(pluginDir, "agents");
	const allFiles = readdirSync(agentsDir);
	const reviewerFiles = allFiles.filter((f) => f.startsWith("reviewer-") && f.endsWith(".md"));
	const entries: ReviewerRegistryEntry[] = [];

	for (const fileName of reviewerFiles) {
		const filePath = join(agentsDir, fileName);
		const raw = readFileSync(filePath, "utf-8");
		const parsed = matter(raw);

		// The frontmatter in the file has name/description/model plus our registry fields.
		// We validate only the registry-specific fields via reviewerFrontmatterSchema.
		// The `id` field in the schema maps to the `name` field in the agent frontmatter.
		const frontmatterInput = {
			id: parsed.data.name as string,
			version: parsed.data.version as number,
			domains: parsed.data.domains,
			applies_to: parsed.data.applies_to,
			rubric_ref: parsed.data.rubric_ref,
			score_range: parsed.data.score_range,
			passing_threshold_per_dimension: parsed.data.passing_threshold_per_dimension,
		};

		const result = reviewerFrontmatterSchema.safeParse(frontmatterInput);
		if (!result.success) {
			throw new Error(
				`Invalid frontmatter in ${filePath}: ${result.error.issues.map((i) => i.message).join(", ")}`,
			);
		}

		entries.push({
			id: result.data.id,
			frontmatter: result.data,
			filePath,
			promptContent: parsed.content,
		});
	}

	return entries;
}

/**
 * Create a populated ReviewerRegistry from a plugin directory.
 */
export function createReviewerRegistry(pluginDir: string): ReviewerRegistry {
	const registry = new ReviewerRegistry();
	const entries = loadReviewerAgents(pluginDir);
	for (const entry of entries) {
		registry.register(entry);
	}
	return registry;
}
