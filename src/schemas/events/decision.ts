import { z } from "zod";

// ── Decision event payload schemas ─────────────────────────
// v2 event-based replacements that coexist with v1 RPC commands.

/**
 * `decision-recorded` — v2 event-based decision creation.
 * Emitted by `gp decision:record`.
 */
export const decisionRecordedPayloadSchema = z.object({
	id: z.string().min(1),
	domain: z.string().min(1),
	title: z.string().min(1),
	summary: z.string().min(1),
	entityPath: z.string().min(1).optional(),
	reconsiderWhen: z.string().min(1).optional(),
});
export type DecisionRecordedPayload = z.infer<typeof decisionRecordedPayloadSchema>;

/**
 * `decision-superseded` — mark a decision as superseded.
 * Emitted by `gp decision:supersede`.
 */
export const decisionSupersededPayloadSchema = z.object({
	decisionId: z.string().min(1),
	reason: z.string().min(1),
	supersededBy: z.string().min(1).optional(),
});
export type DecisionSupersededPayload = z.infer<typeof decisionSupersededPayloadSchema>;

// ── Event map ──────────────────────────────────────────────

export const DecisionEventMap = {
	"decision-recorded": decisionRecordedPayloadSchema,
	"decision-superseded": decisionSupersededPayloadSchema,
} as const;

export type DecisionEventType = keyof typeof DecisionEventMap;
export type DecisionEventPayload = DecisionRecordedPayload | DecisionSupersededPayload;
