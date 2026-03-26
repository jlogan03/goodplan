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
 * Enriched artifact file info — count + file paths.
 * Files arrays use state-tree-relative paths (relative to `.project/`).
 * Changed in 1.0.0: replaces plain number counts (architectureFiles, researchFiles,
 * brainstormFiles, prototypeFiles) with { count, files } objects.
 */
const fileArtifactSchema = z.object({
	count: z.number().int().nonnegative(),
	files: z.array(z.string()),
});

/**
 * Artifact counts — all fields required with default values to satisfy
 * exactOptionalPropertyTypes (no `undefined` vs optional ambiguity).
 * Changed in 1.0.0: architecture, research, brainstorm, prototypes are now
 * { count, files } objects instead of plain numbers.
 */
const artifactsSchema = z.object({
	architecture: fileArtifactSchema.default({ count: 0, files: [] }),
	research: fileArtifactSchema.default({ count: 0, files: [] }),
	brainstorm: fileArtifactSchema.default({ count: 0, files: [] }),
	prototypes: fileArtifactSchema.default({ count: 0, files: [] }),
	decisions: z.number().int().nonnegative().default(0),
	learnings: z.number().int().nonnegative().default(0),
	completedSlices: z.number().int().nonnegative().default(0),
	totalSlices: z.number().int().nonnegative().default(0),
	openTasks: z.number().int().nonnegative().default(0),
	totalTasks: z.number().int().nonnegative().default(0),
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
