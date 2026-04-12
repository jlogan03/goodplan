import { z } from "zod";

/**
 * Input schema for `gp briefing:write` (stdin JSON).
 * Scope and epic are CLI flags, not stdin fields.
 */
export const writeBriefingInputSchema = z.object({
	timeContext: z.string().min(1),
	currentPosition: z.string().min(1),
	lastAction: z.string().min(1),
	whereStopped: z.string().min(1),
	nextAction: z.string().min(1),
	attentionItems: z.array(z.string()),
	deepLinks: z
		.array(
			z.object({
				label: z.string().min(1),
				path: z.string().min(1),
			}),
		)
		.optional(),
});
export type WriteBriefingInput = z.infer<typeof writeBriefingInputSchema>;
