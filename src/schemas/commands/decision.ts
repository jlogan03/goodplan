import { z } from "zod";
import { decisionStatusValues } from "../records/decision.js";

/**
 * Zod schemas for decision command stdin inputs.
 * Validated at the CLI boundary before routing to RPC.
 */

/** decision:create — stdin: { id, domain, title, summary, entityPath?, reconsiderWhen? } */
export const createDecisionInputSchema = z.object({
	id: z.string().min(1, "id is required"),
	domain: z.string().min(1, "domain is required"),
	title: z.string().min(1, "title is required"),
	summary: z.string().min(1, "summary is required"),
	entityPath: z.string().min(1).optional(),
	reconsiderWhen: z.array(z.string().min(1)).optional(),
});
export type CreateDecisionInput = z.infer<typeof createDecisionInputSchema>;

/** decision:update — stdin: { changes } with optional id (--id flag is authoritative) */
export const updateDecisionInputSchema = z.object({
	id: z.string().optional(),
	changes: z.object({
		status: z.enum(decisionStatusValues).optional(),
		domain: z.string().min(1).optional(),
		title: z.string().min(1).optional(),
		summary: z.string().min(1).optional(),
		supersededBy: z.string().nullable().optional(),
	}),
});
export type UpdateDecisionInput = z.infer<typeof updateDecisionInputSchema>;
