import { z } from "zod";
import { verificationResultSchema, verificationSchema } from "../entities/epic.js";
import { learningInputSchema } from "../records/learning.js";

/**
 * Zod schemas for epic command stdin inputs.
 * Validated at the CLI boundary before routing to RPC.
 */

/** epic:create — stdin: { name, goal } */
export const createEpicInputSchema = z.object({
	name: z.string().min(1, "name is required"),
	goal: z.string().min(1, "goal is required"),
});
export type CreateEpicInput = z.infer<typeof createEpicInputSchema>;

/**
 * epic:complete — merged from --epic flag + stdin.
 * `epic`: comes from --epic flag (flag wins over stdin if both provided).
 * `verificationResults`: comes from stdin JSON.
 */
export const completeEpicInputSchema = z.object({
	epic: z.string().min(1, "epic is required"),
	verificationResults: z
		.array(verificationResultSchema)
		.min(1, "verificationResults must not be empty"),
	// Learnings from epic completion — coerced undefined → [] at schema boundary
	// (event type requires non-optional `learnings`; RPC layer applies ?? [] before dispatch)
	learnings: z.array(learningInputSchema).default([]),
});
export type CompleteEpicInput = z.infer<typeof completeEpicInputSchema>;

/**
 * epic:add-verification — merged from --epic flag + stdin.
 * `epic`: comes from --epic flag (flag wins over stdin if both provided).
 * `verification`: comes from stdin JSON.
 */
export const addVerificationInputSchema = z.object({
	epic: z.string().min(1, "epic is required"),
	verification: verificationSchema,
});
export type AddVerificationInput = z.infer<typeof addVerificationInputSchema>;

/**
 * epic:update-verification — merged from flags + stdin.
 * `epic`: comes from --epic flag (flag wins over stdin if both provided).
 * `index`: comes from --index flag (flag wins over stdin if both provided).
 * `verification`: comes from stdin JSON.
 */
export const updateVerificationInputSchema = z.object({
	epic: z.string().min(1, "epic is required"),
	index: z.coerce.number().int().nonnegative(),
	verification: verificationSchema,
});
export type UpdateVerificationInput = z.infer<typeof updateVerificationInputSchema>;
