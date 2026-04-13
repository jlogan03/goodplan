import { z } from "zod";

// --- Reshape event payload schemas ---

/**
 * Payload for `reshape-proposed` events.
 * Emitted when a reshape of the current plan/architecture is proposed.
 */
export const reshapeProposedPayloadSchema = z.object({
	description: z.string().min(1),
});
export type ReshapeProposedPayload = z.infer<typeof reshapeProposedPayloadSchema>;

// --- ReshapeEventMap ---

export const ReshapeEventMap = {
	"reshape-proposed": reshapeProposedPayloadSchema,
} as const;

/** Union of all reshape event type strings. */
export type ReshapeEventType = keyof typeof ReshapeEventMap;

/** Inferred payload type for a given reshape event type. */
export type ReshapeEventPayload<T extends ReshapeEventType> = z.infer<
	(typeof ReshapeEventMap)[T]
>;
