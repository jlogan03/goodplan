import type { CommandDef } from "citty";
import { runCommand, showUsage } from "citty";
import pc from "picocolors";
import { mainCommand } from "./commands/main.js";
import { loadState } from "./core/data/load.js";
import { resolveProjectDir } from "./core/data/project.js";
import { getJson } from "./core/tree.js";
import type { Project } from "./schemas/entities/project.js";
import { GoodplanError, isGoodplanError } from "./util/errors.js";
import { deterministicStringify } from "./util/json.js";
import { exitCodeForError, outputError, outputUnexpectedError } from "./util/output.js";
import { checkCompatibility } from "./util/semver.js";
import { VERSION } from "./version.js";

/**
 * Parse global flags from raw argv before dispatch.
 * This allows structured JSON errors for unknown commands (e.g., `badcommand --json`).
 *
 * Note: `--quiet` is parsed here AND by citty via `globalArgs`. This intentional duplication
 * exists because the compat check runs before citty dispatch. Both parsers must stay in sync
 * if `--quiet` is renamed.
 */
function parseGlobalFlags(rawArgs: string[]): { json: boolean; quiet: boolean; force: boolean } {
	let json = false;
	let quiet = false;
	let force = false;
	for (const arg of rawArgs) {
		if (arg === "--json") {
			json = true;
		}
		if (arg === "--quiet") {
			quiet = true;
		}
		if (arg === "--force") {
			force = true;
		}
	}
	// Set globalThis flag so data layer can check without explicit plumbing
	if (force) {
		(globalThis as Record<string, unknown>).__goodplan_force = true;
	}
	return { json, quiet, force };
}

/**
 * Collect known subcommand names from a command definition.
 * Returns a Set of all recognized command keys.
 */
function getKnownSubcommands(cmd: CommandDef): Set<string> {
	const names = new Set<string>();
	const subs = cmd.subCommands;
	if (subs == null || typeof subs !== "object") return names;

	for (const key of Object.keys(subs)) {
		names.add(key);
	}
	return names;
}

/**
 * Determine if an error is a citty CLIError by checking its name and code properties.
 * Note: citty doesn't export CLIError as a named type, so we duck-type check by name.
 * This is fragile but acceptable — citty's error naming is stable across versions.
 */
function isCLIError(error: unknown): error is Error & { code: string } {
	return error instanceof Error && "code" in error && error.name === "CLIError";
}

/**
 * Check CLI version compatibility against project data version.
 * Uses resolveProjectDir() with DATA_NO_PROJECT try-catch for natural skip
 * of init/version/help and any context where no .goodplan/ exists.
 */
function checkVersionCompatibility(globalFlags: { json: boolean; quiet: boolean }): void {
	let projectDir: string;
	try {
		projectDir = resolveProjectDir();
	} catch (error: unknown) {
		// No .goodplan/ found — silently skip compat check.
		// This naturally covers init, --version, --help, schema, etc.
		if (isGoodplanError(error) && error.code === "DATA_NO_PROJECT") {
			return;
		}
		// Re-throw unexpected errors
		throw error;
	}

	const state = loadState(projectDir);
	const project = getJson<Project>(state, "project.json");
	if (project === undefined) {
		// No project.json in tree — skip (e.g., corrupted project)
		return;
	}

	const compat = checkCompatibility(VERSION, project.version);

	switch (compat) {
		case "compatible":
			// No action needed
			break;
		case "cli-minor-behind":
			// Suppress warnings in --json mode (only stdout matters to parsers) and --quiet mode
			if (!globalFlags.json && !globalFlags.quiet) {
				process.stderr.write(
					`${pc.yellow("warning:")} Version mismatch: CLI v${VERSION} / data v${project.version}. Project data uses features from a newer CLI minor version. Consider upgrading.\n`,
				);
			}
			break;
		case "major-ahead":
			if (!globalFlags.json && !globalFlags.quiet) {
				process.stderr.write(
					`${pc.yellow("warning:")} Version mismatch: CLI v${VERSION} / data v${project.version}. Project data was created with an older major version.\n`,
				);
			}
			break;
		case "major-behind":
			throw new GoodplanError(
				"VALIDATION_VERSION_MAJOR_MISMATCH",
				`Project data requires gp >= ${project.version} but this is ${VERSION}. Upgrade the CLI.`,
			);
	}
}

