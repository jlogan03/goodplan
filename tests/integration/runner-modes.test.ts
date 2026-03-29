import { beforeAll, describe, expect, it } from "vitest";
import { buildBinary, runCommand, withFixture } from "./helpers.js";

let bin: string;

beforeAll(() => {
	bin = buildBinary();
});

describe("runner: main runner behavior", () => {
	it("unknown command exits 2 with error on stderr", () => {
		const result = runCommand(bin, ["badcommand"]);

		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain("Unknown command");
	});

	it("unknown command with --json exits 2 with JSON error on stdout", () => {
		const result = runCommand(bin, ["badcommand", "--json"]);

		expect(result.exitCode).toBe(2);
		expect(result.json).toBeDefined();
		const json = result.json as { error: { code: string; message: string } };
		expect(json.error).toBeDefined();
		expect(json.error.code).toBe("VALIDATION_UNKNOWN_COMMAND");
		expect(json.error.message).toContain("badcommand");
		// JSON mode: error goes to stdout, stderr should be empty
		expect(result.stderr).toBe("");
	});

	it("--help shows command list and exits 0", () => {
		const result = runCommand(bin, ["--help"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("init");
		expect(result.stdout).toContain("epic:");
		expect(result.stdout).toContain("slice:");
	});

	it("--version shows version string and exits 0", () => {
		const result = runCommand(bin, ["--version"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toMatch(/\bgp\b/);
		expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
	});

	it("epic:create with empty stdin and --json returns JSON validation error", async () => {
		await withFixture("fresh-init", ({ env }) => {
			const result = runCommand(bin, ["epic:create", "--json"], {
				stdin: "{}",
				env,
			});

			// Validation should catch bad input (empty object missing required name and goal fields)
			expect(result.exitCode).toBe(2);
			expect(result.json).toBeDefined();
			const json = result.json as { error: { code: string; message: string } };
			expect(json.error).toBeDefined();
			expect(json.error.code).toMatch(/^VALIDATION_/);
			// Error goes to stdout in JSON mode, stderr should be empty
			expect(result.stderr).toBe("");
		});
	});

	it("NO_COLOR=1 suppresses ANSI escape codes in help", () => {
		const result = runCommand(bin, ["--help"], {
			env: { NO_COLOR: "1" },
		});

		expect(result.exitCode).toBe(0);
		// ANSI escape codes start with ESC (0x1B) followed by [
		// biome-ignore lint/suspicious/noControlCharactersInRegex: testing ANSI escape codes
		expect(result.stdout).not.toMatch(/\x1B\[/);
	});
});
