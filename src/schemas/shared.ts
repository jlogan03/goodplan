import { z } from "zod";

/** ISO 8601 timestamp string */
export const timestampSchema = z.string().datetime();
export type Timestamp = z.infer<typeof timestampSchema>;

/** ISO 8601 timestamp with enforced ms precision (3 decimal places) — for event envelopes */
export const eventTimestampSchema = z.string().datetime({ precision: 3 });
export type EventTimestamp = z.infer<typeof eventTimestampSchema>;

/** Score entry for refinement rounds */
export const scoreEntrySchema = z.object({
	round: z.number().int().positive(),
	scores: z.record(z.string(), z.number()),
});
export type ScoreEntry = z.infer<typeof scoreEntrySchema>;

/** Refinement state tracking */
export const refinementSchema = z.object({
	round: z.number().int().positive(),
	maxRounds: z.number().int().positive(),
	scoreHistory: z.array(scoreEntrySchema),
});
export type Refinement = z.infer<typeof refinementSchema>;

/** Semver version string (e.g., "1.0.0") */
export const versionSchema = z
	.string()
	.regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, "Must be a valid semver string");
export type Version = z.infer<typeof versionSchema>;
