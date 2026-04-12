import { z } from "zod";

// --- Finding event payload schemas ---

/**
 * Payload for `finding-captured` events (epic scope, domain: "entity-lifecycle").
 * Structured to align with `FindingExtract` from the architecture (trust.md extractor spec).
 * Uses `findingId` and `summary` to match the existing `reduceEntityLifecycle` handler.
 */
export const findingCapturedPayloadSchema = z.object({
	findingId: z.string().uuid(),
	summary: z.string().min(1),
	severity: z.enum(["blocking", "critical", "important", "minor"]),
	classification: z.object({
		blocking: z.boolean(),
		inScope: z.boolean(),
	}),
	relatedSubsystems: z.array(z.string()).optional(),
	reshape: z.boolean().optional(),
	context: z.string().optional(),
	sliceRef: z.string().optional(),
});
export type FindingCapturedPayload = z.infer<typeof findingCapturedPayloadSchema>;

/**
 * Payload for `finding-triaged` events (epic scope, domain: "entity-lifecycle").
 * Updates disposition of an existing finding in `epic.findings`.
 */
export const findingTriagedPayloadSchema = z.object({
	findingId: z.string().uuid(),
	disposition: z.enum(["accepted", "dismissed", "deferred"]),
	reason: z.string().min(1),
});
export type FindingTriagedPayload = z.infer<typeof findingTriagedPayloadSchema>;

// --- FindingEventMap ---

/**
 * Mapped type for finding event types and their payload schemas.
 * These events use domain "entity-lifecycle" and are epic-scoped.
 */
export const FindingEventMap = {
	"finding-captured": findingCapturedPayloadSchema,
	"finding-triaged": findingTriagedPayloadSchema,
} as const;

/** Union of all finding event type strings. */
export type FindingEventType = keyof typeof FindingEventMap;

/** Inferred payload type for a given finding event type. */
export type FindingEventPayload<T extends FindingEventType> = z.infer<(typeof FindingEventMap)[T]>;
