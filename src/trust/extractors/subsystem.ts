import { type SubsystemExtract, subsystemExtractSchema } from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from a subsystem definition artifact.
 * Parses frontmatter for metadata and a fenced `yaml extract` block
 * for the subsystem definition.
 */
function extractSubsystem(markdown: string): ExtractResult<SubsystemExtract> {
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

	const parsed = subsystemExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Subsystem extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const subsystemExtractor: ExtractorDefinition<SubsystemExtract> = {
	id: "subsystem",
	description:
		"Extracts id, name, maturity, description, owns, dependsOn, and dependentCount from subsystem definition artifacts",
	extract: extractSubsystem,
};
