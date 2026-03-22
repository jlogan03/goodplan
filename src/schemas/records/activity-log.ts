import { z } from "zod";
import { timestampSchema } from "../shared.js";

export const activityEntrySchema = z.object({
	ts: timestampSchema,
	phase: z.string().min(1),
	scope: z.string().min(1),
	status: z.string().min(1),
	summary: z.string().min(1),
	// NOTE: detail not in data model examples but useful for extended context; document in data model if kept
	detail: z.string().optional(),
});
export type ActivityEntry = z.infer<typeof activityEntrySchema>;
