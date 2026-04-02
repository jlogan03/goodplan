import { z } from "zod";
import { timestampSchema } from "../shared.js";

export const overviewItemSchema = z.object({
	name: z.string().min(1),
	status: z.string().min(1),
	epic: z.string().min(1).optional(),
	title: z.string().min(1).optional(),
	created: timestampSchema,
	completed: timestampSchema.nullable(),
});
export type OverviewItem = z.infer<typeof overviewItemSchema>;

// ── Slice overview item ────

/** Slice overview item — derives from overviewItemSchema minus epic/title (path encodes epic; slices have no title). */
export const sliceOverviewItemSchema = overviewItemSchema.omit({ epic: true, title: true });
export type SliceOverviewItem = z.infer<typeof sliceOverviewItemSchema>;

// ── Epic overview item (with embedded slices) ────

export const epicOverviewItemSchema = overviewItemSchema.extend({
	slices: z.array(sliceOverviewItemSchema).default([]),
});
export type EpicOverviewItem = z.infer<typeof epicOverviewItemSchema>;

// ── Unified overview (single overview.json at root) ────

export const unifiedOverviewSchema = z.object({
	epics: z.array(epicOverviewItemSchema),
	quests: z.array(overviewItemSchema),
	tasks: z.array(overviewItemSchema),
});
export type UnifiedOverview = z.infer<typeof unifiedOverviewSchema>;
