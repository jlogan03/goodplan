import matter from "gray-matter";
import yaml from "js-yaml";
import type { ExtractErrorCode } from "./types.js";

/** Result type for frontmatter parsing */
export type FrontmatterResult =
	| { success: true; data: Record<string, unknown>; content: string }
	| { success: false; error: ExtractErrorCode; message: string };

/** Result type for fenced YAML block extraction */
export type FencedYamlResult =
	| { success: true; data: unknown }
	| { success: false; error: ExtractErrorCode; message: string }
	| { success: false; error: ExtractErrorCode; message: string; line: number };

/**
 * Parse YAML frontmatter from markdown content.
 * Returns the parsed frontmatter data and the remaining content (without frontmatter).
 */
export function parseFrontmatter(markdown: string): FrontmatterResult {
	// Check if frontmatter delimiter exists
	if (!markdown.trimStart().startsWith("---")) {
		return {
			success: false,
			error: "FRONTMATTER_MISSING",
			message: "No YAML frontmatter found (content does not start with ---)",
		};
	}

	try {
		const result = matter(markdown);
		// gray-matter returns empty object for empty frontmatter
		if (result.data === undefined || Object.keys(result.data as object).length === 0) {
			return {
				success: false,
				error: "FRONTMATTER_MISSING",
				message: "YAML frontmatter is empty",
			};
		}
		return {
			success: true,
			data: result.data as Record<string, unknown>,
			content: result.content,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			success: false,
			error: "FRONTMATTER_INVALID",
			message: `Failed to parse YAML frontmatter: ${message}`,
		};
	}
}

/**
 * Extract and parse a fenced YAML block with the given label.
 * Looks for blocks in the format:
 * ```yaml <label>
 * ...yaml content...
 * ```
 */
export function extractFencedYaml(markdown: string, label: string): FencedYamlResult {
	// Match ```yaml <label> ... ``` blocks (case-insensitive label match)
	const pattern = new RegExp(
		`\`\`\`yaml\\s+${escapeRegExp(label)}\\s*\\n([\\s\\S]*?)\\n\`\`\``,
		"m",
	);
	const match = pattern.exec(markdown);

	if (match === null || match[1] === undefined) {
		return {
			success: false,
			error: "FENCED_BLOCK_MISSING",
			message: `No fenced YAML block found with label "${label}"`,
		};
	}

	try {
		const parsed = yaml.load(match[1]);
		return { success: true, data: parsed };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		// Attempt to extract line info from js-yaml error
		const lineMatch = /line (\d+)/.exec(message);
		const line = lineMatch?.[1] !== undefined ? Number.parseInt(lineMatch[1], 10) : undefined;

		if (line !== undefined) {
			return {
				success: false,
				error: "YAML_PARSE_ERROR" as const,
				message: `Failed to parse YAML in "${label}" block: ${message}`,
				line,
			};
		}
		return {
			success: false,
			error: "YAML_PARSE_ERROR" as const,
			message: `Failed to parse YAML in "${label}" block: ${message}`,
		};
	}
}

/** Escape special regex characters in a string */
function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
