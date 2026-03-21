import { z } from "zod";

/** ISO 8601 timestamp string */
export const timestampSchema = z.string().datetime();
export type Timestamp = z.infer<typeof timestampSchema>;

/** Semver version string (e.g., "1.0.0") */
export const versionSchema = z
	.string()
	.regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, "Must be a valid semver string");
export type Version = z.infer<typeof versionSchema>;
