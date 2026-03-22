import { z } from "zod";

export const decisionEntrySchema = z.object({
	id: z.string().min(1),
	status: z.enum(["active", "superseded", "revisiting"]),
	domain: z.string().min(1),
	title: z.string().min(1),
	summary: z.string().min(1),
	date: z.string().date(),
	supersededBy: z.string().nullable(),
});
export type DecisionEntry = z.infer<typeof decisionEntrySchema>;
