import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeDerivedState } from "../../../src/engine/derived-state/compute.js";
import { replayEvents } from "../../../src/engine/events/replay.js";

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-init-integration-"));
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

/**
 * Helper: dynamically import initCommand fresh each test.
 */
async function runInit(args: {
	name?: string;
	json?: boolean;
	quiet?: boolean;
	verbose?: boolean;
}) {
	const { initCommand } = await import("../../../src/commands/global/init.js");
	const def = await initCommand;
	if (def.run) {
		await def.run({
			args: {
				name: args.name ?? "",
				json: args.json ?? false,
				quiet: args.quiet ?? false,
				verbose: args.verbose ?? false,
			},
			rawArgs: [],
			cmd: def,
		});
	}
}

describe("gp init -> derived state integration", () => {
	it("replay + computeDerivedState returns initialized project", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({ name: "my-project", quiet: true });

		const eventsPath = path.join(tmpDir, ".goodplan", "events.jsonl");
		const { events } = await replayEvents({ eventsPath });

		expect(events).toHaveLength(1);

		const state = computeDerivedState(events);

		expect(state.project.name).toBe("my-project");
		expect(state.project.initialized).toBe(true);

		writeSpy.mockRestore();
	});

	it("second init fails with ALREADY_EXISTS-type error", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({ name: "first-init", quiet: true });

		// Second init should fail
		await expect(runInit({ name: "second-init" })).rejects.toThrow("already initialized");

		// Event log should still have only one event
		const eventsPath = path.join(tmpDir, ".goodplan", "events.jsonl");
		const { events } = await replayEvents({ eventsPath });
		expect(events).toHaveLength(1);
		expect(events[0]?.payload).toEqual({ name: "first-init" });

		writeSpy.mockRestore();
	});

	it("--json output contains event ID that matches the event log", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runInit({ name: "json-integration", json: true });

		const outputStr = chunks.join("");
		const jsonOutput = JSON.parse(outputStr);

		const eventsPath = path.join(tmpDir, ".goodplan", "events.jsonl");
		const { events } = await replayEvents({ eventsPath });

		expect(events).toHaveLength(1);
		expect(jsonOutput.event).toBe(events[0]?.id);
		expect(jsonOutput.ok).toBe(true);
		expect(jsonOutput.entity).toBe("project");
	});
});
