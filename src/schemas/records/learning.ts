import { z } from "zod";

/** New-format learning entry with `file` field pointing to a scope-relative .md file. */
export const learningEntrySchemaNew = z.object({
	// NOTE: intentionally open string for forward-compatibility; RPC layer enforces specific enum
	category: z.string().min(1),
	summary: z.string().min(1),
	file: z.string().min(1),
	tags: z.array(z.string()),
	source: z.string().min(1),
	rollup: z.boolean(),
	rollupTo: z.array(z.string()),
});

/** Legacy learning entry with inline `detail` field. Retained during transition (Phases 1-3). */
export const learningEntrySchemaLegacy = z.object({
	category: z.string().min(1),
	summary: z.string().min(1),
	detail: z.string().min(1),
	tags: z.array(z.string()),
	source: z.string().min(1),
	rollup: z.boolean(),
	rollupTo: z.array(z.string()),
});

/** Union schema: accepts both new-format (`file`) and legacy (`detail`) entries.
 *  Phase 4 will tighten to require `file` only after migration. */
export const learningEntrySchema = z.union([learningEntrySchemaNew, learningEntrySchemaLegacy]);
export type LearningEntry = z.infer<typeof learningEntrySchema>;

/** Narrow type for new-format entries with `file` field. Used in state event payloads
 *  after the RPC layer maps LearningInput → LearningEventEntry. */
export type LearningEventEntry = z.infer<typeof learningEntrySchemaNew>;

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
