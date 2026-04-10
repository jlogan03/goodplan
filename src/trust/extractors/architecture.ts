import {
	type ArchitectureExtract,
	architectureExtractSchema,
} from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from an architecture artifact.
 * Parses YAML frontmatter for top-level metadata and
 * a fenced `yaml extract` block for subsystem definitions.
 */
function extractArchitecture(markdown: string): ExtractResult<ArchitectureExtract> {
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

	const parsed = architectureExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Architecture extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const architectureExtractor: ExtractorDefinition<ArchitectureExtract> = {
	id: "architecture",
	description:
		"Extracts subsystems, communication patterns, and proposed invariants from architecture artifacts",
	extract: extractArchitecture,
};
