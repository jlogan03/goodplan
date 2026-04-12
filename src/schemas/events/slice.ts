import { z } from "zod";

// --- Phase 1 payload schemas (management commands) ---

/**
 * Payload for `slice-created` events.
 * All slice event payloads include `sliceRef` for replay disambiguation.
 */
export const sliceCreatedPayloadSchema = z.object({
	sliceRef: z.string().min(1),
	directory: z.string().min(1),
	goal: z.string().optional(),
});
export type SliceCreatedPayload = z.infer<typeof sliceCreatedPayloadSchema>;

/**
 * Payload for `slice-abandoned` events.
 */
export const sliceAbandonedPayloadSchema = z.object({
	sliceRef: z.string().min(1),
	reason: z.string().min(1),
});
export type SliceAbandonedPayload = z.infer<typeof sliceAbandonedPayloadSchema>;

// --- Phase 2 placeholder payload schemas (planning commands) ---
// These will be fully defined in Phase 2 of this slice.

// slicePlanDraftedPayloadSchema — placeholder
// slicePlanCommittedPayloadSchema — placeholder
// planShapeCheckpointReachedPayloadSchema — placeholder
// planShapeRevisionProposedPayloadSchema — placeholder
// planShapeApprovedPayloadSchema — placeholder
// planShapeCheckpointAutoShapedPayloadSchema — placeholder

// --- Phase 3 placeholder payload schemas (implementation commands) ---
// These will be fully defined in Phase 3 of this slice.

// sliceImplementationStartedPayloadSchema — placeholder
// sliceImplementationChunkStartedPayloadSchema — placeholder
// etc.

// --- SliceEventMap: maps event type strings to payload schemas ---

/**
 * Mapped type for all slice event types and their payload schemas.
 * The envelope `type` field serves as the discriminant (no `_type` in payloads).
 * All events use `domain: "entity-lifecycle"` per conventions.md.
 */
export const SliceEventMap = {
	// Phase 1
	"slice-created": sliceCreatedPayloadSchema,
	"slice-abandoned": sliceAbandonedPayloadSchema,
} as const;

/** Union of all slice event type strings. */
export type SliceEventType = keyof typeof SliceEventMap;

/** Inferred payload type for a given slice event type. */
export type SliceEventPayload<T extends SliceEventType> = z.infer<(typeof SliceEventMap)[T]>;
