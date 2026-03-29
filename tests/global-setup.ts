/**
 * Vitest globalSetup — compiles the goodplan binary once before all tests.
 * Runs in a separate module context from test files.
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outfile = path.join(projectRoot, "gp");

export function setup(): void {
	console.log("[global-setup] Compiling binary...");
	const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8")) as {
		version: string;
	};
	execFileSync(
		"bun",
		[
			"build",
			"--compile",
			"src/index.ts",
			"--outfile",
			outfile,
			"--define",
			`__GOODPLAN_VERSION__="${pkg.version}"`,
		],
		{
			cwd: projectRoot,
			stdio: "inherit",
			timeout: 60_000,
		},
	);
	console.log(`[global-setup] Binary compiled to ${outfile}`);
}

export function teardown(): void {
	if (fs.existsSync(outfile)) {
		fs.rmSync(outfile, { force: true });
		console.log("[global-setup] Cleaned up compiled binary");
	}
}
