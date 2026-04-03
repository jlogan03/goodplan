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

/** Deferred work item — matches architecture's DeferredItem (state-machine-api.md). */
export const deferredItemSchema = z.object({
	description: z.string().min(1),
	targetSlice: z.string().min(1),
	targetEpic: z.string().min(1).optional(),
});
export type DeferredItem = z.infer<typeof deferredItemSchema>;

export const sliceSchema = z.object({
	name: z.string().min(1),
	epic: z.string().min(1),
	status: sliceStatusSchema,
	goal: z.string().min(1),
	deferred: z.array(deferredItemSchema),
	implementationPhase: z.number().int().min(0).nullable().optional(),
	refinement: refinementSchema.nullable(),
	created: timestampSchema,
	updated: timestampSchema,
});
export type Slice = z.infer<typeof sliceSchema>;
