import { z } from "zod";

// --- Milestone event payload schemas ---

/**
 * Payload for `milestone-committed` events.
 * Emitted when a milestone checkpoint is committed.
 */
export const milestoneCommittedPayloadSchema = z.object({
	message: z.string().min(1),
});
export type MilestoneCommittedPayload = z.infer<typeof milestoneCommittedPayloadSchema>;

// --- MilestoneEventMap ---

export const MilestoneEventMap = {
	"milestone-committed": milestoneCommittedPayloadSchema,
} as const;

/** Union of all milestone event type strings. */
export type MilestoneEventType = keyof typeof MilestoneEventMap;

/** Inferred payload type for a given milestone event type. */
export type MilestoneEventPayload<T extends MilestoneEventType> = z.infer<
	(typeof MilestoneEventMap)[T]
>;
