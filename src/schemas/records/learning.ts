import { z } from "zod";

/** Learning entry schema — requires `file` field pointing to a scope-relative .md file.
 *  Migration (Phase 4) converts legacy `detail` entries to `file`-based entries. */
export const learningEntrySchema = z.object({
	// NOTE: intentionally open string for forward-compatibility; RPC layer enforces specific enum
	category: z.string().min(1),
	summary: z.string().min(1),
	file: z.string().min(1),
	tags: z.array(z.string()),
	source: z.string().min(1),
	rollup: z.boolean(),
	rollupTo: z.array(z.string()),
});
export type LearningEntry = z.infer<typeof learningEntrySchema>;

/** Alias retained for consumers that reference the new-format schema by name. */
export const learningEntrySchemaNew = learningEntrySchema;

/** Type for new-format entries with `file` field. Used in state event payloads
 *  after the RPC layer maps LearningInput → LearningEventEntry. */
export type LearningEventEntry = LearningEntry;

/** Input schema for learnings at completion boundary — validated per INV-005/INV-007.
 *  Omits `source` and `rollup` (injected by RPC layer). Skills pass `detail` in the payload;
 *  the RPC layer maps it to a `file` field. */
export const learningInputSchema = z.object({
	category: z.enum(["domain", "worked", "didnt-work", "do-differently"]),
	summary: z.string().min(1),
	detail: z.string().min(1),
	tags: z.array(z.string()),
	rollupTo: z.array(z.string()),
});
export type LearningInput = z.infer<typeof learningInputSchema>;
