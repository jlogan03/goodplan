import { z } from "zod";
import { timestampSchema } from "../shared.js";

/**
 * Context snapshot captured at task creation time.
 * Records what the user was working on so the task remains actionable later.
 */
export const taskContextSchema = z.object({
	activeSlice: z.string().optional(),
	activeQuest: z.string().optional(),
	activeEpic: z.string().optional(),
	gitBranch: z.string().optional(),
	/** Free-text description of what the user was doing, e.g., "implementing slice foo-bar", "planning quest task-capture" */
	capturedDuring: z.string().optional(),
});
export type TaskContext = z.infer<typeof taskContextSchema>;

export const taskStatusSchema = z.enum(["open", "converted", "dropped"]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskConvertedToSchema = z.object({
	type: z.enum(["quest", "epic"]),
	name: z.string().min(1),
});
export type TaskConvertedTo = z.infer<typeof taskConvertedToSchema>;

export const taskSchema = z.object({
	name: z.string().min(1),
	title: z.string().min(1),
	status: taskStatusSchema,
	created: timestampSchema,
	context: taskContextSchema,
	convertedTo: taskConvertedToSchema.optional(),
	droppedReason: z.string().optional(),
	description: z.string().optional(),
});
export type Task = z.infer<typeof taskSchema>;
