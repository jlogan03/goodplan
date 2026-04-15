import { z } from "zod";

/**
 * Input schema for `gp invariant:propose` (stdin JSON).
 */
export const proposeInvariantInputSchema = z.object({
	id: z.string().min(1),
	description: z.string().min(1),
	type: z.literal("custom"),
	rule: z.string().optional(),
});
export type ProposeInvariantInput = z.infer<typeof proposeInvariantInputSchema>;

/**
 * Input schema for `gp invariant:activate` (stdin JSON).
 */
export const activateInvariantInputSchema = z.object({
	id: z.string().min(1),
});
export type ActivateInvariantInput = z.infer<typeof activateInvariantInputSchema>;

/**
 * Input schema for `gp invariant:deactivate` (stdin JSON).
 */
export const deactivateInvariantInputSchema = z.object({
	id: z.string().min(1),
});
export type DeactivateInvariantInput = z.infer<typeof deactivateInvariantInputSchema>;
