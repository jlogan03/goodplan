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

export const overviewSchema = z.object({
	items: z.array(overviewItemSchema),
});
export type Overview = z.infer<typeof overviewSchema>;

// ── Epic overview (consolidated with embedded slices) ────

/** Slice overview item — derives from overviewItemSchema minus epic/title (path encodes epic; slices have no title). */
export const sliceOverviewItemSchema = overviewItemSchema.omit({ epic: true, title: true });
export type SliceOverviewItem = z.infer<typeof sliceOverviewItemSchema>;

export const epicOverviewItemSchema = overviewItemSchema.extend({
	slices: z.array(sliceOverviewItemSchema).default([]),
});
export type EpicOverviewItem = z.infer<typeof epicOverviewItemSchema>;

export const epicOverviewSchema = z.object({
	items: z.array(epicOverviewItemSchema),
});
export type EpicOverview = z.infer<typeof epicOverviewSchema>;
