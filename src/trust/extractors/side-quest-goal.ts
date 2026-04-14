import {
	type SideQuestGoalExtract,
	sideQuestGoalExtractSchema,
} from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from a side-quest goal artifact.
 * Parses frontmatter for metadata and a fenced `yaml extract` block
 * for the goal definition.
 */
function extractSideQuestGoal(markdown: string): ExtractResult<SideQuestGoalExtract> {
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

	const parsed = sideQuestGoalExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Side-quest goal extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const sideQuestGoalExtractor: ExtractorDefinition<SideQuestGoalExtract> = {
	id: "side-quest-goal",
	description:
		"Extracts description, scope, verification method, and parent epic ref from side-quest goal artifacts",
	extract: extractSideQuestGoal,
};
