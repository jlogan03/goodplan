import { z } from "zod";
import { SteeringPreferenceSchema } from "../entities/derived-state.js";

/**
 * Input schema for `gp project:set-steering` (stdin JSON).
 */
export const setSteeringInputSchema = z.object({
	preference: SteeringPreferenceSchema,
});
export type SetSteeringInput = z.infer<typeof setSteeringInputSchema>;
