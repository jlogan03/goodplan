import type { ReviewerRegistryEntry } from "./types.js";

/**
 * Registry for reviewer agents.
 * Follows the InvariantRegistry pattern: private Map, duplicate-throws, query methods.
 */
export class ReviewerRegistry {
	private readonly entries = new Map<string, ReviewerRegistryEntry>();

	/** Register an entry. Throws if an entry with the same ID is already registered. */
	register(entry: ReviewerRegistryEntry): void {
		if (this.entries.has(entry.id)) {
			throw new Error(`Duplicate reviewer ID: "${entry.id}"`);
		}
		this.entries.set(entry.id, entry);
	}

	/** Return all registered entries. */
	getAll(): ReviewerRegistryEntry[] {
		return [...this.entries.values()];
	}

	/** Return an entry by ID, or undefined if not found. */
	getById(id: string): ReviewerRegistryEntry | undefined {
		return this.entries.get(id);
	}

	/** Return entries whose domains include the given domain. */
	getByDomain(domain: string): ReviewerRegistryEntry[] {
		return [...this.entries.values()].filter((e) => e.frontmatter.domains.includes(domain));
	}

	/** Return entries whose applies_to includes the given artifact type. */
	getByArtifactType(artifactType: string): ReviewerRegistryEntry[] {
		return [...this.entries.values()].filter((e) =>
			e.frontmatter.applies_to.includes(artifactType),
		);
	}
}
