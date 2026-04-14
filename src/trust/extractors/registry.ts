import type { ExtractResult, ExtractorDefinition } from "./types.js";

/**
 * Registry for artifact extractors.
 * Follows the same pattern as InvariantRegistry: register/getById/getAll with duplicate rejection.
 */
export class ExtractorRegistry {
	private readonly extractors = new Map<string, ExtractorDefinition<unknown>>();

	/** Register an extractor. Throws if an extractor with the same ID is already registered. */
	register(def: ExtractorDefinition<unknown>): void {
		if (this.extractors.has(def.id)) {
			throw new Error(`Duplicate extractor ID: "${def.id}"`);
		}
		this.extractors.set(def.id, def);
	}

	/** Return an extractor by ID, or undefined if not found. */
	getById(id: string): ExtractorDefinition<unknown> | undefined {
		return this.extractors.get(id);
	}

	/** Return all registered extractors. */
	getAll(): ExtractorDefinition<unknown>[] {
		return [...this.extractors.values()];
	}

	/**
	 * Convenience method: look up an extractor by ID and run it.
	 * Returns ExtractResult<unknown> — callers narrow via the specific extractor's Zod schema.
	 * Returns a failure result if the extractor ID is not found.
	 */
	extract(id: string, markdown: string): ExtractResult<unknown> {
		const def = this.extractors.get(id);
		if (def === undefined) {
			return {
				success: false,
				error: {
					code: "SCHEMA_INVALID",
					message: `No extractor registered with ID: "${id}"`,
				},
			};
		}
		return def.extract(markdown);
	}
}
