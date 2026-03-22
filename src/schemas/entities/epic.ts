import { z } from "zod";
import { timestampSchema } from "../shared.js";

export const epicStatusSchema = z.enum([
	"created",
	"exploring",
	"explored",
	"defining-architecture",
	"architecture-defined",
	"refining-architecture",
	"architecture-refined",
	"defining-slices",
	"slices-defined",
	"refining-slices",
	"slices-refined",
	"activated",
	"completed",
	"abandoned",
]);
export type EpicStatus = z.infer<typeof epicStatusSchema>;

export const verificationSchema = z.object({
	description: z.string().min(1),
	status: z.enum(["pending", "passed", "failed"]),
	addedDuring: z.string().min(1),
	modifiedDuring: z.string().nullable(),
});
export type Verification = z.infer<typeof verificationSchema>;

export const epicSchema = z.object({
	name: z.string().min(1),
	status: epicStatusSchema,
	goal: z.string().min(1),
	verifications: z.array(verificationSchema),
	sliceSequence: z.array(z.string()),
	created: timestampSchema,
	activated: timestampSchema.nullable(),
	updated: timestampSchema,
});
export type Epic = z.infer<typeof epicSchema>;
