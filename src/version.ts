/**
 * Application version — single source of truth (package.json).
 *
 * At build time: injected via `--define __GOODPLAN_VERSION__='"x.y.z"'`
 * in the build script, which reads the version from package.json.
 * The compiled binary embeds the literal string.
 *
 * At dev/test time (vitest, `bun src/index.ts`): falls back to reading
 * package.json from the filesystem.
 */

import * as fs from "node:fs";
import * as path from "node:path";

declare const __GOODPLAN_VERSION__: string | undefined;

function readVersionFallback(): string {
	// Dev/test fallback — this code path is dead in compiled builds
	// because --define replaces __GOODPLAN_VERSION__ with a literal.
	try {
		const pkgPath = path.resolve(import.meta.dir, "..", "package.json");
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { version: string };
		return pkg.version;
	} catch {
		return "0.0.0-dev";
	}
}

export const VERSION: string =
	typeof __GOODPLAN_VERSION__ !== "undefined" ? __GOODPLAN_VERSION__ : readVersionFallback();
