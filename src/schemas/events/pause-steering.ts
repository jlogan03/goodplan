import { z } from "zod";

// --- Pause-steering event payload schemas ---

/**
 * Payload for `pause-entered` events.
 * Emitted when a workflow pauses for steering input.
 */
export const pauseEnteredPayloadSchema = z.object({
	reason: z.string().min(1),
});
export type PauseEnteredPayload = z.infer<typeof pauseEnteredPayloadSchema>;

// --- PauseSteeringEventMap ---

export const PauseSteeringEventMap = {
	"pause-entered": pauseEnteredPayloadSchema,
} as const;

/** Union of all pause-steering event type strings. */
export type PauseSteeringEventType = keyof typeof PauseSteeringEventMap;

/** Inferred payload type for a given pause-steering event type. */
export type PauseSteeringEventPayload<T extends PauseSteeringEventType> = z.infer<
	(typeof PauseSteeringEventMap)[T]
>;
