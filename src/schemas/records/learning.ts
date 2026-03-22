import { z } from "zod";

export const learningEntrySchema = z.object({
	// NOTE: intentionally open string for forward-compatibility; RPC layer enforces specific enum
	category: z.string().min(1),
	summary: z.string().min(1),
	detail: z.string().min(1),
	tags: z.array(z.string()),
	source: z.string().min(1),
	rollup: z.boolean(),
	rollupTo: z.array(z.string()),
});
export type LearningEntry = z.infer<typeof learningEntrySchema>;

/** Input schema for learnings at completion boundary — validated per INV-005/INV-007.
 *  Omits `source` and `rollup` (injected by RPC layer). */
export const learningInputSchema = z.object({
	category: z.enum(["domain", "worked", "didnt-work", "do-differently"]),
	summary: z.string().min(1),
	detail: z.string().min(1),
	tags: z.array(z.string()),
	rollupTo: z.array(z.string()),
});
export type LearningInput = z.infer<typeof learningInputSchema>;
