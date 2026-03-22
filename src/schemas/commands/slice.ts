import { z } from "zod";
import { deferredItemSchema } from "../entities/slice.js";
import { architectureDeltaInputSchema } from "../records/architecture-delta.js";
import { learningInputSchema } from "../records/learning.js";

/**
 * Zod schemas for slice command stdin inputs.
 * Validated at the CLI boundary before routing to RPC.
 */

/**
 * slice:create — merged from --epic flag + stdin {name, goal}.
 * `epic`: comes from --epic flag (required per INV-004).
 * `name` and `goal`: come from stdin JSON.
 */
export const createSliceInputSchema = z.object({
	epic: z.string().min(1, "epic is required"),
	name: z.string().min(1, "name is required"),
	goal: z.string().min(1, "goal is required"),
});
export type CreateSliceInput = z.infer<typeof createSliceInputSchema>;

/**
 * slice:complete — merged from --slice flag + stdin JSON.
 * `slice`: comes from --slice flag (required per INV-004).
 * `verificationPassed`: required boolean assertion.
 * `deferred`, `learnings`, `architectureDelta`: optional arrays from stdin.
 */
export const completeSliceInputSchema = z.object({
	slice: z.string().min(1, "slice is required"),
	verificationPassed: z.boolean({ error: "verificationPassed is required" }),
	deferred: z.array(deferredItemSchema).optional(),
	learnings: z.array(learningInputSchema).optional(),
	architectureDelta: z.array(architectureDeltaInputSchema).optional(),
});
export type CompleteSliceInput = z.infer<typeof completeSliceInputSchema>;
