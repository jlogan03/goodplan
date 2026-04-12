import { z } from "zod";
import { SteeringPreferenceSchema } from "../entities/derived-state.js";

/**
 * Payload schema for the `project-initialized` event.
 *
 * Emitted exactly once per project scope event log, as the first event.
 * The invariant `project.exists` enforces this constraint.
 */
export const projectInitializedPayloadSchema = z.object({
	name: z.string().min(1),
});

export type ProjectInitializedPayload = z.infer<typeof projectInitializedPayloadSchema>;

/**
 * Payload schema for the `steering-preference-set` event (project scope).
 *
 * Reuses `SteeringPreferenceSchema` from derived-state to stay DRY.
 * The existing `reducePauseSteering` already handles this event type.
 */
export const steeringPreferenceSetPayloadSchema = z.object({
	preference: SteeringPreferenceSchema,
});

export type SteeringPreferenceSetPayload = z.infer<typeof steeringPreferenceSetPayloadSchema>;

// --- ProjectEventMap ---

/**
 * Mapped type for all project-scope event types and their payload schemas.
 * The envelope `type` field serves as the discriminant.
 */
export const ProjectEventMap = {
	"project-initialized": projectInitializedPayloadSchema,
	"steering-preference-set": steeringPreferenceSetPayloadSchema,
} as const;

/** Union of all project event type strings. */
export type ProjectEventType = keyof typeof ProjectEventMap;

/** Inferred payload type for a given project event type. */
export type ProjectEventPayload<T extends ProjectEventType> = z.infer<(typeof ProjectEventMap)[T]>;
