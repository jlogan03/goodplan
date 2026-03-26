import { z } from "zod";
import { timestampSchema } from "../shared.js";

export const overviewItemSchema = z.object({
	name: z.string().min(1),
	status: z.string().min(1),
	epic: z.string().min(1).optional(),
	title: z.string().min(1).optional(),
	created: timestampSchema,
	completed: timestampSchema.nullable(),
});
export type OverviewItem = z.infer<typeof overviewItemSchema>;

export const overviewSchema = z.object({
	items: z.array(overviewItemSchema),
});
export type Overview = z.infer<typeof overviewSchema>;
