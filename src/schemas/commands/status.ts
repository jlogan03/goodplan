import { z } from "zod";
import { versionSchema } from "../shared.js";

/**
 * Projection of an active entity (epic, slice, quest) for status display.
 * Nullable — null means no active entity of that type.
 */
const activeEntityProjection = z
	.object({
		name: z.string(),
		status: z.string(),
	})
	.nullable();

/**
 * Artifact counts — all fields required with default 0 to satisfy
 * exactOptionalPropertyTypes (no `undefined` vs optional ambiguity).
 */
const artifactsSchema = z.object({
	architectureFiles: z.number().int().nonnegative().default(0),
	researchFiles: z.number().int().nonnegative().default(0),
	brainstormFiles: z.number().int().nonnegative().default(0),
	prototypeFiles: z.number().int().nonnegative().default(0),
	decisions: z.number().int().nonnegative().default(0),
	learnings: z.number().int().nonnegative().default(0),
	completedSlices: z.number().int().nonnegative().default(0),
	totalSlices: z.number().int().nonnegative().default(0),
});

export const statusResultSchema = z.object({
	project: z.object({
		name: z.string(),
		version: versionSchema,
	}),
	activeEpic: activeEntityProjection,
	activeSlice: activeEntityProjection,
	activeQuest: activeEntityProjection,
	artifacts: artifactsSchema,
	recommendations: z.array(z.string()),
	warnings: z.array(z.string()),
});

export type StatusResult = z.infer<typeof statusResultSchema>;
export type Artifacts = z.infer<typeof artifactsSchema>;
