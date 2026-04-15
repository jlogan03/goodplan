import { type SliceGoalExtract, sliceGoalExtractSchema } from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from a slice goal artifact.
 * Parses frontmatter for metadata and a fenced `yaml extract` block
 * for the goal definition.
 */
function extractSliceGoal(markdown: string): ExtractResult<SliceGoalExtract> {
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

	const parsed = sliceGoalExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Slice goal extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const sliceGoalExtractor: ExtractorDefinition<SliceGoalExtract> = {
	id: "slice-goal",
	description:
		"Extracts description, acceptance criteria, affected subsystems, dependencies, and scope exclusions from slice goal artifacts",
	extract: extractSliceGoal,
};
