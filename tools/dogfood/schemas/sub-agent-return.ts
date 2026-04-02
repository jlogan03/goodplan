/**
 * Zod schema for the sub-agent return format.
 *
 * Canonical shape defined in:
 *   skills/_shared/references/sub-agent-return-format.md
 *
 * Keep in sync — the markdown file has a sync comment pointing here.
 */

import { z } from "zod";

const triggeredConditionSchema = z.object({
	entityType: z.string(),
	title: z.string(),
	condition: z.string(),
});

const questionSchema = z.object({
	question: z.string(),
	context: z.string(),
});

const researchTopicSchema = z.object({
	topic: z.string(),
	context: z.string(),
});

export const subAgentReturnSchema = z.object({
	/** Outcome of the agent's work */
	status: z.union([z.literal("SUCCESS"), z.literal("PARTIAL"), z.literal("FAILED")]),

	/** One-line description for orchestrator logging */
	summary: z.string(),

	/** Paths written by this agent (empty array if none) */
	filesWritten: z.array(z.string()),

	/** 1-10 score (reviewer and synthesis agents) */
	score: z.number().int().min(1).max(10).optional(),

	/** Selected reviewer names (refinement-coordinator only) */
	reviewers: z.array(z.string()).optional(),

	/** Decisions/learnings whose conditions were triggered */
	triggeredConditions: z.array(triggeredConditionSchema).optional(),

	/** Questions for the user (PARTIAL status only) */
	questions: z.array(questionSchema).optional(),

	/** Topics to research (PARTIAL status only) */
	researchTopics: z.array(researchTopicSchema).optional(),

	/** Path to continuation file (PARTIAL status only) */
	continuationFile: z.string().optional(),

	/** Full review text (reviewer agents — orchestrator writes to file) */
	review: z.string().optional(),
});

export type SubAgentReturn = z.infer<typeof subAgentReturnSchema>;
