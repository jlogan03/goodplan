import { type FindingExtract, findingExtractSchema } from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from a finding artifact.
 * Parses frontmatter for metadata and a fenced `yaml extract` block
 * for classification, reshape option, and related subsystems.
 */
function extractFinding(markdown: string): ExtractResult<FindingExtract> {
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

	const parsed = findingExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Finding extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const findingExtractor: ExtractorDefinition<FindingExtract> = {
	id: "finding",
	description:
		"Extracts classification, reshape option, and related subsystems from finding artifacts",
	extract: extractFinding,
};
