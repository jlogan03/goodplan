import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Resolve the plugin directory containing agents/ and rubrics/.
 *
 * Strategy:
 * 1. Compiled binary: process.execPath is `dist/gp-plugin/binaries/<platform>/gp`.
 *    The plugin root is three levels up (the `dist/gp-plugin/` directory).
 * 2. Development (bun): Walk up from the source file's directory to find plugin/.
 *
 * Throws if the resolved directory doesn't contain an `agents/` subdirectory.
 */
export function resolvePluginDir(): string {
	// Try compiled binary path first: binary is at binaries/<platform>/gp
	// Plugin root is 2 levels up from the binary directory
	const fromBinary = resolve(dirname(process.execPath), "..", "..");
	if (existsSync(resolve(fromBinary, "agents"))) {
		return fromBinary;
	}

	// Development fallback: walk up from this source file to find plugin/
	// In dev, import.meta.dirname is src/util/, repo root is two levels up
	const repoRoot = resolve(import.meta.dirname, "..", "..");
	const devPluginDir = resolve(repoRoot, "plugin");
	if (existsSync(resolve(devPluginDir, "agents"))) {
		return devPluginDir;
	}

	throw new Error(
		"Cannot resolve plugin directory. Expected agents/ subdirectory near binary or in repo plugin/ directory.",
	);
}
