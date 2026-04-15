import { z } from "zod";

// --- Subsystem maturity enum ---

export const SubsystemMaturitySchema = z.enum(["experimental", "stable", "mature", "deprecated"]);
export type SubsystemMaturity = z.infer<typeof SubsystemMaturitySchema>;

// --- Event payload schemas ---

/**
 * Payload for `subsystem-registered` events.
 * Emitted when a new subsystem is registered at project scope.
 * The `owns` field contains file glob patterns for reviewer routing.
 */
export const subsystemRegisteredPayloadSchema = z.object({
	name: z.string().min(1),
	maturity: SubsystemMaturitySchema,
	owns: z.array(z.string()),
});
export type SubsystemRegisteredPayload = z.infer<typeof subsystemRegisteredPayloadSchema>;

/**
 * Payload for `subsystem-maturity-updated` events.
 */
export const subsystemMaturityUpdatedPayloadSchema = z.object({
	name: z.string().min(1),
	maturity: SubsystemMaturitySchema,
	previousMaturity: z.string(),
});
export type SubsystemMaturityUpdatedPayload = z.infer<typeof subsystemMaturityUpdatedPayloadSchema>;

/**
 * Payload for `subsystem-retired` events.
 */
export const subsystemRetiredPayloadSchema = z.object({
	name: z.string().min(1),
});
export type SubsystemRetiredPayload = z.infer<typeof subsystemRetiredPayloadSchema>;

// --- SubsystemEventMap ---

/**
 * Mapped type for all subsystem event types and their payload schemas.
 * The envelope `type` field serves as the discriminant.
 */
export const SubsystemEventMap = {
	"subsystem-registered": subsystemRegisteredPayloadSchema,
	"subsystem-maturity-updated": subsystemMaturityUpdatedPayloadSchema,
	"subsystem-retired": subsystemRetiredPayloadSchema,
} as const;

/** Union of all subsystem event type strings. */
export type SubsystemEventType = keyof typeof SubsystemEventMap;

/** Inferred payload type for a given subsystem event type. */
export type SubsystemEventPayload<T extends SubsystemEventType> = z.infer<
	(typeof SubsystemEventMap)[T]
>;
