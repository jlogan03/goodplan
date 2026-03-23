/**
 * Vitest globalSetup — compiles the goodplan binary once before all tests.
 * Runs in a separate module context from test files.
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outfile = path.join(projectRoot, "goodplan");

export function setup(): void {
	// Skip binary compilation when no integration test files are included
	const vitestArgs = process.argv.join(" ");
	const isUnitOnly =
		vitestArgs.includes("tests/unit") ||
		vitestArgs.includes("tests/fitness") ||
		(vitestArgs.includes("tests/") &&
			!vitestArgs.includes("tests/integration") &&
			!vitestArgs.includes("tests/global"));

	if (isUnitOnly) {
		console.log("[global-setup] Skipping binary compilation (no integration tests selected)");
		return;
	}

	console.log("[global-setup] Compiling binary...");
	execFileSync("bun", ["build", "--compile", "src/index.ts", "--outfile", outfile], {
		cwd: projectRoot,
		stdio: "inherit",
		timeout: 60_000,
	});
	console.log(`[global-setup] Binary compiled to ${outfile}`);
}

export function teardown(): void {
	if (fs.existsSync(outfile)) {
		fs.rmSync(outfile, { force: true });
		console.log("[global-setup] Cleaned up compiled binary");
	}
}
