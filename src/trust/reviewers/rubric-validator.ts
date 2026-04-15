import type { RubricYaml } from "../../schemas/trust/rubric.js";
import type { ReviewerRegistry } from "./registry.js";

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Validate rubrics against the reviewer registry.
 *
 * Checks:
 * (a) Every rubric_ref in reviewer frontmatter resolves to a loaded rubric
 * (b) Every passing_threshold_per_dimension key references a dimension that exists in the rubric
 * (c) No orphaned rubrics (rubric exists but no reviewer references it) — warning only
 */
export function validateRubrics(
	registry: ReviewerRegistry,
	rubrics: Map<string, RubricYaml>,
): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const referencedRubricIds = new Set<string>();

	for (const entry of registry.getAll()) {
		const rubricRef = entry.frontmatter.rubric_ref;
		referencedRubricIds.add(rubricRef);

		const rubric = rubrics.get(rubricRef);
		if (!rubric) {
			errors.push(
				`Reviewer "${entry.id}": rubric_ref "${rubricRef}" does not resolve to any loaded rubric`,
			);
			continue;
		}

		// Check dimension references in passing_threshold_per_dimension
		const dimensionNames = new Set(rubric.dimensions.map((d) => d.name));
		for (const dimKey of Object.keys(entry.frontmatter.passing_threshold_per_dimension)) {
			if (!dimensionNames.has(dimKey)) {
				errors.push(
					`Reviewer "${entry.id}": passing_threshold_per_dimension references dimension "${dimKey}" which does not exist in rubric "${rubricRef}"`,
				);
			}
		}
	}

	// Check for orphaned rubrics (warning only)
	for (const rubricId of rubrics.keys()) {
		if (!referencedRubricIds.has(rubricId)) {
			warnings.push(`Rubric "${rubricId}" is not referenced by any reviewer`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}