/**
 * Custom top-level runner.
 * Uses runCommand (not runMain) to control error handling and exit codes.
 * - Detects unknown commands before dispatch (citty doesn't when subCommands is empty)
 * - Handles --help for the main command via showUsage
 * - Catches errors and maps to correct exit codes
 * - Parses global flags before dispatch so badcommand --json works
 * - Checks CLI/data version compatibility before dispatch
 */
async function main(): Promise<void> {
	const rawArgs = process.argv.slice(2);
	const globalFlags = parseGlobalFlags(rawArgs);

	// Find first non-flag argument (potential subcommand)
	const firstNonFlag = rawArgs.find((a) => !a.startsWith("-"));

	// Handle --version (runCommand doesn't auto-handle it).
	// --version is handled pre-dispatch and will not appear in `gp schema --json`
	// output — this is a known limitation; the convention doc documents it manually.
	if (rawArgs.includes("--version")) {
		if (rawArgs.includes("--json")) {
			process.stdout.write(`${deterministicStringify({ version: VERSION })}\n`);
		} else {
			process.stdout.write(`gp ${VERSION}\n`);
		}
		return;
	}

	// Handle --help for the main command (no subcommand specified)
	if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
		if (firstNonFlag === undefined) {
			await showUsage(mainCommand as unknown as CommandDef);
			return;
		}
	}

	// Handle no arguments — show usage
	if (rawArgs.length === 0) {
		await showUsage(mainCommand as unknown as CommandDef);
		return;
	}

	// Pre-dispatch unknown command check.
	// citty's runCommand doesn't throw E_UNKNOWN_COMMAND when subCommands is empty {},
	// so we must detect unknown commands ourselves before dispatch.
	if (firstNonFlag !== undefined) {
		const known = getKnownSubcommands(mainCommand as unknown as CommandDef);
		if (!known.has(firstNonFlag)) {
			const gpError = new GoodplanError(
				"VALIDATION_UNKNOWN_COMMAND",
				`Unknown command: ${firstNonFlag}`,
			);
			outputError(gpError, globalFlags);
			process.exitCode = 2;
			return;
		}
	}

	// Version compatibility check — runs after early exits (--version, --help, unknown command)
	// but before command dispatch. Uses resolveProjectDir() with DATA_NO_PROJECT try-catch
	// so init/version/help naturally skip the check without a fragile skip-list.
	try {
		checkVersionCompatibility(globalFlags);
	} catch (error: unknown) {
		if (isGoodplanError(error)) {
			outputError(error, globalFlags);
			process.exitCode = exitCodeForError(error);
			return;
		}
		// Unexpected error during compat check — don't block command execution
		// (compat check is advisory, not critical)
		if (!globalFlags.json && !globalFlags.quiet) {
			process.stderr.write(
				`${pc.dim("debug:")} version compatibility check failed: ${error instanceof Error ? error.message : String(error)}\n`,
			);
		}
	}

	try {
		// Cast needed: citty's CommandDef generic + exactOptionalPropertyTypes
		// creates a contravariance conflict in the setup callback's context type.
		await runCommand(mainCommand as unknown as CommandDef, { rawArgs });
	} catch (error: unknown) {
		// Handle citty CLIError
		if (isCLIError(error)) {
			const code = error.code;

			if (code === "E_UNKNOWN_COMMAND" || code === "EARG") {
				const gpError = new GoodplanError(
					code === "E_UNKNOWN_COMMAND" ? "VALIDATION_UNKNOWN_COMMAND" : "VALIDATION_INVALID_INPUT",
					error.message,
				);
				outputError(gpError, globalFlags);
				process.exitCode = 2;
				return;
			}

			// E_NO_COMMAND — no subcommand provided, show usage
			if (code === "E_NO_COMMAND") {
				await showUsage(mainCommand as unknown as CommandDef);
				return;
			}
		}

		// Handle GoodplanError
		if (isGoodplanError(error)) {
			outputError(error, globalFlags);
			process.exitCode = exitCodeForError(error);
			return;
		}

		// Unexpected error — exit 1
		outputUnexpectedError(error, globalFlags);
		process.exitCode = 1;
	}
}

main();
