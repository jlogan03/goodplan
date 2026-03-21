import { z } from "zod";
import { timestampSchema, versionSchema } from "../shared.js";

export const projectSchema = z.object({
	version: versionSchema,
	name: z.string().min(1),
	activeEpic: z.string().nullable(),
	activeSlice: z.string().nullable(),
	activeQuest: z.string().nullable(),
	created: timestampSchema,
	updated: timestampSchema,
});

export type Project = z.infer<typeof projectSchema>;
