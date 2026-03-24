/**
 * Artifact flag schemas for `show --json` output.
 *
 * ArtifactFlags is a computed projection that only appears in command output,
 * never persisted. Follows precedent of `statusResultSchema` in status.ts.
 */

import { z } from "zod";

// TODO: These schemas define the `show --json` output shape but are not yet
// wired into runtime output validation. Output schema exposure via the
// `schema --command` command is deferred to a later slice (no `outputSchema`
// field exists on the schema command yet — INV-006 currently covers args and
// stdin schemas only).

/**
 * Artifact flags for slice and quest entities.
 * Boolean indicators of which workflow artifacts exist.
 */
export const sliceArtifactFlagsSchema = z.object({
	abandoned: z.boolean(),
	exploreComplete: z.boolean(),
	goal: z.boolean(),
	implementation: z.boolean(),
	plan: z.boolean(),
	planRefined: z.boolean(),
});
export type SliceArtifactFlagsOutput = z.infer<typeof sliceArtifactFlagsSchema>;

/**
 * Artifact flags for epic entities.
 * Epic-specific fields: architectureDefined, slicesDefined.
 * plan/planRefined/implementation are always false (slice-level artifacts).
 */
export const epicArtifactFlagsSchema = z.object({
	abandoned: z.boolean(),
	architectureDefined: z.boolean(),
	exploreComplete: z.boolean(),
	goal: z.boolean(),
	implementation: z.literal(false),
	plan: z.literal(false),
	planRefined: z.literal(false),
	slicesDefined: z.boolean(),
});
export type EpicArtifactFlagsOutput = z.infer<typeof epicArtifactFlagsSchema>;
