import { z } from "zod";
import { SubsystemMaturitySchema } from "../events/subsystem.js";

/**
 * Input schema for `gp subsystem:register` (stdin JSON).
 */
export const registerSubsystemInputSchema = z.object({
	name: z.string().min(1),
	maturity: SubsystemMaturitySchema,
	owns: z.array(z.string()),
});
export type RegisterSubsystemInput = z.infer<typeof registerSubsystemInputSchema>;

/**
 * Input schema for `gp subsystem:update-maturity` (stdin JSON).
 */
export const updateMaturityInputSchema = z.object({
	maturity: SubsystemMaturitySchema,
});
export type UpdateMaturityInput = z.infer<typeof updateMaturityInputSchema>;
