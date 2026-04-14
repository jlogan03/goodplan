import { z } from "zod";

/**
 * Input schema for `gp finding:capture` (stdin JSON).
 * Epic is a CLI flag, not a stdin field.
 */
export const captureFindingInputSchema = z.object({
	summary: z.string().min(1),
	severity: z.enum(["blocking", "critical", "important", "minor"]),
	classification: z
		.object({
			blocking: z.boolean(),
			inScope: z.boolean(),
		})
		.optional(),
	relatedSubsystems: z.array(z.string()).optional(),
	reshape: z.boolean().optional(),
	context: z.string().optional(),
	sliceRef: z.string().optional(),
});
export type CaptureFindingInput = z.infer<typeof captureFindingInputSchema>;

/**
 * Input schema for `gp finding:triage` (stdin JSON).
 * Epic is a CLI flag, not a stdin field.
 */
export const triageFindingInputSchema = z.object({
	findingId: z.string().uuid(),
	disposition: z.enum(["accepted", "dismissed", "deferred"]),
	reason: z.string().min(1),
});
export type TriageFindingInput = z.infer<typeof triageFindingInputSchema>;
