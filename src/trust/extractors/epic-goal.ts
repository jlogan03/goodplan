import { type EpicGoalExtract, epicGoalExtractSchema } from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from an epic goal artifact.
 * Parses frontmatter for metadata and a fenced `yaml extract` block
 * for the goal definition.
 */
function extractEpicGoal(markdown: string): ExtractResult<EpicGoalExtract> {
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

	const parsed = epicGoalExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Epic goal extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const epicGoalExtractor: ExtractorDefinition<EpicGoalExtract> = {
	id: "epic-goal",
	description:
		"Extracts description, scope, non-goals, success criteria, and initial subsystems from epic goal artifacts",
	extract: extractEpicGoal,
};
