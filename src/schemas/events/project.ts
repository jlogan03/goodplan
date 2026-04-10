import { z } from "zod";

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
