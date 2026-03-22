import { z } from "zod";
import { refinementSchema, timestampSchema } from "../shared.js";

export const questStatusSchema = z.enum([
	"created",
	"planning",
	"plan-created",
	"refining",
	"plan-refined",
	"implementing",
	"implementation-complete",
	"completed",
	"abandoned",
]);
export type QuestStatus = z.infer<typeof questStatusSchema>;

export const questSchema = z.object({
	name: z.string().min(1),
	status: questStatusSchema,
	goal: z.string().min(1),
	refinement: refinementSchema.nullable(),
	created: timestampSchema,
	updated: timestampSchema,
});
export type Quest = z.infer<typeof questSchema>;
