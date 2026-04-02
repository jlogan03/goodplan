import { z } from "zod";

/** Shared decision status values — used by both the entity schema and command input schemas. */
export const decisionStatusValues = ["active", "superseded", "revisiting"] as const;
export type DecisionStatus = (typeof decisionStatusValues)[number];

export const decisionEntrySchema = z.object({
	id: z.string().min(1),
	status: z.enum(decisionStatusValues),
	domain: z.string().min(1),
	title: z.string().min(1),
	summary: z.string().min(1),
	date: z.string().date(),
	supersededBy: z.string().nullable(),
	entityPath: z.string().min(1).optional(),
	reconsiderWhen: z.array(z.string().min(1)).optional(),
});
export type DecisionEntry = z.infer<typeof decisionEntrySchema>;
