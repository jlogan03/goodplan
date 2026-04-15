import { z } from "zod";

// --- Event payload schemas ---

/**
 * Payload for `briefing-written` events.
 * Structured to align with BriefingExtract from the architecture.
 * Scope and scopeRef are envelope-level fields, not payload fields.
 */
export const briefingWrittenPayloadSchema = z.object({
	timeContext: z.string().min(1),
	currentPosition: z.string().min(1),
	lastAction: z.string().min(1),
	whereStopped: z.string().min(1),
	nextAction: z.string().min(1),
	attentionItems: z.array(z.string()),
	deepLinks: z
		.array(
			z.object({
				label: z.string().min(1),
				path: z.string().min(1),
			}),
		)
		.optional(),
});
export type BriefingWrittenPayload = z.infer<typeof briefingWrittenPayloadSchema>;

// --- BriefingEventMap ---

/**
 * Mapped type for all briefing event types and their payload schemas.
 * The envelope `type` field serves as the discriminant.
 */
export const BriefingEventMap = {
	"briefing-written": briefingWrittenPayloadSchema,
} as const;

/** Union of all briefing event type strings. */
export type BriefingEventType = keyof typeof BriefingEventMap;

/** Inferred payload type for a given briefing event type. */
export type BriefingEventPayload<T extends BriefingEventType> = z.infer<
	(typeof BriefingEventMap)[T]
>;
