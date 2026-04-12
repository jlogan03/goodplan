import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { rubricYamlSchema } from "../../schemas/trust/rubric.js";
import type { RubricYaml } from "../../schemas/trust/rubric.js";

export type LoadRubricResult =
	| { success: true; rubric: RubricYaml }
	| { success: false; errors: string[] };

/**
 * Load and validate a single rubric YAML file.
 */
export function loadRubric(filePath: string): LoadRubricResult {
	let raw: string;
	try {
		raw = readFileSync(filePath, "utf-8");
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { success: false, errors: [`Failed to read ${filePath}: ${message}`] };
	}

	let parsed: unknown;
	try {
		parsed = yaml.load(raw);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { success: false, errors: [`YAML parse error in ${filePath}: ${message}`] };
	}

	const result = rubricYamlSchema.safeParse(parsed);
	if (!result.success) {
		const errors = result.error.issues.map(
			(issue) => `${filePath}: ${issue.path.join(".")}: ${issue.message}`,
		);
		return { success: false, errors };
	}

	return { success: true, rubric: result.data };
}

/**
 * Load all rubric YAML files from a directory.
 * Returns a Map keyed by rubric ID.
 * Throws if any file fails to parse/validate (aggregated errors).
 */
export function loadAllRubrics(rubricDir: string): Map<string, RubricYaml> {
	let files: string[];
	try {
		files = readdirSync(rubricDir).filter((f) => f.endsWith(".yaml"));
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to read rubric directory ${rubricDir}: ${message}`);
	}

	const rubrics = new Map<string, RubricYaml>();
	const allErrors: string[] = [];

	for (const file of files) {
		const filePath = join(rubricDir, file);
		const result = loadRubric(filePath);
		if (result.success) {
			rubrics.set(result.rubric.id, result.rubric);
		} else {
			allErrors.push(...result.errors);
		}
	}

	if (allErrors.length > 0) {
		throw new Error(`Rubric loading failed:\n${allErrors.join("\n")}`);
	}

	return rubrics;
}
