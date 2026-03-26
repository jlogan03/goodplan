import { z } from "zod";
import { overviewItemSchema } from "../entities/overview.js";
import { taskContextSchema } from "../entities/task.js";

/**
 * task:create — stdin input. `name` is required (consistent with all other entity creation commands).
 * The `/capture` skill auto-derives name by slugifying title so users never think about it.
 */
export const taskCreateInputSchema = z.object({
	name: z.string().min(1, "name is required"),
	title: z.string().min(1, "title is required"),
	description: z.string().optional(),
	/** Typically auto-populated by the /capture skill, may be omitted for direct CLI usage. */
	context: taskContextSchema.optional(),
});
export type TaskCreateInput = z.infer<typeof taskCreateInputSchema>;

/**
 * task:list — output schema (INV-006 compliance, analogous to statusResultSchema).
 */
export const taskListResultSchema = z.object({
	items: z.array(overviewItemSchema),
	filter: z.enum(["open", "all"]),
});
export type TaskListResult = z.infer<typeof taskListResultSchema>;
