/**
 * Core types for the extractor framework.
 * Extractors are pure functions that parse structured content from artifact markdown.
 */

/** Error codes returned by extractors on failure */
export type ExtractErrorCode =
	| "FRONTMATTER_MISSING"
	| "FRONTMATTER_INVALID"
	| "FENCED_BLOCK_MISSING"
	| "YAML_PARSE_ERROR"
	| "SCHEMA_INVALID";

/** Location in the source markdown where an error occurred */
export interface ExtractErrorLocation {
	line: number;
	column: number;
}

/** Error detail returned on extraction failure */
export interface ExtractError {
	code: ExtractErrorCode;
	message: string;
	location?: ExtractErrorLocation;
}

/** Discriminated union result type for extraction */
export type ExtractResult<T> = { success: true; data: T } | { success: false; error: ExtractError };

/** A pure function that extracts structured data from markdown content */
export type Extractor<T> = (markdownContent: string) => ExtractResult<T>;

/** Definition for a registered extractor */
export interface ExtractorDefinition<T> {
	id: string;
	description: string;
	extract: Extractor<T>;
}
