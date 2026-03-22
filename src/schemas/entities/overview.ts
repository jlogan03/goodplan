import { z } from "zod";
import { timestampSchema } from "../shared.js";

const overviewItemSchema = z.object({
	name: z.string().min(1),
	status: z.string().min(1),
	created: timestampSchema,
	completed: timestampSchema.nullable(),
});

export const overviewSchema = z.object({
	items: z.array(overviewItemSchema),
});
export type Overview = z.infer<typeof overviewSchema>;
