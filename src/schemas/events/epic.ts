import { z } from "zod";
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

// --- Phase 3 payload schemas (stubs for EpicEventMap completeness) ---
// These will be filled in during Phase 3 implementation.

export const epicGoalDraftedPayloadSchema = z.object({
	goal: ContentRefSchema,
});
export type EpicGoalDraftedPayload = z.infer<typeof epicGoalDraftedPayloadSchema>;

export const epicGoalCommittedPayloadSchema = z.object({
	goal: ContentRefSchema,
});
export type EpicGoalCommittedPayload = z.infer<typeof epicGoalCommittedPayloadSchema>;

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
 * Phases 3-4 will extend this map with additional event types.
 */
export const EpicEventMap = {
	"epic-created": epicCreatedPayloadSchema,
	"epic-abandoned": epicAbandonedPayloadSchema,
	"epic-goal-drafted": epicGoalDraftedPayloadSchema,
	"epic-goal-committed": epicGoalCommittedPayloadSchema,
	"epic-activated": epicActivatedPayloadSchema,
	"epic-completed": epicCompletedPayloadSchema,
	"epic-paused": epicPausedPayloadSchema,
	"epic-resumed": epicResumedPayloadSchema,
} as const;

/** Union of all epic event type strings. */
export type EpicEventType = keyof typeof EpicEventMap;

/** Inferred payload type for a given epic event type. */
export type EpicEventPayload<T extends EpicEventType> = z.infer<(typeof EpicEventMap)[T]>;
