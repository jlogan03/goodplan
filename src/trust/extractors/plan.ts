import { type PlanExtract, planExtractSchema } from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from a plan artifact.
 * Parses plan chunks from a fenced `yaml extract` block,
 * along with chunk dependencies and affected subsystems.
 */
function extractPlan(markdown: string): ExtractResult<PlanExtract> {
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

	const parsed = planExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Plan extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const planExtractor: ExtractorDefinition<PlanExtract> = {
	id: "plan",
	description:
		"Extracts chunks, chunk dependencies, affected subsystems, and rollback path from plan artifacts",
	extract: extractPlan,
};
