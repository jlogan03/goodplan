import { z } from "zod";
import { SteeringPreferenceSchema } from "../entities/derived-state.js";
import { ContentRefSchema } from "../envelope.js";

// --- Phase 2 payload schemas ---

/**
 * Payload for `epic-created` events.
 * Field name: `directory` (standardized for v2; no backward compat needed).
 */
export const epicCreatedPayloadSchema = z.object({
	directory: z.string().min(1),
});
export type EpicCreatedPayload = z.infer<typeof epicCreatedPayloadSchema>;

/**
 * Payload for `epic-abandoned` events.
 */
export const epicAbandonedPayloadSchema = z.object({
	reason: z.string().min(1),
});
export type EpicAbandonedPayload = z.infer<typeof epicAbandonedPayloadSchema>;

// --- Phase 3 payload schemas ---

export const epicGoalDraftedPayloadSchema = z.object({
	goal: ContentRefSchema,
});
export type EpicGoalDraftedPayload = z.infer<typeof epicGoalDraftedPayloadSchema>;

export const epicGoalCommittedPayloadSchema = z.object({
	goal: ContentRefSchema,
});
export type EpicGoalCommittedPayload = z.infer<typeof epicGoalCommittedPayloadSchema>;

export const explorationCycleStartedPayloadSchema = z.object({
	cycleNumber: z.number().int().positive(),
});
export type ExplorationCycleStartedPayload = z.infer<typeof explorationCycleStartedPayloadSchema>;

export const explorationConcludedPayloadSchema = z.object({
	summary: ContentRefSchema,
});
export type ExplorationConcludedPayload = z.infer<typeof explorationConcludedPayloadSchema>;

export const researchCapturedPayloadSchema = z.object({
	contentRef: ContentRefSchema,
	title: z.string().min(1),
});
export type ResearchCapturedPayload = z.infer<typeof researchCapturedPayloadSchema>;

export const brainstormCapturedPayloadSchema = z.object({
	contentRef: ContentRefSchema,
	title: z.string().min(1),
});
export type BrainstormCapturedPayload = z.infer<typeof brainstormCapturedPayloadSchema>;

export const architectureTargetDraftedPayloadSchema = z.object({
	architectureTarget: ContentRefSchema,
});
export type ArchitectureTargetDraftedPayload = z.infer<
	typeof architectureTargetDraftedPayloadSchema
>;

export const architectureTargetCommittedPayloadSchema = z.object({
	architectureTarget: ContentRefSchema,
});
export type ArchitectureTargetCommittedPayload = z.infer<
	typeof architectureTargetCommittedPayloadSchema
>;

export const architectureShapeCheckpointReachedPayloadSchema = z.object({});
export type ArchitectureShapeCheckpointReachedPayload = z.infer<
	typeof architectureShapeCheckpointReachedPayloadSchema
>;

export const architectureShapeApprovedPayloadSchema = z.object({});
export type ArchitectureShapeApprovedPayload = z.infer<
	typeof architectureShapeApprovedPayloadSchema
>;

export const architectureShapeCheckpointAutoShapedPayloadSchema = z.object({
	preference: SteeringPreferenceSchema,
});
export type ArchitectureShapeCheckpointAutoShapedPayload = z.infer<
	typeof architectureShapeCheckpointAutoShapedPayloadSchema
>;

// --- Phase 4 payload schemas (stubs for EpicEventMap completeness) ---

export const epicActivatedPayloadSchema = z.object({});
export type EpicActivatedPayload = z.infer<typeof epicActivatedPayloadSchema>;

export const epicCompletedPayloadSchema = z.object({});
export type EpicCompletedPayload = z.infer<typeof epicCompletedPayloadSchema>;

export const epicPausedPayloadSchema = z.object({});
export type EpicPausedPayload = z.infer<typeof epicPausedPayloadSchema>;

export const epicResumedPayloadSchema = z.object({});
export type EpicResumedPayload = z.infer<typeof epicResumedPayloadSchema>;

// --- EpicEventMap: maps event type strings to payload schemas ---

/**
 * Mapped type for all epic event types and their payload schemas.
 * The envelope `type` field serves as the discriminant (no `_type` in payloads).
 * Phase 4 will extend this map with additional event types.
 */
export const EpicEventMap = {
	// Phase 2
	"epic-created": epicCreatedPayloadSchema,
	"epic-abandoned": epicAbandonedPayloadSchema,
	// Phase 3
	"epic-goal-drafted": epicGoalDraftedPayloadSchema,
	"epic-goal-committed": epicGoalCommittedPayloadSchema,
	"exploration-cycle-started": explorationCycleStartedPayloadSchema,
	"exploration-concluded": explorationConcludedPayloadSchema,
	"research-captured": researchCapturedPayloadSchema,
	"brainstorm-captured": brainstormCapturedPayloadSchema,
	"architecture-target-drafted": architectureTargetDraftedPayloadSchema,
	"architecture-target-committed": architectureTargetCommittedPayloadSchema,
	"architecture-shape-checkpoint-reached": architectureShapeCheckpointReachedPayloadSchema,
	"architecture-shape-approved": architectureShapeApprovedPayloadSchema,
	"architecture-shape-checkpoint-auto-shaped": architectureShapeCheckpointAutoShapedPayloadSchema,
	// Phase 4 (stubs)
	"epic-activated": epicActivatedPayloadSchema,
	"epic-completed": epicCompletedPayloadSchema,
	"epic-paused": epicPausedPayloadSchema,
	"epic-resumed": epicResumedPayloadSchema,
} as const;

/** Union of all epic event type strings. */
export type EpicEventType = keyof typeof EpicEventMap;

/** Inferred payload type for a given epic event type. */
export type EpicEventPayload<T extends EpicEventType> = z.infer<(typeof EpicEventMap)[T]>;
