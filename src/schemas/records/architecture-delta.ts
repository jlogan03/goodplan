import { z } from "zod";
import { timestampSchema } from "../shared.js";

export const architectureDeltaSchema = z.object({
	subsystem: z.string().min(1),
	type: z.enum(["add", "modify", "remove"]),
	description: z.string().min(1),
	ts: timestampSchema,
});
export type ArchitectureDelta = z.infer<typeof architectureDeltaSchema>;

/** Input schema for architecture deltas at completion boundary — omits `ts` (injected by RPC layer). */
export const architectureDeltaInputSchema = z.object({
	subsystem: z.string().min(1),
	type: z.enum(["add", "modify", "remove"]),
	description: z.string().min(1),
});
export type ArchitectureDeltaInput = z.infer<typeof architectureDeltaInputSchema>;
