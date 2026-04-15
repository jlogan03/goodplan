/**
 * Artifact detection for entity directories.
 *
 * Pure function interpreting the state tree — no I/O.
 * Consumed by the Commands layer only (`show --json` output).
 * Must NOT be imported by the state machine.
 */

import type {
	EpicArtifactFlagsOutput,
	SliceArtifactFlagsOutput,
} from "../schemas/commands/artifacts.js";
import type { DirectoryEntry } from "./tree.js";

// ── Result types ─────────────────────────────────────────────
// Derived from Zod schemas (single source of truth) in schemas/commands/artifacts.ts.

export type SliceArtifactFlags = SliceArtifactFlagsOutput;
export type EpicArtifactFlags = EpicArtifactFlagsOutput;

// ── Overloaded signatures ────────────────────────────────────

const EMPTY_DIR: DirectoryEntry = { type: "directory", contents: {} };

export function detectArtifacts(
	tree: DirectoryEntry | undefined,
	entityType: "epic",
	entityJson: { goal?: string } | undefined,
): EpicArtifactFlags;
export function detectArtifacts(
	tree: DirectoryEntry | undefined,
	entityType: "slice" | "quest",
	entityJson: { goal?: string } | undefined,
): SliceArtifactFlags;
export function detectArtifacts(
	tree: DirectoryEntry | undefined,
	entityType: "epic" | "slice" | "quest",
	entityJson: { goal?: string } | undefined,
): EpicArtifactFlags | SliceArtifactFlags {
	const contents = (tree ?? EMPTY_DIR).contents;

	// Goal is stored as a field in the entity JSON, not as a file
	const hasGoal =
		entityJson !== undefined && typeof entityJson.goal === "string" && entityJson.goal.length > 0;

	// Explore markers
	const hasExploreComplete =
		contents["explore-complete.md"] !== undefined || contents["explore-skipped.md"] !== undefined;

	// Abandoned marker
	const hasAbandoned = contents["abandoned.md"] !== undefined;

	if (entityType === "epic") {
		// Architecture defined: architecture/_overview.md exists
		const archDir = contents.architecture;
		const hasArchitectureDefined =
			archDir !== undefined &&
			archDir.type === "directory" &&
			archDir.contents["_overview.md"] !== undefined;

		// Slices defined: slices/sequencing.md exists
		const slicesDir = contents.slices;
		const hasSlicesDefined =
			slicesDir !== undefined &&
			slicesDir.type === "directory" &&
			slicesDir.contents["sequencing.md"] !== undefined;

		return {
			abandoned: hasAbandoned,
			architectureDefined: hasArchitectureDefined,
			exploreComplete: hasExploreComplete,
			goal: hasGoal,
			implementation: false as const,
			plan: false as const,
			planRefined: false as const,
			slicesDefined: hasSlicesDefined,
		};
	}

	// Slice or Quest
	const hasPlan = contents["plan.md"] !== undefined;

	// plan-refined can be a file OR a directory
	const planRefinedEntry = contents["plan-refined.md"];
	const planRefinedDir = contents["plan-refined"];
	const hasPlanRefined =
		planRefinedEntry !== undefined ||
		(planRefinedDir !== undefined && planRefinedDir.type === "directory");

	// Implementation directory with content
	const implDir = contents.implementation;
	const hasImplementation =
		implDir !== undefined &&
		implDir.type === "directory" &&
		Object.keys(implDir.contents).length > 0;

	return {
		abandoned: hasAbandoned,
		exploreComplete: hasExploreComplete,
		goal: hasGoal,
		implementation: hasImplementation,
		plan: hasPlan,
		planRefined: hasPlanRefined,
	};
}
