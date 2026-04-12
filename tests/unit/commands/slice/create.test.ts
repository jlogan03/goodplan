import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../../../src/core/rpc/init.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-slice-create-"));
	projectDir = path.join(tmpDir, ".goodplan");
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

function initProject(name = "test") {
	rpcInit(projectDir, name);
}

function captureStdout(): { chunks: string[]; restore: () => void } {
	const chunks: string[] = [];
	const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
		chunks.push(String(chunk));
		return true;
	});
	return { chunks, restore: () => spy.mockRestore() };
}

async function runEpicCreate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { epicCreateCommand } = await import("../../../../src/commands/epic/create.js");
	const def = await epicCreateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSliceCreate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { sliceCreateCommand } = await import("../../../../src/commands/slice/create.js");
	const def = await sliceCreateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

describe("slice:create (v2)", () => {
	it("creates slice and returns MutatingCommandOutput", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });

		const { chunks, restore } = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "s1", goal: "Build feature" });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.ok).toBe(true);
		expect(parsed.event).toBeTruthy();
		expect(parsed.entity).toBe("slice:s1");

		restore();
	});

	it("appends slice-created event with correct payload to epic events.jsonl", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });

		const { restore } = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "s1", goal: "Build feature" });

		// Read events.jsonl and find the slice-created event
		const eventsPath = path.join(projectDir, "epics", "e1", "events.jsonl");
		const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
		const events = lines.map((l) => JSON.parse(l));
		const sliceEvent = events.find((e) => e.type === "slice-created");
		expect(sliceEvent).toBeDefined();
		expect(sliceEvent.domain).toBe("entity-lifecycle");
		expect(sliceEvent.payload.sliceRef).toBe("s1");
		expect(sliceEvent.payload.directory).toBe("s1");
		expect(sliceEvent.payload.goal).toBe("Build feature");

		restore();
	});

	it("creates slice directory", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });

		const { restore } = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "s1" });

		const sliceDir = path.join(projectDir, "epics", "e1", "slices", "s1");
		expect(fs.existsSync(sliceDir)).toBe(true);

		restore();
	});

	it("omits goal from payload when not provided", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });

		const { restore } = captureStdout();
		await runSliceCreate({ epic: "e1", json: true }, { name: "s1" });

		const eventsPath = path.join(projectDir, "epics", "e1", "events.jsonl");
		const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
		const events = lines.map((l) => JSON.parse(l));
		const sliceEvent = events.find((e) => e.type === "slice-created");
		expect(sliceEvent).toBeDefined();
		expect(sliceEvent.payload.goal).toBeUndefined();

		restore();
	});

	it("rejects missing name via process.exit", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });
		const { restore } = captureStdout();

		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(runSliceCreate({ epic: "e1", json: true }, { goal: "No name" })).rejects.toThrow(
			"process.exit called",
		);

		exitSpy.mockRestore();
		restore();
	});

	it("accepts name via --name flag", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });

		const { chunks, restore } = captureStdout();
		await runSliceCreate({ epic: "e1", name: "s1", json: true }, {});

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.entity).toBe("slice:s1");

		restore();
	});
});
