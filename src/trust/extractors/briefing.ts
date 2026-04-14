import { type BriefingExtract, briefingExtractSchema } from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from a briefing artifact.
 * Parses frontmatter for metadata and a fenced `yaml extract` block
 * for the briefing definition (deep links, attention items, etc.).
 */
function extractBriefing(markdown: string): ExtractResult<BriefingExtract> {
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

	const parsed = briefingExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Briefing extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const briefingExtractor: ExtractorDefinition<BriefingExtract> = {
	id: "briefing",
	description:
		"Extracts time context, current position, actions, attention items, and deep links from briefing artifacts",
	extract: extractBriefing,
};
