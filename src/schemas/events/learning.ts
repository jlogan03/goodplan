import { z } from "zod";

// ── Learning event payload schemas ─────────────────────────
// v2 event-based replacements that coexist with v1 RPC commands.

/**
 * `learning-captured` — capture a learning at a given scope.
 * Emitted by `gp learning:capture`.
 */
export const learningCapturedPayloadSchema = z.object({
	summary: z.string().min(1),
	scope: z.enum(["slice", "epic", "project"]).optional(),
	tags: z.array(z.string().min(1)).optional(),
});
export type LearningCapturedPayload = z.infer<typeof learningCapturedPayloadSchema>;

/**
 * `learning-promoted` — promote a learning from one scope to another.
 * Emitted by `gp learning:promote`.
 */
export const learningPromotedPayloadSchema = z.object({
	learningId: z.string().min(1),
	from: z.string().min(1),
	to: z.string().min(1),
});
export type LearningPromotedPayload = z.infer<typeof learningPromotedPayloadSchema>;

// ── Event map ──────────────────────────────────────────────

export const LearningEventMap = {
	"learning-captured": learningCapturedPayloadSchema,
	"learning-promoted": learningPromotedPayloadSchema,
} as const;

export type LearningEventType = keyof typeof LearningEventMap;
export type LearningEventPayload = LearningCapturedPayload | LearningPromotedPayload;
