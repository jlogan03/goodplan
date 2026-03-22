import { z } from "zod";
import { refinementSchema, timestampSchema } from "../shared.js";

export const sliceStatusSchema = z.enum([
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
export type SliceStatus = z.infer<typeof sliceStatusSchema>;

export const sliceSchema = z.object({
	name: z.string().min(1),
	epic: z.string().min(1),
	status: sliceStatusSchema,
	goal: z.string().min(1),
	deferred: z.array(z.string()),
	refinement: refinementSchema.nullable(),
	created: timestampSchema,
	updated: timestampSchema,
});
export type Slice = z.infer<typeof sliceSchema>;
