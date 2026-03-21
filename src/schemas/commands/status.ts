import { z } from "zod";
import { versionSchema } from "../shared.js";

/**
 * Schema for the status command result.
 *
 * activeEpic, activeSlice, and activeQuest are projections that require entity
 * lookup. In slice 01 (tracer bullet), these are always null because entity
 * files (epic.json, slice.json, quest.json) don't exist yet. They will be
 * populated once entity CRUD is implemented in later slices.
 */

const activeEntityProjection = z
	.object({
		name: z.string(),
		status: z.string(),
		phase: z.string().nullable(),
	})
	.nullable();

export const statusResultSchema = z.object({
	project: z.object({
		name: z.string(),
		version: versionSchema,
	}),
	activeEpic: activeEntityProjection,
	activeSlice: activeEntityProjection,
	activeQuest: activeEntityProjection,
	artifacts: z.record(z.string(), z.unknown()),
	recommendations: z.array(z.string()),
	warnings: z.array(z.string()),
});

export type StatusResult = z.infer<typeof statusResultSchema>;
