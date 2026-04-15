import { z } from "zod";

/**
 * Schema for deferred items captured at slice landing.
 * These are work items that were identified during implementation but
 * deferred to future slices, side-quests, or tasks.
 */
export const DeferredItemSchema = z.object({
	type: z.enum(["task", "slice", "side-quest"]),
	title: z.string().min(1),
	description: z.string().optional(),
	epic: z.string().optional(),
});
export type DeferredItem = z.infer<typeof DeferredItemSchema>;

/**
 * Schema for architecture delta entries captured at slice landing.
 * Records how the slice changed architectural subsystems.
 * Stored in the event payload for downstream `epic:complete` replay.
 */
export const ArchitectureDeltaSchema = z.object({
	subsystem: z.string().min(1),
	change: z.string().min(1),
	reason: z.string().optional(),
});
export type ArchitectureDelta = z.infer<typeof ArchitectureDeltaSchema>;
