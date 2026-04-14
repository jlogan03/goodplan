import {
	type PressureTestExtract,
	pressureTestExtractSchema,
} from "../../schemas/trust/extracts.js";
import { extractFencedYaml, parseFrontmatter } from "./parse-utils.js";
import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Extract structured data from a pressure test artifact.
 * Parses frontmatter for metadata and a fenced `yaml extract` block
 * for failure modes, findings, and related analysis.
 */
function extractPressureTest(markdown: string): ExtractResult<PressureTestExtract> {
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

	const parsed = pressureTestExtractSchema.safeParse(fenced.data);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "SCHEMA_INVALID",
				message: `Pressure test extract validation failed: ${parsed.error.message}`,
			},
		};
	}

	return { success: true, data: parsed.data };
}

export const pressureTestExtractor: ExtractorDefinition<PressureTestExtract> = {
	id: "pressure-test",
	description:
		"Extracts failure modes, scaling cliffs, optionality ledger, error classes, locked-in assumptions, and findings from pressure test artifacts",
	extract: extractPressureTest,
};
