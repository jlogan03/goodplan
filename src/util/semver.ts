/**
 * Lightweight semver parsing and compatibility checking.
 * No full semver library needed — version strings are always `X.Y.Z`.
 */

import { z } from "zod";
import { GoodplanError } from "./errors.js";

const semverRegex = /^\d+\.\d+\.\d+$/;
const semverStringSchema = z.string().regex(semverRegex);

export interface SemverParts {
	major: number;
	minor: number;
	patch: number;
}

/**
 * Parse a `X.Y.Z` version string into numeric components.
 * Validates with Zod `.safeParse()` and throws `GoodplanError('VALIDATION_INVALID_INPUT')`
 * on failure — consistent with the `assembleState` validation pattern. Version strings
 * come from `project.json`, an external data boundary.
 */
export function parseSemver(version: string): SemverParts {
	const result = semverStringSchema.safeParse(version);
	if (!result.success) {
		throw new GoodplanError(
			"VALIDATION_INVALID_INPUT",
			`Invalid semver string: "${version}". Expected format: X.Y.Z`,
		);
	}

	// Safe: regex guarantees exactly three dot-separated numeric groups
	const [major, minor, patch] = version.split(".") as [string, string, string];
	return {
		major: Number(major),
		minor: Number(minor),
		patch: Number(patch),
	};
}

/**
 * Compatibility check result.
 * - `compatible`: same major, CLI minor >= data minor (patch differences are always ignored)
 * - `cli-minor-behind`: same major, data minor > CLI minor (warn — data may have features CLI doesn't know about)
 * - `major-ahead`: CLI major > data major (warn — project data was created with an older major version)
 * - `major-behind`: CLI major < data major (error — project data requires a newer CLI)
 */
export type CompatibilityResult =
	| "compatible"
	| "cli-minor-behind"
	| "major-ahead"
	| "major-behind";

/**
 * Check compatibility between CLI version and data version.
 * See `cli-changes.md` lines 188-194 for the compatibility table.
 */
export function checkCompatibility(cliVersion: string, dataVersion: string): CompatibilityResult {
	const cli = parseSemver(cliVersion);
	const data = parseSemver(dataVersion);

	if (cli.major > data.major) {
		return "major-ahead";
	}

	if (cli.major < data.major) {
		return "major-behind";
	}

	// Same major
	if (cli.minor < data.minor) {
		return "cli-minor-behind";
	}

	return "compatible";
}

/**
 * Compare two parsed semver tuples numerically.
 * Returns true if `a` is greater than `b`.
 */
export function semverGreaterThan(a: SemverParts, b: SemverParts): boolean {
	if (a.major !== b.major) return a.major > b.major;
	if (a.minor !== b.minor) return a.minor > b.minor;
	return a.patch > b.patch;
}
