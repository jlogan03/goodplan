import { z } from "zod";
import { SteeringPreferenceSchema } from "../entities/derived-state.js";
import { ContentRefSchema } from "../envelope.js";
import { planExtractSchema } from "../trust/extracts.js";

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

// --- Phase 2 payload schemas (planning commands) ---

/**
 * Payload for `slice-plan-drafted` events.
 * Plan content is stored as a ContentRef (blob written before event append).
 */
export const slicePlanDraftedPayloadSchema = z.object({
	sliceRef: z.string().min(1),
	plan: ContentRefSchema,
});
export type SlicePlanDraftedPayload = z.infer<typeof slicePlanDraftedPayloadSchema>;

/**
 * Payload for `slice-plan-committed` events.
 * Includes both the plan ContentRef and the extracted plan structure.
 */
export const slicePlanCommittedPayloadSchema = z.object({
	sliceRef: z.string().min(1),
	plan: ContentRefSchema,
	extract: planExtractSchema,
});
export type SlicePlanCommittedPayload = z.infer<typeof slicePlanCommittedPayloadSchema>;

/**
 * Payload for `plan-shape-checkpoint-reached` events.
 * Includes the current plan ContentRef for shape review context.
 */
export const planShapeCheckpointReachedPayloadSchema = z.object({
	sliceRef: z.string().min(1),
	plan: ContentRefSchema,
});
export type PlanShapeCheckpointReachedPayload = z.infer<
	typeof planShapeCheckpointReachedPayloadSchema
>;

/**
 * Payload for `plan-shape-revision-proposed` events.
 * `plan` is the full post-revision content as ContentRef (not a diff).
 * `revision` is prose describing what changed.
 */
export const planShapeRevisionProposedPayloadSchema = z.object({
	sliceRef: z.string().min(1),
	plan: ContentRefSchema,
	revision: z.string().min(1),
});
export type PlanShapeRevisionProposedPayload = z.infer<
	typeof planShapeRevisionProposedPayloadSchema
>;

/**
 * Payload for `plan-shape-approved` events.
 */
export const planShapeApprovedPayloadSchema = z.object({
	sliceRef: z.string().min(1),
});
export type PlanShapeApprovedPayload = z.infer<typeof planShapeApprovedPayloadSchema>;

/**
 * Payload for `plan-shape-checkpoint-auto-shaped` events.
 * Uses `preference` field name matching the epic pattern.
 */
export const planShapeCheckpointAutoShapedPayloadSchema = z.object({
	sliceRef: z.string().min(1),
	preference: SteeringPreferenceSchema,
});
export type PlanShapeCheckpointAutoShapedPayload = z.infer<
	typeof planShapeCheckpointAutoShapedPayloadSchema
>;

// --- Phase 3 payload schemas (implementation & chunk commands) ---

/**
 * Shared ref schema for all chunk event payloads.
 * Prevents drift across 8 chunk-related schemas.
 */
export const SliceChunkRefSchema = z.object({
	sliceRef: z.string().min(1),
	chunkId: z.string().min(1),
});
export type SliceChunkRef = z.infer<typeof SliceChunkRefSchema>;

/**
 * Payload for `slice-implementation-started` events.
 */
export const sliceImplementationStartedPayloadSchema = z.object({
	sliceRef: z.string().min(1),
});
export type SliceImplementationStartedPayload = z.infer<
	typeof sliceImplementationStartedPayloadSchema
>;

/**
 * Payload for `slice-implementation-chunk-started` events.
 */
export const chunkStartedPayloadSchema = z.object({
	...SliceChunkRefSchema.shape,
	description: z.string().min(1),
});
export type ChunkStartedPayload = z.infer<typeof chunkStartedPayloadSchema>;

/**
 * Payload for `chunk-red-test-written` events.
 */
export const chunkRedTestWrittenPayloadSchema = z.object({
	...SliceChunkRefSchema.shape,
	testRef: ContentRefSchema,
});
export type ChunkRedTestWrittenPayload = z.infer<typeof chunkRedTestWrittenPayloadSchema>;

/**
 * Payload for `chunk-red-test-failed` events.
 */
export const chunkRedTestFailedPayloadSchema = z.object({
	...SliceChunkRefSchema.shape,
	evidence: z.string().min(1),
});
export type ChunkRedTestFailedPayload = z.infer<typeof chunkRedTestFailedPayloadSchema>;

/**
 * Payload for `chunk-green-achieved` events.
 */
export const chunkGreenAchievedPayloadSchema = z.object({
	...SliceChunkRefSchema.shape,
	evidence: z.string().min(1),
});
export type ChunkGreenAchievedPayload = z.infer<typeof chunkGreenAchievedPayloadSchema>;

/**
 * Payload for `chunk-verified` events.
 */
export const chunkVerifiedPayloadSchema = z.object({
	...SliceChunkRefSchema.shape,
	evidence: z.string().min(1),
});
export type ChunkVerifiedPayload = z.infer<typeof chunkVerifiedPayloadSchema>;

/**
 * Payload for `chunk-unverifiable` events.
 */
export const chunkUnverifiablePayloadSchema = z.object({
	...SliceChunkRefSchema.shape,
	reason: z.string().min(1),
});
export type ChunkUnverifiablePayload = z.infer<typeof chunkUnverifiablePayloadSchema>;

/**
 * Payload for `chunk-unverifiable-decided` events.
 */
export const chunkUnverifiableDecidedPayloadSchema = z.object({
	...SliceChunkRefSchema.shape,
	decision: z.enum(["accept", "revert", "defer"]),
	reason: z.string().min(1),
});
export type ChunkUnverifiableDecidedPayload = z.infer<typeof chunkUnverifiableDecidedPayloadSchema>;

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
	// Phase 2
	"slice-plan-drafted": slicePlanDraftedPayloadSchema,
	"slice-plan-committed": slicePlanCommittedPayloadSchema,
	"plan-shape-checkpoint-reached": planShapeCheckpointReachedPayloadSchema,
	"plan-shape-revision-proposed": planShapeRevisionProposedPayloadSchema,
	"plan-shape-approved": planShapeApprovedPayloadSchema,
	"plan-shape-checkpoint-auto-shaped": planShapeCheckpointAutoShapedPayloadSchema,
	// Phase 3
	"slice-implementation-started": sliceImplementationStartedPayloadSchema,
	"slice-implementation-chunk-started": chunkStartedPayloadSchema,
	"chunk-red-test-written": chunkRedTestWrittenPayloadSchema,
	"chunk-red-test-failed": chunkRedTestFailedPayloadSchema,
	"chunk-green-achieved": chunkGreenAchievedPayloadSchema,
	"chunk-verified": chunkVerifiedPayloadSchema,
	"chunk-unverifiable": chunkUnverifiablePayloadSchema,
	"chunk-unverifiable-decided": chunkUnverifiableDecidedPayloadSchema,
} as const;

/** Union of all slice event type strings. */
export type SliceEventType = keyof typeof SliceEventMap;

/** Inferred payload type for a given slice event type. */
export type SliceEventPayload<T extends SliceEventType> = z.infer<(typeof SliceEventMap)[T]>;
