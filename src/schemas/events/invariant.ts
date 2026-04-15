import { z } from "zod";

// --- Invariant event payload schemas ---

/**
 * Payload for `invariant-proposed` events (project scope, domain: "spine").
 * Proposes a new custom invariant rule.
 */
export const invariantProposedPayloadSchema = z.object({
	invariantId: z.string().min(1),
	description: z.string().min(1),
	type: z.literal("custom"),
	rule: z.string().optional(),
});
export type InvariantProposedPayload = z.infer<typeof invariantProposedPayloadSchema>;

/**
 * Payload for `invariant-activated` events (project scope, domain: "spine").
 * Activates a previously proposed custom invariant.
 */
export const invariantActivatedPayloadSchema = z.object({
	invariantId: z.string().min(1),
});
export type InvariantActivatedPayload = z.infer<typeof invariantActivatedPayloadSchema>;

/**
 * Payload for `invariant-deactivated` events (project scope, domain: "spine").
 * Deactivates a currently active custom invariant.
 */
export const invariantDeactivatedPayloadSchema = z.object({
	invariantId: z.string().min(1),
});
export type InvariantDeactivatedPayload = z.infer<typeof invariantDeactivatedPayloadSchema>;

// --- InvariantEventMap ---

/**
 * Mapped type for invariant event types and their payload schemas.
 * These events use domain "spine" and are project-scoped.
 */
export const InvariantEventMap = {
	"invariant-proposed": invariantProposedPayloadSchema,
	"invariant-activated": invariantActivatedPayloadSchema,
	"invariant-deactivated": invariantDeactivatedPayloadSchema,
} as const;

/** Union of all invariant event type strings. */
export type InvariantEventType = keyof typeof InvariantEventMap;

/** Inferred payload type for a given invariant event type. */
export type InvariantEventPayload<T extends InvariantEventType> = z.infer<
	(typeof InvariantEventMap)[T]
>;
