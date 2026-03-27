/**
 * Slug derivation for per-learning .md files.
 * kebab-case, lowercase, strip non-alphanumeric except hyphens,
 * collapse consecutive hyphens, truncate at word boundaries (60 chars).
 * Collision detection via Set<string> from the state tree.
 */

const MAX_SLUG_LENGTH = 60;

/**
 * Derive a unique slug from a summary string.
 * @param summary - The learning summary text
 * @param existingSlugs - Set of slugs already used (from state tree, not filesystem)
 * @returns A unique slug string suitable for use as a filename stem
 */
export function deriveSlug(summary: string, existingSlugs: Set<string>): string {
	// Convert to kebab-case: lowercase, replace non-alphanumeric with hyphens
	let slug = summary
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens

	// Collapse consecutive hyphens
	slug = slug.replace(/-{2,}/g, "-");

	// Edge case: empty slug after normalization (e.g., summary is all special characters)
	if (slug.length === 0) {
		slug = "learning";
	}

	// Truncate at word boundary (last hyphen before MAX_SLUG_LENGTH)
	if (slug.length > MAX_SLUG_LENGTH) {
		const lastHyphen = slug.lastIndexOf("-", MAX_SLUG_LENGTH);
		if (lastHyphen > 0) {
			slug = slug.slice(0, lastHyphen);
		} else {
			// No hyphen found before limit — hard truncate
			slug = slug.slice(0, MAX_SLUG_LENGTH);
		}
	}

	// Collision handling: append -2, -3, etc. if slug already exists
	if (!existingSlugs.has(slug)) {
		return slug;
	}

	let counter = 2;
	while (existingSlugs.has(`${slug}-${counter}`)) {
		counter++;
	}
	return `${slug}-${counter}`;
}
