/**
 * Integration test helpers for spawning the compiled goodplan binary.
 *
 * Usage:
 *   npx vitest run tests/integration/    — run integration tests only
 *   npx vitest run tests/fitness/        — run fitness function tests only
 *   npx vitest run                       — run all tests (unit + integration + fitness)
 *   bun test                             — alias for npx vitest run (via package.json)
 *
 * Fitness functions verify architectural invariants (INV-001 through INV-007).
 * Integration tests spawn the compiled binary against fixture `.goodplan/` directories.
 * Both rely on globalSetup (tests/global-setup.ts) to build the plugin once.
 */

import type { SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** Well-known path for the plugin binary (built by globalSetup via build:plugin). */
function pluginBinaryPath(): string {
	const arch = process.arch === "x64" ? "x64" : "arm64";
	const platform = process.platform === "linux" ? "linux" : "macos";
	return path.resolve(
		import.meta.dirname,
		`../../dist/gp-plugin/binaries/${platform}-${arch}/gp`,
	);
}
const BINARY_PATH = pluginBinaryPath();

export interface CommandResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	json?: unknown;
}

export interface CommandOptions {
	cwd?: string;
	stdin?: string;
	env?: Record<string, string>;
}

/**
 * Spawn the compiled binary with the given arguments.
 * Parses stdout as JSON when `--json` flag is present in args.
 */
export function runCommand(
	binPath: string,
	args: string[],
	options?: CommandOptions,
): CommandResult {
	const result: SpawnSyncReturns<Buffer> = spawnSync(binPath, args, {
		cwd: options?.cwd,
		input: options?.stdin,
		env: { ...process.env, ...options?.env },
		timeout: 15_000,
	});

	const stdout = result.stdout?.toString("utf-8") ?? "";
	const stderr = result.stderr?.toString("utf-8") ?? "";
	const exitCode = result.status ?? 1;

	const commandResult: CommandResult = { stdout, stderr, exitCode };

	if (args.includes("--json")) {
		try {
			commandResult.json = JSON.parse(stdout) as unknown;
		} catch {
			// stdout wasn't valid JSON — leave json undefined
		}
	}

	return commandResult;
}

export interface ChainOptions extends CommandOptions {
	continueOnError?: boolean;
}

/**
 * Run a sequence of commands, returning an array of results.
 * Stops on first non-zero exit unless `continueOnError` is set.
 */
export function runChain(
	binPath: string,
	commands: Array<{ args: string[]; stdin?: string }>,
	options?: ChainOptions,
): CommandResult[] {
	const results: CommandResult[] = [];

	for (const cmd of commands) {
		const result = runCommand(binPath, cmd.args, {
			...options,
			stdin: cmd.stdin ?? options?.stdin,
		});
		results.push(result);

		if (result.exitCode !== 0 && options?.continueOnError !== true) {
			break;
		}
	}

	return results;
}

export interface FixtureContext {
	tmpDir: string;
	env: Record<string, string>;
	bin: string;
}

/**
 * Copy a fixture to a temp directory, set GOODPLAN_DIR, run the callback, clean up.
 * Uses GOODPLAN_DIR env var to isolate from the repo's own `.goodplan/`.
 * Returns a FixtureContext with tmpDir, env, and the binary path.
 */
export async function withFixture<T>(
	fixtureName: string,
	fn: (ctx: FixtureContext) => T | Promise<T>,
): Promise<T> {
	const fixtureDir = path.resolve(import.meta.dirname, "../fixtures", fixtureName);

	if (!fs.existsSync(fixtureDir)) {
		throw new Error(`Fixture "${fixtureName}" not found at ${fixtureDir}`);
	}

	const tmpDir = fs.mkdtempSync(
		path.join(os.tmpdir(), `gp-integration-${fixtureName}-`),
	);

	try {
		// Deep copy fixture to temp dir
		fs.cpSync(fixtureDir, tmpDir, { recursive: true });

		const env: Record<string, string> = {
			GOODPLAN_DIR: path.join(tmpDir, ".goodplan"),
		};

		const bin = buildBinary();

		return await fn({ tmpDir, env, bin });
	} finally {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
}

/**
 * Create a temp directory, run the callback, clean up.
 * Lighter than withFixture — for tests that create their own project (e.g., init).
 */
export async function withTempDir<T>(
	fn: (tmpDir: string, env: Record<string, string>) => T | Promise<T>,
): Promise<T> {
	const tmpDir = fs.mkdtempSync(
		path.join(os.tmpdir(), "gp-integration-temp-"),
	);

	try {
		const env: Record<string, string> = {
			GOODPLAN_DIR: path.join(tmpDir, ".goodplan"),
		};
		return await fn(tmpDir, env);
	} finally {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
}

/**
 * Assert the plugin binary exists and return its path.
 * Does not build — the plugin build is handled by globalSetup.
 */
export function buildBinary(): string {
	if (!fs.existsSync(BINARY_PATH)) {
		throw new Error(
			`Plugin binary not found at ${BINARY_PATH}. Ensure globalSetup ran successfully (vitest.config.ts → tests/global-setup.ts).`,
		);
	}
	return BINARY_PATH;
}
