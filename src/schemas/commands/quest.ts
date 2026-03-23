import { z } from "zod";
import { architectureDeltaInputSchema } from "../records/architecture-delta.js";
import { learningInputSchema } from "../records/learning.js";

/**
 * Zod schemas for quest command stdin inputs.
 * Validated at the CLI boundary before routing to RPC.
 */

/**
 * quest:create — stdin {name, goal}. No --epic flag (quests are project-scoped).
 */
export const createQuestInputSchema = z.object({
	name: z.string().min(1, "name is required"),
	goal: z.string().min(1, "goal is required"),
});
export type CreateQuestInput = z.infer<typeof createQuestInputSchema>;

/**
 * quest:complete — merged from --quest flag + stdin JSON.
 * `quest`: comes from --quest flag.
 * `verificationPassed`: required boolean assertion.
 * `learnings`, `architectureDelta`: optional arrays from stdin.
 * No `deferred` (quests don't route deferred work).
 */
export const completeQuestInputSchema = z.object({
	quest: z.string().min(1, "quest is required"),
	verificationPassed: z.boolean({ error: "verificationPassed is required" }),
	learnings: z.array(learningInputSchema).optional(),
	architectureDelta: z.array(architectureDeltaInputSchema).optional(),
});
export type CompleteQuestInput = z.infer<typeof completeQuestInputSchema>;
