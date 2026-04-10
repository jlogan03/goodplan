import {
	type ArchitectureTargetExtract,
	architectureTargetExtractSchema,
} from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from an architecture target-state artifact.
 * Same structure as the architecture extractor, for target-state documents.
 */
function extractArchitectureTarget(markdown: string): ExtractResult<ArchitectureTargetExtract> {
	const fm = parseFrontmatter(markdown);
	if (!fm.success) {
		return {
			success: false,
			error: { code: fm.error, message: fm.message },
		};
	}

	const fenced = extractFencedYaml(markdown, "extract");
	if (!fenced.success) {
		return {
			success: false,
			error: { code: fenced.error, message: fenced.message },
		};
	}

	const parsed = architectureTargetExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Architecture target extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const architectureTargetExtractor: ExtractorDefinition<ArchitectureTargetExtract> = {
	id: "architecture-target",
	description:
		"Extracts subsystems, communication patterns, and proposed invariants from architecture target-state artifacts",
	extract: extractArchitectureTarget,
};
