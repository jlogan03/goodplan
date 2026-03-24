import type { CommandDef } from "citty";
import { runCommand, showUsage } from "citty";
import { mainCommand } from "./commands/main.js";
import { GoodplanError, isGoodplanError } from "./util/errors.js";
import { deterministicStringify } from "./util/json.js";
import { exitCodeForError, outputError, outputUnexpectedError } from "./util/output.js";
import { VERSION } from "./version.js";

/**
 * Parse global flags from raw argv before dispatch.
 * This allows structured JSON errors for unknown commands (e.g., `badcommand --json`).
 */
function parseGlobalFlags(rawArgs: string[]): { json: boolean } {
	let json = false;
	for (const arg of rawArgs) {
		if (arg === "--json") {
			json = true;
		}
	}
	return { json };
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
 * Custom top-level runner.
 * Uses runCommand (not runMain) to control error handling and exit codes.
 * - Detects unknown commands before dispatch (citty doesn't when subCommands is empty)
 * - Handles --help for the main command via showUsage
 * - Catches errors and maps to correct exit codes
 * - Parses global flags before dispatch so badcommand --json works
 */
async function main(): Promise<void> {
	const rawArgs = process.argv.slice(2);
	const globalFlags = parseGlobalFlags(rawArgs);

	// Find first non-flag argument (potential subcommand)
	const firstNonFlag = rawArgs.find((a) => !a.startsWith("-"));

	// Handle --version (runCommand doesn't auto-handle it).
	// --version is handled pre-dispatch and will not appear in `goodplan schema --json`
	// output — this is a known limitation; the convention doc documents it manually.
	if (rawArgs.includes("--version")) {
		if (rawArgs.includes("--json")) {
			process.stdout.write(`${deterministicStringify({ version: VERSION })}\n`);
		} else {
			process.stdout.write(`goodplan ${VERSION}\n`);
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
