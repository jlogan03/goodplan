/**
 * Vitest globalSetup — builds the full plugin once before all tests.
 * Runs in a separate module context from test files.
 */

import { execFileSync } from "node:child_process";
import * as path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");

export function setup(): void {
	console.log("[global-setup] Building plugin...");
	execFileSync("bash", ["scripts/build-plugin.sh"], {
		cwd: projectRoot,
		stdio: "inherit",
		timeout: 120_000,
	});
	console.log("[global-setup] Plugin built to dist/gp-plugin/");
}
